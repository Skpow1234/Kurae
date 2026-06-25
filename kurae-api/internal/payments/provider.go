package payments

import "context"

type IntentInput struct {
	OrderID     string
	AmountCents int
	Currency    string
	Email       string
}

type IntentResult struct {
	ID           string
	ClientSecret string
}

type Provider interface {
	CreatePaymentIntent(ctx context.Context, in IntentInput) (IntentResult, error)
	RefundPayment(ctx context.Context, providerPaymentID string) error
	VerifyWebhook(payload []byte, signature string) (eventID string, orderID string, paid bool, err error)
	// PaymentSucceeded checks Stripe for a succeeded PaymentIntent (dev poll sync).
	PaymentSucceeded(ctx context.Context, providerPaymentID string) (bool, error)
}
