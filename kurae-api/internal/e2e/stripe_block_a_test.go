package e2e_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/stripe/stripe-go/v81"
	"github.com/stripe/stripe-go/v81/paymentintent"
	"github.com/stripe/stripe-go/v81/webhook"
)

func TestStripeBlockA(t *testing.T) {
	secretKey := os.Getenv("STRIPE_SECRET_KEY")
	webhookSecret := os.Getenv("STRIPE_WEBHOOK_SECRET")
	if secretKey == "" || webhookSecret == "" {
		t.Skip("STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET required (set in kurae-api/.env)")
	}

	apiURL := envOr("API_URL", "http://localhost:8080")
	stripe.Key = secretKey

	if err := waitForAPI(apiURL); err != nil {
		t.Fatalf("API not reachable at %s (run: docker compose up -d --build api): %v", apiURL, err)
	}

	dropID, err := publicDropID(apiURL, "hana-studio", "sakura-tee")
	if err != nil {
		t.Fatal(err)
	}

	buyerEmail := "stripe-block-a@test.local"
	idem := fmt.Sprintf("block-a-%d", time.Now().UnixNano())

	t.Log("A1: reserve inventory + PaymentIntent")
	checkout, err := postCheckout(apiURL, dropID, buyerEmail, idem)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(checkout.ClientSecret, "_dev_") {
		t.Fatal("got noop PaymentIntent — set STRIPE_SECRET_KEY in .env and run: docker compose up -d --build api")
	}
	if checkout.Status != "payment_pending" {
		t.Fatalf("expected payment_pending, got %s", checkout.Status)
	}
	piID := paymentIntentID(checkout.ClientSecret)

	t.Log("A2: confirm test card")
	_, err = paymentintent.Confirm(piID, &stripe.PaymentIntentConfirmParams{
		PaymentMethod: stripe.String("pm_card_visa"),
		ReturnURL:     stripe.String("http://localhost:3000/checkout/pending"),
	})
	if err != nil {
		t.Fatalf("confirm payment: %v", err)
	}

	t.Log("A3: webhook payment_intent.succeeded")
	if err := postPaymentSucceededWebhook(apiURL, webhookSecret, piID, checkout.OrderID); err != nil {
		t.Fatal(err)
	}

	t.Log("A4: poll buyer status until paid")
	var lastStatus string
	for i := 0; i < 15; i++ {
		lastStatus, err = buyerStatus(apiURL, checkout.OrderID, buyerEmail)
		if err != nil {
			t.Fatal(err)
		}
		if lastStatus == "paid" || lastStatus == "fulfilled" {
			return
		}
		time.Sleep(2 * time.Second)
	}
	t.Fatalf("expected paid, last status: %s", lastStatus)
}

type checkoutResponse struct {
	OrderID      string `json:"orderId"`
	ClientSecret string `json:"clientSecret"`
	Status       string `json:"status"`
}

func postCheckout(apiURL, dropID, email, idem string) (checkoutResponse, error) {
	body, _ := json.Marshal(map[string]string{
		"dropId":         dropID,
		"buyerEmail":     email,
		"sizeLabel":      "M",
		"idempotencyKey": idem,
	})
	res, err := http.Post(apiURL+"/checkout", "application/json", bytes.NewReader(body))
	if err != nil {
		return checkoutResponse{}, err
	}
	defer res.Body.Close()
	raw, _ := io.ReadAll(res.Body)
	if res.StatusCode != http.StatusCreated {
		return checkoutResponse{}, fmt.Errorf("checkout %d: %s", res.StatusCode, raw)
	}
	var out checkoutResponse
	if err := json.Unmarshal(raw, &out); err != nil {
		return checkoutResponse{}, err
	}
	return out, nil
}

func postPaymentSucceededWebhook(apiURL, webhookSecret, piID, orderID string) error {
	pi, err := paymentintent.Get(piID, nil)
	if err != nil {
		return err
	}
	pi.Metadata = map[string]string{"order_id": orderID}

	event := map[string]any{
		"id":          "evt_block_a_e2e",
		"object":      "event",
		"type":        "payment_intent.succeeded",
		"api_version": stripe.APIVersion,
		"data": map[string]any{
			"object": pi,
		},
	}
	payload, err := json.Marshal(event)
	if err != nil {
		return err
	}

	signed := webhook.GenerateTestSignedPayload(&webhook.UnsignedPayload{
		Payload: payload,
		Secret:  webhookSecret,
	})

	req, err := http.NewRequest(http.MethodPost, apiURL+"/webhooks/stripe", bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Stripe-Signature", signed.Header)
	req.Header.Set("Content-Type", "application/json")

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	raw, _ := io.ReadAll(res.Body)
	if res.StatusCode != http.StatusOK {
		return fmt.Errorf("webhook %d: %s", res.StatusCode, raw)
	}
	return nil
}

func buyerStatus(apiURL, orderID, email string) (string, error) {
	url := fmt.Sprintf("%s/checkout/orders/%s/status?email=%s", apiURL, orderID, email)
	res, err := http.Get(url)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()
	raw, _ := io.ReadAll(res.Body)
	if res.StatusCode != http.StatusOK {
		return "", fmt.Errorf("status %d: %s", res.StatusCode, raw)
	}
	var out struct {
		Status string `json:"status"`
	}
	if err := json.Unmarshal(raw, &out); err != nil {
		return "", err
	}
	return out.Status, nil
}

func publicDropID(apiURL, seller, drop string) (string, error) {
	res, err := http.Get(fmt.Sprintf("%s/public/%s/%s", apiURL, seller, drop))
	if err != nil {
		return "", err
	}
	defer res.Body.Close()
	raw, _ := io.ReadAll(res.Body)
	if res.StatusCode != http.StatusOK {
		return "", fmt.Errorf("public drop %d: %s", res.StatusCode, raw)
	}
	var out struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(raw, &out); err != nil {
		return "", err
	}
	return out.ID, nil
}

func paymentIntentID(clientSecret string) string {
	parts := strings.Split(clientSecret, "_secret")
	if len(parts) > 0 {
		return parts[0]
	}
	return clientSecret
}

func waitForAPI(apiURL string) error {
	deadline := time.Now().Add(30 * time.Second)
	for time.Now().Before(deadline) {
		res, err := http.Get(apiURL + "/health")
		if err == nil {
			res.Body.Close()
			if res.StatusCode == http.StatusOK {
				return nil
			}
		}
		time.Sleep(time.Second)
	}
	return fmt.Errorf("timeout waiting for %s/health", apiURL)
}

func envOr(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}
