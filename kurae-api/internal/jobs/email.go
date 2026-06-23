package jobs

import (
	"context"
	"log"
	"os"
)

type EmailSender struct {
	from string
}

func NewEmailSender() *EmailSender {
	from := os.Getenv("EMAIL_FROM")
	if from == "" {
		from = "orders@kurae.dev"
	}
	return &EmailSender{from: from}
}

func (s *EmailSender) SendOrderConfirmation(ctx context.Context, orderID, to, dropTitle string) error {
	_ = ctx
	// MVP: log only. Wire Resend/Postmark when credentials are available.
	log.Printf("email: order confirmation order=%s to=%s drop=%q from=%s", orderID, to, dropTitle, s.from)
	return nil
}
