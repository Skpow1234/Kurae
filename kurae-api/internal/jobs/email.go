package jobs

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/kurae/kurae-api/internal/config"
)

type EmailSender struct {
	from          string
	resendKey     string
	postmarkToken string
	production    bool
	httpClient    *http.Client
}

func NewEmailSender(cfg config.Config) *EmailSender {
	return &EmailSender{
		from:          cfg.EmailFrom,
		resendKey:     cfg.ResendAPIKey,
		postmarkToken: cfg.PostmarkToken,
		production:    cfg.IsProduction(),
		httpClient:    &http.Client{Timeout: 15 * time.Second},
	}
}

func (s *EmailSender) SendWaitlistLive(ctx context.Context, to, dropTitle, dropURL string) error {
	subject := fmt.Sprintf("%s is live now", dropTitle)
	html := fmt.Sprintf(
		"<p><strong>%s</strong> just went live on Kurae.</p><p><a href=\"%s\">Shop the drop</a></p>",
		dropTitle,
		dropURL,
	)
	return s.sendTransactional(ctx, to, subject, html, "waitlist live", dropTitle)
}

func (s *EmailSender) SendWaitlistRestock(ctx context.Context, to, dropTitle, dropURL string) error {
	subject := fmt.Sprintf("%s is back in stock", dropTitle)
	html := fmt.Sprintf(
		"<p><strong>%s</strong> has units available again.</p><p><a href=\"%s\">Grab yours before it sells out</a></p>",
		dropTitle,
		dropURL,
	)
	return s.sendTransactional(ctx, to, subject, html, "waitlist restock", dropTitle)
}

func (s *EmailSender) sendTransactional(ctx context.Context, to, subject, html, kind, ref string) error {
	if s.resendKey != "" {
		return s.sendResend(ctx, to, subject, html)
	}
	if s.postmarkToken != "" {
		return s.sendPostmark(ctx, to, subject, html)
	}
	if s.production {
		return fmt.Errorf("email provider not configured")
	}

	log.Printf("email: %s to=%s ref=%q from=%s", kind, to, ref, s.from)
	return nil
}

func (s *EmailSender) SendOrderConfirmation(ctx context.Context, orderID, to, dropTitle string) error {
	subject := fmt.Sprintf("Order confirmed — %s", dropTitle)
	html := fmt.Sprintf("<p>Thanks for your order on <strong>%s</strong>.</p><p>Order ID: %s</p>", dropTitle, orderID)

	return s.sendTransactional(ctx, to, subject, html, "order confirmation", orderID)
}

func (s *EmailSender) sendResend(ctx context.Context, to, subject, html string) error {
	payload, _ := json.Marshal(map[string]any{
		"from":    s.from,
		"to":      []string{to},
		"subject": subject,
		"html":    html,
	})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.resend.com/emails", bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+s.resendKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return fmt.Errorf("resend: status %d", resp.StatusCode)
	}
	return nil
}

func (s *EmailSender) sendPostmark(ctx context.Context, to, subject, html string) error {
	payload, _ := json.Marshal(map[string]any{
		"From":     s.from,
		"To":       to,
		"Subject":  subject,
		"HtmlBody": html,
	})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.postmarkapp.com/email", bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("X-Postmark-Server-Token", s.postmarkToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return fmt.Errorf("postmark: status %d", resp.StatusCode)
	}
	return nil
}
