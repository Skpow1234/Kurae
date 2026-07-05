package payments

import (
	"context"
	"errors"
	"fmt"
	"strings"
)

type Router struct {
	cfg         Config
	stripe      *StripeProvider
	mercadopago *MercadoPagoProvider
	wompi       *WompiProvider
	payu        *PayUProvider
	noop        *NoopProvider
}

func NewRouter(cfg Config) *Router {
	r := &Router{cfg: cfg, noop: NewNoopProvider()}
	if cfg.StripeConfigured() {
		r.stripe = NewStripeProvider(cfg.StripeSecretKey, cfg.StripeWebhook)
	}
	if cfg.MercadoPagoConfigured() {
		r.mercadopago = NewMercadoPagoProvider(cfg)
	}
	if cfg.WompiConfigured() {
		r.wompi = NewWompiProvider(cfg)
	}
	if cfg.PayUConfigured() {
		r.payu = NewPayUProvider(cfg)
	}
	return r
}

func NewFromConfig(cfg Config) Provider {
	return NewRouter(cfg)
}

func (r *Router) CreatePaymentIntent(ctx context.Context, in IntentInput) (IntentResult, error) {
	name := SelectProviderForCurrency(in.Currency, r.cfg)
	provider, err := r.providerForCreate(name, in.Currency)
	if err != nil {
		return IntentResult{}, err
	}
	result, err := provider.CreatePaymentIntent(ctx, in)
	if err != nil {
		return IntentResult{}, err
	}
	if result.Provider == "" {
		result.Provider = name
	}
	return result, nil
}

func (r *Router) providerForCreate(name, currency string) (Provider, error) {
	switch name {
	case ProviderMercadoPago:
		if r.mercadopago != nil {
			return r.mercadopago, nil
		}
	case ProviderWompi:
		if r.wompi != nil {
			return r.wompi, nil
		}
	case ProviderPayU:
		if r.payu != nil {
			return r.payu, nil
		}
	case ProviderStripe:
		if r.stripe != nil {
			return r.stripe, nil
		}
	}
	if !r.cfg.Production && IsLatamCurrency(currency) {
		return r.noop, nil
	}
	if r.stripe != nil {
		return r.stripe, nil
	}
	if !r.cfg.Production {
		return r.noop, nil
	}
	return nil, fmt.Errorf("no payment provider configured for %s", currency)
}

func (r *Router) ClientSecret(ctx context.Context, providerName, providerPaymentID string) (string, error) {
	p, err := r.providerByName(providerName)
	if err != nil {
		return "", err
	}
	return p.ClientSecret(ctx, providerName, providerPaymentID)
}

func (r *Router) RefundPayment(ctx context.Context, in RefundInput) error {
	p, err := r.providerByName(in.Provider)
	if err != nil {
		return err
	}
	return p.RefundPayment(ctx, in)
}

func (r *Router) VerifyWebhook(providerName string, payload []byte, signature string) (string, string, bool, error) {
	p, err := r.providerByName(providerName)
	if err != nil {
		return "", "", false, err
	}
	return p.VerifyWebhook(providerName, payload, signature)
}

func (r *Router) PaymentSucceeded(ctx context.Context, providerName, providerPaymentID string) (bool, error) {
	p, err := r.providerByName(providerName)
	if err != nil {
		return false, err
	}
	return p.PaymentSucceeded(ctx, providerName, providerPaymentID)
}

func (r *Router) providerByName(name string) (Provider, error) {
	switch strings.ToLower(strings.TrimSpace(name)) {
	case ProviderStripe, "":
		if r.stripe != nil {
			return r.stripe, nil
		}
	case ProviderMercadoPago:
		if r.mercadopago != nil {
			return r.mercadopago, nil
		}
	case ProviderWompi:
		if r.wompi != nil {
			return r.wompi, nil
		}
	case ProviderPayU:
		if r.payu != nil {
			return r.payu, nil
		}
	}
	if !r.cfg.Production {
		return r.noop, nil
	}
	return nil, errors.New("payment provider not configured")
}
