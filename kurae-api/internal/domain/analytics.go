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

type SellerAnalytics struct {
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
}
