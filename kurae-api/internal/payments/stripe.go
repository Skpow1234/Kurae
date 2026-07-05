package payments

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/stripe/stripe-go/v81"
	"github.com/stripe/stripe-go/v81/paymentintent"
	"github.com/stripe/stripe-go/v81/refund"
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
		Provider:     ProviderStripe,
	}, nil
}

func (s *StripeProvider) ClientSecret(ctx context.Context, providerName, providerPaymentID string) (string, error) {
	_ = providerName
	_ = ctx
	if providerPaymentID == "" {
		return "", errors.New("missing payment intent id")
	}
	pi, err := paymentintent.Get(providerPaymentID, nil)
	if err != nil {
		return "", err
	}
	return pi.ClientSecret, nil
}

func (s *StripeProvider) RefundPayment(ctx context.Context, in RefundInput) error {
	_ = ctx
	_, err := refund.New(&stripe.RefundParams{
		PaymentIntent: stripe.String(in.ProviderPaymentID),
	})
	return err
}

func (s *StripeProvider) VerifyWebhook(providerName string, payload []byte, signature string) (string, string, bool, error) {
	_ = providerName
	if s.webhookSecret == "" {
		return "", "", false, errors.New("webhook secret not configured")
	}
	if signature == "" {
		return "", "", false, errors.New("missing stripe signature")
	}
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

func (s *StripeProvider) PaymentSucceeded(ctx context.Context, providerName, providerPaymentID string) (bool, error) {
	_ = providerName
	_ = ctx
	if providerPaymentID == "" {
		return false, nil
	}
	pi, err := paymentintent.Get(providerPaymentID, nil)
	if err != nil {
		return false, err
	}
	return pi.Status == stripe.PaymentIntentStatusSucceeded, nil
}

type NoopProvider struct{}

func NewNoopProvider() *NoopProvider {
	return &NoopProvider{}
}

func (n *NoopProvider) CreatePaymentIntent(ctx context.Context, in IntentInput) (IntentResult, error) {
	_ = ctx
	if IsLatamCurrency(in.Currency) {
		id := "latam_dev_" + uuid.NewString()
		return IntentResult{
			ID:       id,
			Provider: SelectProviderForCurrency(in.Currency, Config{}),
		}, nil
	}
	id := "pi_dev_" + uuid.NewString()
	return IntentResult{
		ID:           id,
		ClientSecret: fmt.Sprintf("%s_secret_dev", id),
		Provider:     ProviderStripe,
	}, nil
}

func (n *NoopProvider) ClientSecret(ctx context.Context, providerName, providerPaymentID string) (string, error) {
	_ = ctx
	_ = providerName
	if providerPaymentID == "" {
		return "", errors.New("missing payment intent id")
	}
	if strings.HasPrefix(providerPaymentID, "pi_dev_") {
		return fmt.Sprintf("%s_secret_dev", providerPaymentID), nil
	}
	if strings.HasPrefix(providerPaymentID, "latam_dev_") {
		return "", nil
	}
	return "", errors.New("unknown payment intent id")
}

func (n *NoopProvider) RefundPayment(ctx context.Context, in RefundInput) error {
	_ = ctx
	_ = in
	return nil
}

func (n *NoopProvider) VerifyWebhook(providerName string, payload []byte, signature string) (string, string, bool, error) {
	_ = providerName
	_ = payload
	_ = signature
	return "", "", false, errors.New("noop provider does not process webhooks")
}

func (n *NoopProvider) PaymentSucceeded(ctx context.Context, providerName, providerPaymentID string) (bool, error) {
	_ = ctx
	_ = providerName
	_ = providerPaymentID
	return false, nil
}
