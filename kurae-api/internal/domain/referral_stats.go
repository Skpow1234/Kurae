package domain

type ReferralStats struct {
	Valid        bool   `json:"valid"`
	Code         string `json:"code,omitempty"`
	ClicksCount  int    `json:"clicksCount"`
	SignupsCount int    `json:"signupsCount"`
	OrdersCount  int    `json:"ordersCount"`
}
