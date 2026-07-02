package domain

type DailyAnalyticsPoint struct {
	Date         string `json:"date"`
	Views        int    `json:"views"`
	Orders       int    `json:"orders"`
	RevenueCents int    `json:"revenueCents"`
}

type AnalyticsFunnel struct {
	Views     int `json:"views"`
	Checkouts int `json:"checkouts"`
	Paid      int `json:"paid"`
}

type DropAnalyticsRow struct {
	DropID           string  `json:"dropId"`
	DropTitle        string  `json:"dropTitle"`
	DropSlug         string  `json:"dropSlug"`
	Views            int     `json:"views"`
	WaitlistSignups  int     `json:"waitlistSignups"`
	Checkouts        int     `json:"checkouts"`
	PaidOrders       int     `json:"paidOrders"`
	RevenueCents     int     `json:"revenueCents"`
	ConversionRate   float64 `json:"conversionRate"`
}

type SellerAnalytics struct {
	RangeDays            int                   `json:"rangeDays"`
	PeriodStart          string                `json:"periodStart"`
	PeriodEnd            string                `json:"periodEnd"`
	DropID               *string               `json:"dropId,omitempty"`
	PageViews7d          int                   `json:"pageViews7d"`
	PageViewsPrev7d      int                   `json:"pageViewsPrev7d"`
	WaitlistSignups7d    int                   `json:"waitlistSignups7d"`
	WaitlistSignupsPrev7d int                  `json:"waitlistSignupsPrev7d"`
	ConversionRate       float64               `json:"conversionRate"`
	ConversionRatePrev   float64               `json:"conversionRatePrev"`
	Revenue7dCents       int                   `json:"revenue7dCents"`
	RevenuePrev7dCents   int                   `json:"revenuePrev7dCents"`
	DailyTraffic         []DailyAnalyticsPoint `json:"dailyTraffic"`
	Funnel               AnalyticsFunnel       `json:"funnel"`
	DropBreakdown        []DropAnalyticsRow    `json:"dropBreakdown,omitempty"`
}
