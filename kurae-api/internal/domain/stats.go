package domain

type DashboardStats struct {
	Revenue7dCents int `json:"revenue7dCents"`
	OrderCount     int `json:"orderCount"`
	PaidCount      int `json:"paidCount"`
	WaitlistTotal  int `json:"waitlistTotal"`
}
