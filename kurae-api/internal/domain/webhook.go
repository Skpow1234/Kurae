package domain

type SellerWebhookEvent struct {
	ID          string  `json:"id"`
	Provider    string  `json:"provider"`
	EventID     string  `json:"eventId"`
	OrderID     *string `json:"orderId,omitempty"`
	DropTitle   string  `json:"dropTitle,omitempty"`
	BuyerEmail  string  `json:"buyerEmail,omitempty"`
	ProcessedAt *string `json:"processedAt,omitempty"`
	CreatedAt   string  `json:"createdAt"`
}
