package domain

type CampaignAttribution struct {
	Source   string `json:"utmSource,omitempty"`
	Medium   string `json:"utmMedium,omitempty"`
	Campaign string `json:"utmCampaign,omitempty"`
	Term     string `json:"utmTerm,omitempty"`
	Content  string `json:"utmContent,omitempty"`
}

func (c CampaignAttribution) HasTracking() bool {
	return c.Source != "" || c.Medium != "" || c.Campaign != "" || c.Term != "" || c.Content != ""
}

type CampaignAnalyticsRow struct {
	Source       string  `json:"source"`
	Medium       string  `json:"medium"`
	Campaign     string  `json:"campaign"`
	Visits       int     `json:"visits"`
	Checkouts    int     `json:"checkouts"`
	PaidOrders   int     `json:"paidOrders"`
	RevenueCents int     `json:"revenueCents"`
	ConversionRate float64 `json:"conversionRate"`
}
