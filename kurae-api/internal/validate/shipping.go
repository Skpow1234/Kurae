package validate

import (
	"errors"
	"strings"
	"unicode/utf8"
)

var ErrInvalidShippingAddress = errors.New("invalid shipping address")
var ErrInvalidTrackingNumber = errors.New("invalid tracking number")

type ShippingAddressInput struct {
	Name       string
	Line1      string
	Line2      string
	City       string
	Region     string
	PostalCode string
	Country    string
}

func NormalizeShippingAddress(in ShippingAddressInput) (ShippingAddressInput, error) {
	out := ShippingAddressInput{
		Name:       Trim(in.Name),
		Line1:      Trim(in.Line1),
		Line2:      Trim(in.Line2),
		City:       Trim(in.City),
		Region:     Trim(in.Region),
		PostalCode: Trim(in.PostalCode),
		Country:    strings.ToUpper(Trim(in.Country)),
	}

	if out.Name == "" || out.Line1 == "" || out.City == "" || out.Region == "" || out.PostalCode == "" || out.Country == "" {
		return ShippingAddressInput{}, ErrInvalidShippingAddress
	}
	if utf8.RuneCountInString(out.Name) > 120 {
		return ShippingAddressInput{}, ErrInvalidShippingAddress
	}
	if utf8.RuneCountInString(out.Line1) > 200 || utf8.RuneCountInString(out.Line2) > 200 {
		return ShippingAddressInput{}, ErrInvalidShippingAddress
	}
	if utf8.RuneCountInString(out.City) > 100 || utf8.RuneCountInString(out.Region) > 100 {
		return ShippingAddressInput{}, ErrInvalidShippingAddress
	}
	if utf8.RuneCountInString(out.PostalCode) > 20 {
		return ShippingAddressInput{}, ErrInvalidShippingAddress
	}
	if len(out.Country) != 2 {
		return ShippingAddressInput{}, ErrInvalidShippingAddress
	}

	return out, nil
}

func NormalizeTrackingNumber(raw string) (string, error) {
	tracking := Trim(raw)
	if tracking == "" {
		return "", ErrInvalidTrackingNumber
	}
	if utf8.RuneCountInString(tracking) > 64 {
		return "", ErrInvalidTrackingNumber
	}
	return tracking, nil
}
