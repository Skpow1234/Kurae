package httpapi

import (
	"strings"
	"testing"
)

func TestEmbeddedOpenAPISpec(t *testing.T) {
	spec := string(openAPISpec)
	if !strings.Contains(spec, "openapi: 3.0.3") {
		t.Fatal("expected OpenAPI 3.0.3 document")
	}
	if !strings.Contains(spec, "version: 0.2.0") {
		t.Fatal("expected API version 0.2.0")
	}

	for _, path := range []string{
		"/public/drops:",
		"/public/sellers/{seller}:",
		"/auth/buyer/register:",
		"/buyer/orders:",
		"/checkout/discount/validate:",
		"/discount-codes:",
		"/referral-codes:",
		"/branding:",
		"/dashboard/analytics:",
		"/dashboard/analytics/export:",
		"DropAnalyticsRow:",
		"CampaignAnalyticsRow:",
		"/public/referrals/click:",
		"/public/referrals/stats:",
		"/public/referrals/preview:",
		"ReferralPreview:",
		"/team/members:",
		"TeamMember:",
		"/orders/export:",
		"SellerAnalytics:",
		"DiscountPreview:",
		"sellerLogoUrl:",
	} {
		if !strings.Contains(spec, path) {
			t.Fatalf("openapi.yaml missing %q", path)
		}
	}
}
