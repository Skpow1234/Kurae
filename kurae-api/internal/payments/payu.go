package payments

import (
	"context"
	"crypto/md5"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
)

type PayUProvider struct {
	apiLogin     string
	apiKey       string
	merchantID   string
	accountID    string
	publicWebURL string
	apiPublicURL string
}

func NewPayUProvider(cfg Config) *PayUProvider {
	return &PayUProvider{
		apiLogin:     cfg.PayUApiLogin,
		apiKey:       cfg.PayUApiKey,
		merchantID:   cfg.PayUMerchantID,
		accountID:    cfg.PayUAccountID,
		publicWebURL: strings.TrimRight(cfg.PublicWebURL, "/"),
		apiPublicURL: strings.TrimRight(cfg.APIPublicURL, "/"),
	}
}

func (p *PayUProvider) CreatePaymentIntent(ctx context.Context, in IntentInput) (IntentResult, error) {
	reference := in.OrderID
	value := fmt.Sprintf("%.2f", majorAmount(in.AmountCents, in.Currency))
	signature := p.sign(reference, value, normalizeCurrency(in.Currency))

	pendingURL := fmt.Sprintf("%s/checkout/pending?order=%s", p.publicWebURL, in.OrderID)
	body := map[string]any{
		"language": "es",
		"command":  "SUBMIT_TRANSACTION",
		"merchant": map[string]string{
			"apiKey":     p.apiKey,
			"apiLogin":   p.apiLogin,
		},
		"transaction": map[string]any{
			"order": map[string]any{
				"accountId":   p.accountID,
				"referenceCode": reference,
				"description":   "Kurae order",
				"language":      "es",
				"signature":     signature,
				"notifyUrl":     fmt.Sprintf("%s/webhooks/payu", p.apiPublicURL),
				"additionalValues": map[string]any{
					"TX_VALUE": map[string]string{
						"value":    value,
						"currency": normalizeCurrency(in.Currency),
					},
				},
				"buyer": map[string]string{
					"emailAddress": in.Email,
				},
			},
			"type":                  "AUTHORIZATION_AND_CAPTURE",
			"paymentMethod":         "PSE",
			"paymentCountry":        "CO",
			"ipAddress":             "127.0.0.1",
			"extraParameters": map[string]string{
				"RESPONSE_URL": pendingURL,
			},
		},
		"test": false,
	}

	var resp struct {
		Code             string `json:"code"`
		TransactionResponse struct {
			OrderID    int    `json:"orderId"`
			TransactionID string `json:"transactionId"`
			State      string `json:"state"`
			PaymentNetworkResponseErrorMessage string `json:"paymentNetworkResponseErrorMessage"`
			ExtraParameters map[string]string `json:"extraParameters"`
		} `json:"transactionResponse"`
	}
	if err := postJSON(ctx, "https://api.payulatam.com/payments-api/4.0/service.cgi", nil, body, &resp); err != nil {
		return IntentResult{}, err
	}
	if resp.Code != "SUCCESS" {
		return IntentResult{}, fmt.Errorf("payu: %s", resp.TransactionResponse.PaymentNetworkResponseErrorMessage)
	}

	checkoutURL := resp.TransactionResponse.ExtraParameters["URL_PAYMENT_RECEIPT_HTML"]
	if checkoutURL == "" {
		checkoutURL = resp.TransactionResponse.ExtraParameters["BANK_URL"]
	}
	if checkoutURL == "" {
		return IntentResult{}, errors.New("payu: missing redirect url")
	}

	paymentID := resp.TransactionResponse.TransactionID
	if paymentID == "" {
		paymentID = fmt.Sprintf("%d", resp.TransactionResponse.OrderID)
	}

	return IntentResult{
		ID:          paymentID,
		CheckoutURL: checkoutURL,
		Provider:    ProviderPayU,
	}, nil
}

func (p *PayUProvider) sign(reference, value, currency string) string {
	raw := fmt.Sprintf("%s~%s~%s~%s~%s~%s", p.apiKey, p.merchantID, reference, value, currency, p.apiKey)
	sum := md5.Sum([]byte(raw))
	return fmt.Sprintf("%x", sum)
}

func (p *PayUProvider) ClientSecret(ctx context.Context, providerName, providerPaymentID string) (string, error) {
	_ = ctx
	_ = providerName
	if providerPaymentID == "" {
		return "", errors.New("missing payu transaction id")
	}
	return providerPaymentID, nil
}

func (p *PayUProvider) RefundPayment(ctx context.Context, in RefundInput) error {
	value := fmt.Sprintf("%.2f", majorAmount(in.AmountCents, in.Currency))
	body := map[string]any{
		"language": "es",
		"command":  "SUBMIT_TRANSACTION",
		"merchant": map[string]string{
			"apiKey":   p.apiKey,
			"apiLogin": p.apiLogin,
		},
		"transaction": map[string]any{
			"order": map[string]any{
				"id": in.ProviderPaymentID,
			},
			"type": "REFUND",
			"reason": "Seller refund",
			"parentTransactionId": in.ProviderPaymentID,
			"additionalValues": map[string]any{
				"TX_VALUE": map[string]string{
					"value":    value,
					"currency": normalizeCurrency(in.Currency),
				},
			},
		},
	}
	var resp struct {
		Code string `json:"code"`
	}
	if err := postJSON(ctx, "https://api.payulatam.com/payments-api/4.0/service.cgi", nil, body, &resp); err != nil {
		return err
	}
	if resp.Code != "SUCCESS" {
		return fmt.Errorf("payu refund failed: %s", resp.Code)
	}
	return nil
}

func (p *PayUProvider) VerifyWebhook(providerName string, payload []byte, signature string) (string, string, bool, error) {
	_ = providerName
	_ = signature
	var event struct {
		ReferencePol string `json:"reference_pol"`
		ReferenceSale string `json:"reference_sale"`
		StatePol     string `json:"state_pol"`
		TransactionID string `json:"transaction_id"`
	}
	if err := json.Unmarshal(payload, &event); err != nil {
		return "", "", false, err
	}
	orderID := event.ReferenceSale
	if orderID == "" {
		orderID = event.ReferencePol
	}
	eventID := event.TransactionID
	if eventID == "" {
		eventID = orderID
	}
	if eventID == "" {
		return "", "", false, nil
	}
	paid := event.StatePol == "4"
	return eventID, orderID, paid, nil
}

func (p *PayUProvider) PaymentSucceeded(ctx context.Context, providerName, providerPaymentID string) (bool, error) {
	_ = providerName
	_ = ctx
	_ = providerPaymentID
	return false, nil
}
