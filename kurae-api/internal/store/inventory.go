package store

import "errors"

var ErrInvalidInventory = errors.New("inventory_total cannot be less than sold or reserved units")

func ReconcileInventoryRemaining(oldTotal, oldRemaining, newTotal int) (int, error) {
	sold := oldTotal - oldRemaining
	remaining := newTotal - sold
	if remaining < 0 {
		return 0, ErrInvalidInventory
	}
	return remaining, nil
}
