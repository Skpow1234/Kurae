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
	httpClient    *http.Client
}

func NewEmailSender(cfg config.Config) *EmailSender {
	return &EmailSender{
		from:          cfg.EmailFrom,
		resendKey:     cfg.ResendAPIKey,
		postmarkToken: cfg.PostmarkToken,
		httpClient:    &http.Client{Timeout: 15 * time.Second},
	}
}

func (s *EmailSender) SendOrderConfirmation(ctx context.Context, orderID, to, dropTitle string) error {
	subject := fmt.Sprintf("Order confirmed — %s", dropTitle)
	html := fmt.Sprintf("<p>Thanks for your order on <strong>%s</strong>.</p><p>Order ID: %s</p>", dropTitle, orderID)

	if s.resendKey != "" {
		return s.sendResend(ctx, to, subject, html)
	}
	if s.postmarkToken != "" {
		return s.sendPostmark(ctx, to, subject, html)
	}

	log.Printf("email: order confirmation order=%s to=%s drop=%q from=%s", orderID, to, dropTitle, s.from)
	return nil
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
