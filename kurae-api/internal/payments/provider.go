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
	CheckoutURL  string
	Provider     string
}

type RefundInput struct {
	Provider          string
	ProviderPaymentID string
	OrderID           string
	AmountCents       int
	Currency          string
}

type Provider interface {
	CreatePaymentIntent(ctx context.Context, in IntentInput) (IntentResult, error)
	ClientSecret(ctx context.Context, providerName, providerPaymentID string) (string, error)
	RefundPayment(ctx context.Context, in RefundInput) error
	VerifyWebhook(providerName string, payload []byte, signature string) (eventID string, orderID string, paid bool, err error)
	PaymentSucceeded(ctx context.Context, providerName, providerPaymentID string) (bool, error)
}
