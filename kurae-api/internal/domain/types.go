package domain

import "time"

type DropStatus string

const (
	DropStatusUpcoming DropStatus = "upcoming"
	DropStatusLive     DropStatus = "live"
	DropStatusSoldOut  DropStatus = "sold_out"
	DropStatusExpired  DropStatus = "expired"
)

type PublishStatus string

const (
	PublishDraft     PublishStatus = "draft"
	PublishPublished PublishStatus = "published"
)

type OrderStatus string

const (
	OrderDraft          OrderStatus = "draft"
	OrderReserved       OrderStatus = "reserved"
	OrderPaymentPending OrderStatus = "payment_pending"
	OrderPaid           OrderStatus = "paid"
	OrderFulfilled      OrderStatus = "fulfilled"
	OrderCancelled      OrderStatus = "cancelled"
	OrderRefunded       OrderStatus = "refunded"
)

type ReservationStatus string

const (
	ReservationActive    ReservationStatus = "active"
	ReservationExpired   ReservationStatus = "expired"
	ReservationConverted ReservationStatus = "converted"
)

type DropSize struct {
	ID        string `json:"id"`
	Label     string `json:"label"`
	Available bool   `json:"available"`
}

type PublicDrop struct {
	ID                 string     `json:"id"`
	SellerSlug         string     `json:"sellerSlug"`
	SellerName         string     `json:"sellerName"`
	Slug               string     `json:"slug"`
	Title              string     `json:"title"`
	Description        string     `json:"description"`
	Story              string     `json:"story"`
	PriceCents         int        `json:"priceCents"`
	Currency           string     `json:"currency"`
	HeroImageURL       string     `json:"heroImageUrl"`
	GalleryImageURLs   []string   `json:"galleryImageUrls"`
	InventoryTotal     int        `json:"inventoryTotal"`
	InventoryRemaining int        `json:"inventoryRemaining"`
	WaitlistCount      int        `json:"waitlistCount"`
	StartsAt           string     `json:"startsAt"`
	EndsAt             string     `json:"endsAt"`
	Status             DropStatus `json:"status"`
	PromoMessage       *string    `json:"promoMessage"`
	Sizes              []DropSize `json:"sizes"`
}

type SellerDrop struct {
	PublicDrop
	PublishStatus PublishStatus `json:"publishStatus"`
}

type SellerSession struct {
	Role       string `json:"role"`
	Email      string `json:"email"`
	SellerSlug string `json:"sellerSlug"`
	SellerName string `json:"sellerName"`
}

type BuyerSession struct {
	Role  string `json:"role"`
	Email string `json:"email"`
	Name  string `json:"name"`
}

type OrderEvent struct {
	ID     string `json:"id"`
	Label  string `json:"label"`
	At     string `json:"at"`
	Detail string `json:"detail,omitempty"`
}

type SellerOrder struct {
	ID                   string       `json:"id"`
	SellerSlug           string       `json:"sellerSlug"`
	DropID               string       `json:"dropId"`
	DropTitle            string       `json:"dropTitle"`
	DropSlug             string       `json:"dropSlug"`
	BuyerEmail           string       `json:"buyerEmail"`
	SizeLabel            string       `json:"sizeLabel"`
	Status               OrderStatus  `json:"status"`
	SubtotalCents        int          `json:"subtotalCents"`
	DiscountCents        int          `json:"discountCents"`
	DiscountCode         *string      `json:"discountCode,omitempty"`
	AmountCents          int          `json:"amountCents"`
	Currency             string       `json:"currency"`
	CreatedAt            string       `json:"createdAt"`
	UpdatedAt            string       `json:"updatedAt"`
	Events               []OrderEvent `json:"events"`
}

type Seller struct {
	ID           string
	Email        string
	PasswordHash string
	Name         string
	Slug         string
	CreatedAt    time.Time
}

type Buyer struct {
	ID           string
	Email        string
	PasswordHash string
	Name         string
	CreatedAt    time.Time
}

type DropRecord struct {
	ID                 string
	SellerID           string
	SellerSlug         string
	SellerName         string
	Slug               string
	Title              string
	Description        string
	Story              string
	PromoMessage       *string
	PriceCents         int
	Currency           string
	HeroImageURL       string
	GalleryImageURLs   []string
	InventoryTotal     int
	InventoryRemaining int
	WaitlistCount      int
	Sizes              []DropSize
	StartsAt           time.Time
	EndsAt             time.Time
	PublishStatus      PublishStatus
	CreatedAt          time.Time
	UpdatedAt          time.Time
}

func ResolveDropStatus(startsAt, endsAt time.Time, inventoryRemaining int, now time.Time) DropStatus {
	if now.After(endsAt) {
		return DropStatusExpired
	}
	if inventoryRemaining <= 0 && !now.Before(startsAt) {
		return DropStatusSoldOut
	}
	if now.Before(startsAt) {
		return DropStatusUpcoming
	}
	return DropStatusLive
}

func (d DropRecord) ToPublicDrop(now time.Time) PublicDrop {
	return PublicDrop{
		ID:                 d.ID,
		SellerSlug:         d.SellerSlug,
		SellerName:         d.SellerName,
		Slug:               d.Slug,
		Title:              d.Title,
		Description:        d.Description,
		Story:              d.Story,
		PriceCents:         d.PriceCents,
		Currency:           d.Currency,
		HeroImageURL:       d.HeroImageURL,
		GalleryImageURLs:   d.GalleryImageURLs,
		InventoryTotal:     d.InventoryTotal,
		InventoryRemaining: d.InventoryRemaining,
		WaitlistCount:      d.WaitlistCount,
		StartsAt:           d.StartsAt.UTC().Format(time.RFC3339),
		EndsAt:             d.EndsAt.UTC().Format(time.RFC3339),
		Status:             ResolveDropStatus(d.StartsAt, d.EndsAt, d.InventoryRemaining, now),
		PromoMessage:       d.PromoMessage,
		Sizes:              d.Sizes,
	}
}

func (d DropRecord) ToSellerDrop(now time.Time) SellerDrop {
	return SellerDrop{
		PublicDrop:    d.ToPublicDrop(now),
		PublishStatus: d.PublishStatus,
	}
}
