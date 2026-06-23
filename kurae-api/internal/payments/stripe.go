package payments

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/stripe/stripe-go/v81"
	"github.com/stripe/stripe-go/v81/paymentintent"
	"github.com/stripe/stripe-go/v81/webhook"
)

type StripeProvider struct {
	webhookSecret string
}

func NewStripeProvider(secretKey, webhookSecret string) *StripeProvider {
	stripe.Key = secretKey
	return &StripeProvider{webhookSecret: webhookSecret}
}

func (s *StripeProvider) CreatePaymentIntent(ctx context.Context, in IntentInput) (IntentResult, error) {
	_ = ctx
	params := &stripe.PaymentIntentParams{
		Amount:   stripe.Int64(int64(in.AmountCents)),
		Currency: stripe.String(in.Currency),
		AutomaticPaymentMethods: &stripe.PaymentIntentAutomaticPaymentMethodsParams{
			Enabled: stripe.Bool(true),
		},
		Metadata: map[string]string{
			"order_id": in.OrderID,
		},
	}
	if in.Email != "" {
		params.ReceiptEmail = stripe.String(in.Email)
	}

	pi, err := paymentintent.New(params)
	if err != nil {
		return IntentResult{}, err
	}
	return IntentResult{
		ID:           pi.ID,
		ClientSecret: pi.ClientSecret,
	}, nil
}

func (s *StripeProvider) VerifyWebhook(payload []byte, signature string) (string, string, bool, error) {
	event, err := webhook.ConstructEvent(payload, signature, s.webhookSecret)
	if err != nil {
		return "", "", false, err
	}

	if event.Type != "payment_intent.succeeded" {
		return event.ID, "", false, nil
	}

	var pi stripe.PaymentIntent
	if err := json.Unmarshal(event.Data.Raw, &pi); err != nil {
		return event.ID, "", false, err
	}
	orderID := pi.Metadata["order_id"]
	if orderID == "" {
		return event.ID, "", false, errors.New("missing order_id metadata")
	}
	return event.ID, orderID, true, nil
}

type NoopProvider struct{}

func NewNoopProvider() *NoopProvider {
	return &NoopProvider{}
}

func (n *NoopProvider) CreatePaymentIntent(ctx context.Context, in IntentInput) (IntentResult, error) {
	_ = ctx
	id := "pi_dev_" + uuid.NewString()
	return IntentResult{
		ID:           id,
		ClientSecret: fmt.Sprintf("%s_secret_dev", id),
	}, nil
}

func (n *NoopProvider) VerifyWebhook(payload []byte, signature string) (string, string, bool, error) {
	_ = payload
	_ = signature
	return "", "", false, errors.New("noop provider does not process webhooks")
}

func NewFromConfig(secretKey, webhookSecret string) Provider {
	if secretKey == "" {
		return NewNoopProvider()
	}
	return NewStripeProvider(secretKey, webhookSecret)
}
