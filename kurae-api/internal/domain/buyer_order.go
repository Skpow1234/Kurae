package domain

type BuyerOrderStatus struct {
	OrderID     string      `json:"orderId"`
	Status      OrderStatus `json:"status"`
	SellerSlug  string      `json:"sellerSlug"`
	DropSlug    string      `json:"dropSlug"`
	DropTitle   string      `json:"dropTitle"`
	SizeLabel   string      `json:"sizeLabel"`
	AmountCents int         `json:"amountCents"`
	Currency    string      `json:"currency"`
	BuyerEmail  string      `json:"buyerEmail"`
	UpdatedAt   string      `json:"updatedAt"`
	Events      []OrderEvent `json:"events"`
}
