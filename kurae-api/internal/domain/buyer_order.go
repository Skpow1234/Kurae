package domain

type BuyerOrderStatus struct {
	OrderID       string       `json:"orderId"`
	Status        OrderStatus  `json:"status"`
	SellerSlug    string       `json:"sellerSlug"`
	DropSlug      string       `json:"dropSlug"`
	DropTitle     string       `json:"dropTitle"`
	ProductID     string       `json:"productId,omitempty"`
	ProductName   string       `json:"productName,omitempty"`
	SizeLabel     string       `json:"sizeLabel"`
	SubtotalCents int          `json:"subtotalCents"`
	DiscountCents int          `json:"discountCents"`
	DiscountCode  *string      `json:"discountCode,omitempty"`
	ReferralCode  *string      `json:"referralCode,omitempty"`
	AmountCents   int          `json:"amountCents"`
	Currency      string       `json:"currency"`
	BuyerEmail      string           `json:"buyerEmail"`
	ShippingAddress *ShippingAddress `json:"shippingAddress,omitempty"`
	TrackingNumber  string           `json:"trackingNumber,omitempty"`
	ShippedAt       string           `json:"shippedAt,omitempty"`
	UpdatedAt       string           `json:"updatedAt"`
	Events        []OrderEvent `json:"events"`
}

type BuyerOrderListItem struct {
	OrderID     string      `json:"orderId"`
	Status      OrderStatus `json:"status"`
	SellerSlug  string      `json:"sellerSlug"`
	DropSlug    string      `json:"dropSlug"`
	DropTitle   string      `json:"dropTitle"`
	ProductName string      `json:"productName,omitempty"`
	SizeLabel   string      `json:"sizeLabel"`
	AmountCents int         `json:"amountCents"`
	Currency    string      `json:"currency"`
	CreatedAt   string      `json:"createdAt"`
	UpdatedAt   string      `json:"updatedAt"`
}
