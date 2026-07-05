package payments

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
)

type WompiProvider struct {
	privateKey    string
	eventsSecret  string
	publicWebURL  string
}

func NewWompiProvider(cfg Config) *WompiProvider {
	return &WompiProvider{
		privateKey:   cfg.WompiPrivateKey,
		eventsSecret: cfg.WompiEventsSecret,
		publicWebURL: strings.TrimRight(cfg.PublicWebURL, "/"),
	}
}

func (w *WompiProvider) CreatePaymentIntent(ctx context.Context, in IntentInput) (IntentResult, error) {
	pendingURL := fmt.Sprintf("%s/checkout/pending?order=%s", w.publicWebURL, in.OrderID)
	body := map[string]any{
		"name":            fmt.Sprintf("Kurae order %s", in.OrderID),
		"description":     "Limited drop checkout",
		"single_use":      true,
		"collect_shipping": false,
		"currency":        normalizeCurrency(in.Currency),
		"amount_in_cents": in.AmountCents,
		"reference":       in.OrderID,
		"redirect_url":    pendingURL,
	}

	var resp struct {
		Data struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	headers := map[string]string{
		"Authorization": "Bearer " + w.privateKey,
	}
	if err := postJSON(ctx, "https://production.wompi.co/v1/payment_links", headers, body, &resp); err != nil {
		return IntentResult{}, err
	}
	if resp.Data.ID == "" {
		return IntentResult{}, errors.New("wompi: empty payment link id")
	}
	checkoutURL := fmt.Sprintf("https://checkout.wompi.co/l/%s", resp.Data.ID)
	return IntentResult{
		ID:          resp.Data.ID,
		CheckoutURL: checkoutURL,
		Provider:    ProviderWompi,
	}, nil
}

func (w *WompiProvider) ClientSecret(ctx context.Context, providerName, providerPaymentID string) (string, error) {
	_ = ctx
	_ = providerName
	if providerPaymentID == "" {
		return "", errors.New("missing wompi payment link id")
	}
	return fmt.Sprintf("https://checkout.wompi.co/l/%s", providerPaymentID), nil
}

func (w *WompiProvider) RefundPayment(ctx context.Context, in RefundInput) error {
	_ = ctx
	_ = in
	return errors.New("wompi refunds are not supported via API in this integration")
}

func (w *WompiProvider) VerifyWebhook(providerName string, payload []byte, signature string) (string, string, bool, error) {
	_ = providerName
	if w.eventsSecret != "" {
		if err := w.verifyEventChecksum(payload, signature); err != nil {
			return "", "", false, err
		}
	}

	var event struct {
		Event string `json:"event"`
		Data  struct {
			Transaction struct {
				ID        string `json:"id"`
				Reference string `json:"reference"`
				Status    string `json:"status"`
			} `json:"transaction"`
		} `json:"data"`
		ID string `json:"id"`
	}
	if err := json.Unmarshal(payload, &event); err != nil {
		return "", "", false, err
	}

	eventID := event.ID
	if eventID == "" {
		eventID = event.Data.Transaction.ID
	}
	if eventID == "" {
		return "", "", false, nil
	}

	tx := event.Data.Transaction
	if tx.Reference == "" {
		return eventID, "", false, nil
	}
	paid := strings.EqualFold(tx.Status, "APPROVED")
	return eventID, tx.Reference, paid, nil
}

func (w *WompiProvider) verifyEventChecksum(payload []byte, signature string) error {
	if signature == "" {
		return errors.New("missing wompi event checksum")
	}
	sum := sha256.Sum256(append(payload, []byte(w.eventsSecret)...))
	expected := hex.EncodeToString(sum[:])
	if !strings.EqualFold(signature, expected) {
		return errors.New("invalid wompi event checksum")
	}
	return nil
}

func (w *WompiProvider) PaymentSucceeded(ctx context.Context, providerName, providerPaymentID string) (bool, error) {
	_ = providerName
	if providerPaymentID == "" {
		return false, nil
	}
	var resp struct {
		Data struct {
			Status string `json:"status"`
		} `json:"data"`
	}
	url := fmt.Sprintf("https://production.wompi.co/v1/transactions/%s", providerPaymentID)
	headers := map[string]string{
		"Authorization": "Bearer " + w.privateKey,
	}
	if err := getJSON(ctx, url, headers, &resp); err != nil {
		return false, err
	}
	return strings.EqualFold(resp.Data.Status, "APPROVED"), nil
}
