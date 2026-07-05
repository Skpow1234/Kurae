package httpapi

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/kurae/kurae-api/internal/config"
	"github.com/kurae/kurae-api/internal/payments"
	"github.com/kurae/kurae-api/internal/queue"
	"github.com/kurae/kurae-api/internal/ratelimit"
	"github.com/kurae/kurae-api/internal/service"
	"github.com/kurae/kurae-api/internal/storage"
	"github.com/kurae/kurae-api/internal/store"
)

type Server struct {
	router *chi.Mux
}

func NewServer(cfg config.Config, s *store.Store, q *queue.RedisQueue) *Server {
	authSvc := service.NewAuthService(s, cfg.JWTSecret)
	waitlistNotify := service.NewWaitlistNotifyService(s, q, cfg.PublicWebURL, cfg.WaitlistSoonNotifyBefore)
	dropSvc := service.NewDropService(s, waitlistNotify)

	authLimiter := ratelimit.NewIP(10, time.Minute)
	checkoutLimiter := ratelimit.NewIP(20, time.Minute)
	waitlistLimiter := ratelimit.NewIP(config.DefaultWaitlistRatePerMinute, time.Minute)

	waitlistSvc := service.NewWaitlistService(s)
	dashboardSvc := service.NewDashboardService(s)
	discountSvc := service.NewDiscountService(s)
	referralSvc := service.NewReferralService(s)
	brandingSvc := service.NewBrandingService(s)
	analyticsSvc := service.NewAnalyticsService(s)
	provider := payments.NewFromConfig(cfg.StripeSecretKey, cfg.StripeWebhook, cfg.IsProduction())
	orderSvc := service.NewOrderService(s, provider, q, cfg.ReservationTTL, !cfg.IsProduction(), waitlistNotify)

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

	referralClickLimiter := ratelimit.NewIP(60, time.Minute)

	viewLimiter := ratelimit.NewIP(120, time.Minute)

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

	r.Group(func(protected chi.Router) {
		protected.Use(SellerAuthMiddleware(authSvc))
		protected.Get("/drops", dropH.List)
		protected.Post("/drops", dropH.Create)
		protected.Get("/drops/{id}", dropH.Get)
		protected.Patch("/drops/{id}", dropH.Update)
		protected.Delete("/drops/{id}", dropH.Delete)
		protected.Get("/orders", orderH.List)
		protected.Get("/orders/{id}", orderH.Get)
		protected.Patch("/orders/{id}", orderH.Update)
		protected.Get("/dashboard/stats", dashboardH.Stats)
		protected.Get("/discount-codes", discountH.List)
		protected.Post("/discount-codes", discountH.Create)
		protected.Patch("/discount-codes/{id}", discountH.Update)
		protected.Delete("/discount-codes/{id}", discountH.Delete)
		protected.Get("/referral-codes", referralH.List)
		protected.Post("/referral-codes", referralH.Create)
		protected.Delete("/referral-codes/{id}", referralH.Delete)
		protected.Get("/referral-rewards/settings", referralH.GetRewardSettings)
		protected.Patch("/referral-rewards/settings", referralH.UpdateRewardSettings)
		protected.Get("/branding", brandingH.Get)
		protected.Patch("/branding", brandingH.Update)
		protected.Get("/dashboard/analytics", analyticsH.Get)
		protected.Get("/dashboard/analytics/export", analyticsH.Export)
		protected.Post("/uploads/presign", uploadH.Presign)
		protected.Get("/auth/me", authH.Me)
		protected.Patch("/auth/profile", authH.UpdateProfile)
		protected.Patch("/auth/password", authH.ChangePassword)
	})

	return &Server{router: r}
}

func (s *Server) Handler() http.Handler {
	return s.router
}
