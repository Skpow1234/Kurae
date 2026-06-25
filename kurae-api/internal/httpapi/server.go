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
	dropSvc := service.NewDropService(s)

	authLimiter := ratelimit.NewIP(10, time.Minute)
	checkoutLimiter := ratelimit.NewIP(20, time.Minute)
	waitlistLimiter := ratelimit.NewIP(config.DefaultWaitlistRatePerMinute, time.Minute)

	waitlistSvc := service.NewWaitlistService(s)
	dashboardSvc := service.NewDashboardService(s)
	provider := payments.NewFromConfig(cfg.StripeSecretKey, cfg.StripeWebhook, cfg.IsProduction())
	orderSvc := service.NewOrderService(s, provider, q, cfg.ReservationTTL)

	s3Storage, _ := storage.NewS3Storage(cfg)

	authH := NewAuthHandler(authSvc)
	dropH := NewDropHandler(dropSvc, authSvc)
	publicH := NewPublicHandler(dropSvc, waitlistSvc, authSvc)
	orderH := NewOrderHandler(orderSvc)
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

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	r.With(RateLimit(authLimiter)).Post("/auth/register", authH.Register)
	r.With(RateLimit(authLimiter)).Post("/auth/login", authH.Login)
	r.Post("/auth/logout", authH.Logout)

	r.Get("/public/drops", publicH.ListDrops)
	r.Get("/public/{seller}/{drop}", publicH.GetDrop)
	r.With(RateLimit(waitlistLimiter)).Post("/drops/{id}/waitlist", publicH.JoinWaitlist)
	r.With(RateLimit(checkoutLimiter)).Post("/checkout", orderH.Checkout)
	r.Get("/checkout/orders/{id}/status", orderH.BuyerStatus)
	r.Post("/webhooks/stripe", webhookH.Stripe)

	r.Group(func(protected chi.Router) {
		protected.Use(AuthMiddleware(authSvc))
		protected.Get("/drops", dropH.List)
		protected.Post("/drops", dropH.Create)
		protected.Get("/drops/{id}", dropH.Get)
		protected.Patch("/drops/{id}", dropH.Update)
		protected.Delete("/drops/{id}", dropH.Delete)
		protected.Get("/orders", orderH.List)
		protected.Get("/orders/{id}", orderH.Get)
		protected.Patch("/orders/{id}", orderH.Update)
		protected.Get("/dashboard/stats", dashboardH.Stats)
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
