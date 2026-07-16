package httpapi

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/kurae/kurae-api/internal/config"
	"github.com/kurae/kurae-api/internal/domain"
	"github.com/kurae/kurae-api/internal/payments"
	"github.com/kurae/kurae-api/internal/queue"
	"github.com/kurae/kurae-api/internal/ratelimit"
	"github.com/kurae/kurae-api/internal/service"
	"github.com/kurae/kurae-api/internal/storage"
	"github.com/kurae/kurae-api/internal/store"
	"github.com/redis/go-redis/v9"
)

type Server struct {
	router *chi.Mux
}

func NewServer(cfg config.Config, s *store.Store, q *queue.RedisQueue, rdb *redis.Client) *Server {
	authSvc := service.NewAuthService(s, cfg.JWTSecret)
	waitlistNotify := service.NewWaitlistNotifyService(s, q, cfg.PublicWebURL, cfg.WaitlistSoonNotifyBefore)
	inventoryAlerts := service.NewInventoryAlertService(s, q, cfg.PublicWebURL)
	dropSvc := service.NewDropService(s, waitlistNotify, inventoryAlerts)

	failClosed := cfg.IsProduction()
	newLimiter := func(scope string, limit int) *ratelimit.Limiter {
		if rdb != nil {
			return ratelimit.NewDistributed(rdb, scope, limit, time.Minute, failClosed)
		}
		return ratelimit.NewIP(limit, time.Minute)
	}

	authLimiter := newLimiter("auth", 10)
	checkoutLimiter := newLimiter("checkout", 20)
	waitlistLimiter := newLimiter("waitlist", config.DefaultWaitlistRatePerMinute)

	waitlistSvc := service.NewWaitlistService(s)
	dashboardSvc := service.NewDashboardService(s)
	discountSvc := service.NewDiscountService(s)
	referralSvc := service.NewReferralService(s)
	brandingSvc := service.NewBrandingService(s)
	analyticsSvc := service.NewAnalyticsService(s)
	teamSvc := service.NewTeamService(s)
	provider := payments.NewFromConfig(cfg.PaymentsConfig())
	orderSvc := service.NewOrderService(s, provider, q, cfg.ReservationTTL, !cfg.IsProduction(), waitlistNotify, inventoryAlerts)

	s3Storage, _ := storage.NewS3Storage(cfg)

	authH := NewAuthHandler(authSvc, referralSvc)
	dropH := NewDropHandler(dropSvc, authSvc)
	publicH := NewPublicHandler(dropSvc, waitlistSvc, authSvc, s.Sellers())
	orderH := NewOrderHandler(orderSvc, authSvc)
	discountH := NewDiscountHandler(discountSvc, orderSvc)
	referralH := NewReferralHandler(referralSvc)
	brandingH := NewBrandingHandler(brandingSvc)
	analyticsH := NewAnalyticsHandler(analyticsSvc)
	webhookH := NewWebhookHandler(s, provider, orderSvc)
	dashboardH := NewDashboardHandler(dashboardSvc)
	teamH := NewTeamHandler(teamSvc)
	uploadH := NewUploadHandler(s3Storage)

	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(SecurityHeaders)
	r.Use(LimitRequestBody)

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.CORSOrigins,
		AllowedMethods:   []string{"GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "Idempotency-Key"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	RegisterSwagger(r)

	healthH := NewHealthHandler(s, q, cfg.IsProduction())
	r.Get("/health", healthH.ServeHTTP)

	r.With(RateLimit(authLimiter)).Post("/auth/register", authH.Register)
	r.With(RateLimit(authLimiter)).Post("/auth/login", authH.Login)
	r.With(RateLimit(authLimiter)).Post("/auth/buyer/register", authH.RegisterBuyer)
	r.With(RateLimit(authLimiter)).Post("/auth/buyer/login", authH.LoginBuyer)
	r.Get("/auth/buyer/me", authH.BuyerMe)
	r.Post("/auth/logout", authH.Logout)

	r.Group(func(buyerAuth chi.Router) {
		buyerAuth.Use(BuyerAuthMiddleware(authSvc))
		buyerAuth.Patch("/auth/buyer/profile", authH.BuyerUpdateProfile)
		buyerAuth.Patch("/auth/buyer/password", authH.BuyerChangePassword)
		buyerAuth.Get("/buyer/orders", orderH.BuyerList)
		buyerAuth.Get("/buyer/referrals", referralH.BuyerListProgress)
	})

	referralClickLimiter := newLimiter("referral", 60)

	viewLimiter := newLimiter("view", 120)

	r.Get("/public/drops", publicH.ListDrops)
	r.Get("/public/sellers/{seller}", publicH.GetSeller)
	r.Get("/public/{seller}/{drop}", publicH.GetDrop)
	r.With(RateLimit(waitlistLimiter)).Post("/drops/{id}/waitlist", publicH.JoinWaitlist)
	r.With(RateLimit(referralClickLimiter)).Post("/public/referrals/click", referralH.RecordClick)
	r.With(RateLimit(referralClickLimiter)).Get("/public/referrals/stats", referralH.GetStats)
	r.With(RateLimit(referralClickLimiter)).Get("/public/referrals/preview", referralH.GetPreview)
	r.With(RateLimit(viewLimiter)).Post("/public/analytics/view", analyticsH.RecordView)
	r.With(RateLimit(checkoutLimiter)).Post("/checkout", orderH.Checkout)
	r.With(RateLimit(checkoutLimiter)).Post("/checkout/discount/validate", discountH.ValidateCheckout)
	r.Get("/checkout/orders/{id}/status", orderH.BuyerStatus)
	r.Post("/webhooks/stripe", webhookH.Stripe)
	r.Post("/webhooks/mercadopago", webhookH.MercadoPago)
	r.Post("/webhooks/wompi", webhookH.Wompi)
	r.Post("/webhooks/payu", webhookH.PayU)

	r.Group(func(protected chi.Router) {
		protected.Use(SellerAuthMiddleware(authSvc))
		protected.With(RequirePermission(domain.PermDropsRead)).Get("/drops", dropH.List)
		protected.With(RequirePermission(domain.PermDropsWrite)).Post("/drops", dropH.Create)
		protected.With(RequirePermission(domain.PermDropsWrite)).Post("/drops/{id}/clone", dropH.Clone)
		protected.With(RequirePermission(domain.PermDropsRead)).Get("/drops/{id}", dropH.Get)
		protected.With(RequirePermission(domain.PermDropsWrite)).Patch("/drops/{id}", dropH.Update)
		protected.With(RequirePermission(domain.PermDropsWrite)).Delete("/drops/{id}", dropH.Delete)
		protected.With(RequirePermission(domain.PermOrdersRead)).Get("/orders", orderH.List)
		protected.With(RequirePermission(domain.PermOrdersRead)).Get("/orders/export", orderH.Export)
		protected.With(RequirePermission(domain.PermOrdersRead)).Get("/orders/{id}", orderH.Get)
		protected.With(RequirePermission(domain.PermOrdersFulfill)).Patch("/orders/{id}", orderH.Update)
		protected.With(RequirePermission(domain.PermOrdersRead)).Get("/webhook-events", webhookH.ListForSeller)
		protected.With(RequirePermission(domain.PermAnalyticsRead)).Get("/dashboard/stats", dashboardH.Stats)
		protected.With(RequirePermission(domain.PermDiscountsWrite)).Get("/discount-codes", discountH.List)
		protected.With(RequirePermission(domain.PermDiscountsWrite)).Post("/discount-codes", discountH.Create)
		protected.With(RequirePermission(domain.PermDiscountsWrite)).Patch("/discount-codes/{id}", discountH.Update)
		protected.With(RequirePermission(domain.PermDiscountsWrite)).Delete("/discount-codes/{id}", discountH.Delete)
		protected.With(RequirePermission(domain.PermReferralsWrite)).Get("/referral-codes", referralH.List)
		protected.With(RequirePermission(domain.PermReferralsWrite)).Post("/referral-codes", referralH.Create)
		protected.With(RequirePermission(domain.PermReferralsWrite)).Delete("/referral-codes/{id}", referralH.Delete)
		protected.With(RequirePermission(domain.PermReferralsWrite)).Get("/referral-rewards/settings", referralH.GetRewardSettings)
		protected.With(RequirePermission(domain.PermReferralsWrite)).Patch("/referral-rewards/settings", referralH.UpdateRewardSettings)
		protected.With(RequirePermission(domain.PermBrandingWrite)).Get("/branding", brandingH.Get)
		protected.With(RequirePermission(domain.PermBrandingWrite)).Patch("/branding", brandingH.Update)
		protected.With(RequirePermission(domain.PermAnalyticsRead)).Get("/dashboard/analytics", analyticsH.Get)
		protected.With(RequirePermission(domain.PermAnalyticsRead)).Get("/dashboard/analytics/export", analyticsH.Export)
		protected.With(RequirePermission(domain.PermUploadsWrite)).Post("/uploads/presign", uploadH.Presign)
		protected.Get("/auth/me", authH.Me)
		protected.Patch("/auth/profile", authH.UpdateProfile)
		protected.Patch("/auth/password", authH.ChangePassword)
		protected.With(RequirePermission(domain.PermTeamManage)).Get("/team/members", teamH.List)
		protected.With(RequirePermission(domain.PermTeamManage)).Post("/team/members", teamH.Create)
		protected.With(RequirePermission(domain.PermTeamManage)).Patch("/team/members/{id}", teamH.Update)
		protected.With(RequirePermission(domain.PermTeamManage)).Delete("/team/members/{id}", teamH.Delete)
	})

	return &Server{router: r}
}

func (s *Server) Handler() http.Handler {
	return s.router
}
