package payments

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
)

type MercadoPagoProvider struct {
	token         string
	webhookSecret string
	publicWebURL  string
	apiPublicURL  string
}

func NewMercadoPagoProvider(cfg Config) *MercadoPagoProvider {
	return &MercadoPagoProvider{
		token:         cfg.MercadoPagoToken,
		webhookSecret: cfg.MercadoPagoWebhookSecret,
		publicWebURL:  strings.TrimRight(cfg.PublicWebURL, "/"),
		apiPublicURL:  strings.TrimRight(cfg.APIPublicURL, "/"),
	}
}

func (m *MercadoPagoProvider) authHeaders() map[string]string {
	return map[string]string{
		"Authorization": "Bearer " + m.token,
	}
}

func (m *MercadoPagoProvider) CreatePaymentIntent(ctx context.Context, in IntentInput) (IntentResult, error) {
	pendingURL := fmt.Sprintf("%s/checkout/pending?order=%s", m.publicWebURL, in.OrderID)
	body := map[string]any{
		"items": []map[string]any{
			{
				"title":       "Kurae order",
				"quantity":    1,
				"unit_price":  majorAmount(in.AmountCents, in.Currency),
				"currency_id": normalizeCurrency(in.Currency),
			},
		},
		"payer": map[string]any{
			"email": in.Email,
		},
		"external_reference": in.OrderID,
		"back_urls": map[string]string{
			"success": pendingURL,
			"pending": pendingURL,
			"failure": pendingURL,
		},
		"auto_return": "approved",
		"notification_url": fmt.Sprintf("%s/webhooks/mercadopago", m.apiPublicURL),
	}

	var resp struct {
		ID        string `json:"id"`
		InitPoint string `json:"init_point"`
	}
	if err := postJSON(ctx, "https://api.mercadopago.com/checkout/preferences", m.authHeaders(), body, &resp); err != nil {
		return IntentResult{}, err
	}
	if resp.ID == "" || resp.InitPoint == "" {
		return IntentResult{}, errors.New("mercadopago: empty preference response")
	}
	return IntentResult{
		ID:          resp.ID,
		CheckoutURL: resp.InitPoint,
		Provider:    ProviderMercadoPago,
	}, nil
}

func (m *MercadoPagoProvider) ClientSecret(ctx context.Context, providerName, providerPaymentID string) (string, error) {
	_ = providerName
	url, err := m.preferenceURL(ctx, providerPaymentID)
	if err != nil {
		return "", err
	}
	return url, nil
}

func (m *MercadoPagoProvider) preferenceURL(ctx context.Context, preferenceID string) (string, error) {
	if preferenceID == "" {
		return "", errors.New("missing mercadopago preference id")
	}
	var resp struct {
		InitPoint string `json:"init_point"`
	}
	url := fmt.Sprintf("https://api.mercadopago.com/checkout/preferences/%s", preferenceID)
	if err := getJSON(ctx, url, m.authHeaders(), &resp); err != nil {
		return "", err
	}
	if resp.InitPoint == "" {
		return "", errors.New("mercadopago: preference missing init_point")
	}
	return resp.InitPoint, nil
}

func (m *MercadoPagoProvider) RefundPayment(ctx context.Context, in RefundInput) error {
	paymentID, err := m.resolvePaymentID(ctx, in.ProviderPaymentID, in.OrderID)
	if err != nil {
		return err
	}
	return postJSON(ctx, fmt.Sprintf("https://api.mercadopago.com/v1/payments/%s/refunds", paymentID), m.authHeaders(), map[string]any{}, nil)
}

func (m *MercadoPagoProvider) resolvePaymentID(ctx context.Context, storedID, orderID string) (string, error) {
	if storedID != "" {
		if payment, err := m.fetchPayment(ctx, storedID); err == nil && payment.ID != "" {
			return payment.ID, nil
		}
	}
	if orderID != "" {
		payment, err := m.fetchPaymentByReference(ctx, orderID)
		if err != nil {
			return "", err
		}
		return payment.ID, nil
	}
	return "", errors.New("mercadopago: could not resolve payment id")
}

func (m *MercadoPagoProvider) VerifyWebhook(providerName string, payload []byte, signature string) (string, string, bool, error) {
	_ = providerName
	_ = signature
	if m.webhookSecret != "" && signature == "" {
		return "", "", false, errors.New("missing mercadopago signature")
	}

	var note struct {
		ID   json.Number `json:"id"`
		Type string      `json:"type"`
		Data struct {
			ID string `json:"id"`
		} `json:"data"`
		Action string `json:"action"`
	}
	if err := json.Unmarshal(payload, &note); err != nil {
		return "", "", false, err
	}

	eventID := note.ID.String()
	if eventID == "" {
		eventID = note.Data.ID
	}
	if eventID == "" {
		return "", "", false, nil
	}

	paymentID := note.Data.ID
	if paymentID == "" {
		return eventID, "", false, nil
	}

	payment, err := m.fetchPayment(context.Background(), paymentID)
	if err != nil {
		return eventID, "", false, err
	}
	if payment.Status != "approved" {
		return eventID, payment.ExternalReference, false, nil
	}
	if payment.ExternalReference == "" {
		return eventID, "", false, errors.New("mercadopago: missing external_reference")
	}
	return eventID, payment.ExternalReference, true, nil
}

func (m *MercadoPagoProvider) PaymentSucceeded(ctx context.Context, providerName, providerPaymentID string) (bool, error) {
	_ = providerName
	if payment, err := m.fetchPayment(ctx, providerPaymentID); err == nil {
		return payment.Status == "approved", nil
	}
	payment, err := m.fetchPaymentByReference(ctx, providerPaymentID)
	if err != nil {
		return false, err
	}
	return payment.Status == "approved", nil
}

type mpPayment struct {
	ID                string `json:"id"`
	Status            string `json:"status"`
	ExternalReference string `json:"external_reference"`
}

func (m *MercadoPagoProvider) fetchPayment(ctx context.Context, paymentID string) (mpPayment, error) {
	var payment mpPayment
	url := fmt.Sprintf("https://api.mercadopago.com/v1/payments/%s", paymentID)
	if err := getJSON(ctx, url, m.authHeaders(), &payment); err != nil {
		return mpPayment{}, err
	}
	return payment, nil
}

func (m *MercadoPagoProvider) fetchPaymentByReference(ctx context.Context, reference string) (mpPayment, error) {
	url := fmt.Sprintf("https://api.mercadopago.com/v1/payments/search?external_reference=%s&sort=date_created&criteria=desc", reference)
	var resp struct {
		Results []mpPayment `json:"results"`
	}
	if err := getJSON(ctx, url, m.authHeaders(), &resp); err != nil {
		return mpPayment{}, err
	}
	if len(resp.Results) == 0 {
		return mpPayment{}, errors.New("mercadopago: payment not found")
	}
	return resp.Results[0], nil
}
