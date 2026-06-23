package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/kurae/kurae-api/internal/domain"
)

var ErrSoldOut = errors.New("sold out")
var ErrInvalidTransition = errors.New("invalid status transition")

type OrderRepository struct {
	store *Store
}

func (s *Store) Orders() *OrderRepository {
	return &OrderRepository{store: s}
}

type OrderRecord struct {
	ID             string
	SellerID       string
	SellerSlug     string
	DropID         string
	DropTitle      string
	DropSlug       string
	BuyerEmail     string
	SizeLabel      string
	Status         domain.OrderStatus
	AmountCents    int
	Currency       string
	IdempotencyKey *string
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

type ReservationRecord struct {
	ID        string
	DropID    string
	OrderID   string
	Quantity  int
	Status    domain.ReservationStatus
	ExpiresAt time.Time
	CreatedAt time.Time
}

type CheckoutInput struct {
	SellerID       string
	DropID         string
	BuyerEmail     string
	SizeLabel      string
	AmountCents    int
	Currency       string
	IdempotencyKey string
	ExpiresAt      time.Time
}

type CheckoutResult struct {
	Order       OrderRecord
	Reservation ReservationRecord
}

func (r *OrderRepository) GetByIdempotencyKey(ctx context.Context, key string) (OrderRecord, error) {
	row := r.store.pool.QueryRow(ctx, orderSelect+` WHERE o.idempotency_key = $1`, key)
	order, err := r.scanOrder(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return OrderRecord{}, ErrNotFound
	}
	return order, err
}

const orderSelect = `
	SELECT o.id, o.seller_id, s.slug, o.drop_id, d.title, d.slug,
		o.buyer_email, o.size_label, o.status, o.amount_cents, o.currency,
		o.idempotency_key, o.created_at, o.updated_at
	FROM orders o
	JOIN sellers s ON s.id = o.seller_id
	JOIN drops d ON d.id = o.drop_id
`

func (r *OrderRepository) scanOrder(row pgx.Row) (OrderRecord, error) {
	var o OrderRecord
	var idem *string
	if err := row.Scan(
		&o.ID, &o.SellerID, &o.SellerSlug, &o.DropID, &o.DropTitle, &o.DropSlug,
		&o.BuyerEmail, &o.SizeLabel, &o.Status, &o.AmountCents, &o.Currency,
		&idem, &o.CreatedAt, &o.UpdatedAt,
	); err != nil {
		return OrderRecord{}, err
	}
	o.IdempotencyKey = idem
	return o, nil
}

func (r *OrderRepository) ReserveInventory(ctx context.Context, in CheckoutInput) (CheckoutResult, error) {
	tx, err := r.store.pool.Begin(ctx)
	if err != nil {
		return CheckoutResult{}, err
	}
	defer tx.Rollback(ctx)

	var remaining int
	err = tx.QueryRow(ctx, `
		SELECT inventory_remaining FROM drops
		WHERE id = $1 AND seller_id = $2
		FOR UPDATE
	`, in.DropID, in.SellerID).Scan(&remaining)
	if errors.Is(err, pgx.ErrNoRows) {
		return CheckoutResult{}, ErrNotFound
	}
	if err != nil {
		return CheckoutResult{}, err
	}
	if remaining < 1 {
		return CheckoutResult{}, ErrSoldOut
	}

	_, err = tx.Exec(ctx, `
		UPDATE drops SET inventory_remaining = inventory_remaining - 1, updated_at = now()
		WHERE id = $1
	`, in.DropID)
	if err != nil {
		return CheckoutResult{}, err
	}

	var orderID string
	err = tx.QueryRow(ctx, `
		INSERT INTO orders (seller_id, drop_id, buyer_email, size_label, status, amount_cents, currency, idempotency_key)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id
	`, in.SellerID, in.DropID, in.BuyerEmail, in.SizeLabel, domain.OrderReserved,
		in.AmountCents, in.Currency, in.IdempotencyKey).Scan(&orderID)
	if err != nil {
		if isUniqueViolation(err) {
			return CheckoutResult{}, ErrConflict
		}
		return CheckoutResult{}, err
	}

	var reservationID string
	var expiresAt time.Time
	err = tx.QueryRow(ctx, `
		INSERT INTO inventory_reservations (drop_id, order_id, quantity, status, expires_at)
		VALUES ($1, $2, 1, $3, $4)
		RETURNING id, expires_at
	`, in.DropID, orderID, domain.ReservationActive, in.ExpiresAt).Scan(&reservationID, &expiresAt)
	if err != nil {
		return CheckoutResult{}, err
	}

	if err := r.insertAudit(ctx, tx, "order", orderID, "reserved", map[string]any{
		"dropId": in.DropID, "buyerEmail": in.BuyerEmail,
	}); err != nil {
		return CheckoutResult{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return CheckoutResult{}, err
	}

	order, err := r.GetByID(ctx, orderID)
	if err != nil {
		return CheckoutResult{}, err
	}

	return CheckoutResult{
		Order: order,
		Reservation: ReservationRecord{
			ID:        reservationID,
			DropID:    in.DropID,
			OrderID:   orderID,
			Quantity:  1,
			Status:    domain.ReservationActive,
			ExpiresAt: expiresAt,
		},
	}, nil
}

func (r *OrderRepository) GetByID(ctx context.Context, id string) (OrderRecord, error) {
	row := r.store.pool.QueryRow(ctx, orderSelect+` WHERE o.id = $1`, id)
	order, err := r.scanOrder(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return OrderRecord{}, ErrNotFound
	}
	return order, err
}

func (r *OrderRepository) GetByIDForSeller(ctx context.Context, id, sellerID string) (OrderRecord, error) {
	row := r.store.pool.QueryRow(ctx, orderSelect+` WHERE o.id = $1 AND o.seller_id = $2`, id, sellerID)
	order, err := r.scanOrder(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return OrderRecord{}, ErrNotFound
	}
	return order, err
}

type ListOrdersFilter struct {
	SellerID      string
	Status        string
	Limit         int
	Offset        int
	SortAsc       bool
	CreatedAfter  *time.Time
	CreatedBefore *time.Time
}

func (r *OrderRepository) ListForSeller(ctx context.Context, f ListOrdersFilter) ([]OrderRecord, int, error) {
	if f.Limit <= 0 {
		f.Limit = 20
	}
	if f.Limit > 100 {
		f.Limit = 100
	}

	countQuery := `SELECT COUNT(*) FROM orders WHERE seller_id = $1`
	args := []any{f.SellerID}
	argN := 2
	if f.Status != "" {
		countQuery += fmt.Sprintf(` AND status = $%d`, argN)
		args = append(args, f.Status)
		argN++
	}
	if f.CreatedAfter != nil {
		countQuery += fmt.Sprintf(` AND created_at >= $%d`, argN)
		args = append(args, *f.CreatedAfter)
		argN++
	}
	if f.CreatedBefore != nil {
		countQuery += fmt.Sprintf(` AND created_at < $%d`, argN)
		args = append(args, *f.CreatedBefore)
		argN++
	}

	var total int
	if err := r.store.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	listQuery := orderSelect + ` WHERE o.seller_id = $1`
	listArgs := []any{f.SellerID}
	argN = 2
	if f.Status != "" {
		listQuery += fmt.Sprintf(` AND o.status = $%d`, argN)
		listArgs = append(listArgs, f.Status)
		argN++
	}
	if f.CreatedAfter != nil {
		listQuery += fmt.Sprintf(` AND o.created_at >= $%d`, argN)
		listArgs = append(listArgs, *f.CreatedAfter)
		argN++
	}
	if f.CreatedBefore != nil {
		listQuery += fmt.Sprintf(` AND o.created_at < $%d`, argN)
		listArgs = append(listArgs, *f.CreatedBefore)
		argN++
	}
	listQuery += fmt.Sprintf(` ORDER BY o.created_at %s LIMIT $%d OFFSET $%d`, orderDir(f.SortAsc), argN, argN+1)
	listArgs = append(listArgs, f.Limit, f.Offset)

	rows, err := r.store.pool.Query(ctx, listQuery, listArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var orders []OrderRecord
	for rows.Next() {
		o, err := r.scanOrder(rows)
		if err != nil {
			return nil, 0, err
		}
		orders = append(orders, o)
	}
	return orders, total, rows.Err()
}

func orderDir(sortAsc bool) string {
	if sortAsc {
		return "ASC"
	}
	return "DESC"
}

func (r *OrderRepository) TransitionStatus(ctx context.Context, orderID string, from, to domain.OrderStatus, metadata map[string]any) error {
	tx, err := r.store.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	tag, err := tx.Exec(ctx, `
		UPDATE orders SET status = $3, updated_at = now()
		WHERE id = $1 AND status = $2
	`, orderID, from, to)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}

	if err := r.insertAudit(ctx, tx, "order", orderID, string(to), metadata); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *OrderRepository) ConvertReservation(ctx context.Context, orderID string) error {
	tx, err := r.store.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	tag, err := tx.Exec(ctx, `
		UPDATE inventory_reservations SET status = $2
		WHERE order_id = $1 AND status = $3
	`, orderID, domain.ReservationConverted, domain.ReservationActive)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}

	if err := r.insertAudit(ctx, tx, "reservation", orderID, "converted", nil); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *OrderRepository) ExpireStaleReservations(ctx context.Context, now time.Time) (int, error) {
	tx, err := r.store.pool.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(ctx)

	rows, err := tx.Query(ctx, `
		SELECT id, drop_id, order_id FROM inventory_reservations
		WHERE status = $1 AND expires_at <= $2
		FOR UPDATE
	`, domain.ReservationActive, now)
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	type expired struct {
		id, dropID, orderID string
	}
	var batch []expired
	for rows.Next() {
		var e expired
		if err := rows.Scan(&e.id, &e.dropID, &e.orderID); err != nil {
			return 0, err
		}
		batch = append(batch, e)
	}
	if err := rows.Err(); err != nil {
		return 0, err
	}

	for _, e := range batch {
		if _, err := tx.Exec(ctx, `
			UPDATE inventory_reservations SET status = $2 WHERE id = $1
		`, e.id, domain.ReservationExpired); err != nil {
			return 0, err
		}
		if _, err := tx.Exec(ctx, `
			UPDATE drops SET inventory_remaining = inventory_remaining + 1, updated_at = now()
			WHERE id = $1
		`, e.dropID); err != nil {
			return 0, err
		}
		if _, err := tx.Exec(ctx, `
			UPDATE orders SET status = $2, updated_at = now()
			WHERE id = $1 AND status IN ('reserved', 'payment_pending')
		`, e.orderID, domain.OrderCancelled); err != nil {
			return 0, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, err
	}
	return len(batch), nil
}

func (r *OrderRepository) ListAuditEvents(ctx context.Context, entityType, entityID string) ([]domain.OrderEvent, error) {
	rows, err := r.store.pool.Query(ctx, `
		SELECT id, action, metadata, created_at
		FROM audit_events
		WHERE entity_type = $1 AND entity_id = $2
		ORDER BY created_at ASC
	`, entityType, entityID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []domain.OrderEvent
	for rows.Next() {
		var id, action string
		var meta []byte
		var at time.Time
		if err := rows.Scan(&id, &action, &meta, &at); err != nil {
			return nil, err
		}
		detail := ""
		if len(meta) > 0 {
			detail = string(meta)
		}
		events = append(events, domain.OrderEvent{
			ID:     id,
			Label:  action,
			At:     at.UTC().Format(time.RFC3339),
			Detail: detail,
		})
	}
	return events, rows.Err()
}

func (r *OrderRepository) insertAudit(ctx context.Context, tx pgx.Tx, entityType, entityID, action string, metadata map[string]any) error {
	meta, _ := json.Marshal(metadata)
	_, err := tx.Exec(ctx, `
		INSERT INTO audit_events (entity_type, entity_id, action, metadata)
		VALUES ($1, $2, $3, $4)
	`, entityType, entityID, action, meta)
	return err
}

func (r *OrderRepository) SaveWebhookEvent(ctx context.Context, provider, eventID string, payload []byte) (bool, error) {
	tag, err := r.store.pool.Exec(ctx, `
		INSERT INTO webhook_events (provider, event_id, payload)
		VALUES ($1, $2, $3)
		ON CONFLICT (provider, event_id) DO NOTHING
	`, provider, eventID, payload)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() > 0, nil
}

func (r *OrderRepository) MarkWebhookProcessed(ctx context.Context, provider, eventID string) error {
	_, err := r.store.pool.Exec(ctx, `
		UPDATE webhook_events SET processed_at = now()
		WHERE provider = $1 AND event_id = $2
	`, provider, eventID)
	return err
}

func (r *OrderRepository) CreatePayment(ctx context.Context, orderID, providerPaymentID string, amountCents int, currency string) error {
	_, err := r.store.pool.Exec(ctx, `
		INSERT INTO payments (order_id, provider_payment_id, status, amount_cents, currency)
		VALUES ($1, $2, 'pending', $3, $4)
	`, orderID, providerPaymentID, amountCents, currency)
	return err
}

func (r *OrderRepository) MarkPaymentPaid(ctx context.Context, orderID, providerPaymentID string) error {
	tx, err := r.store.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx, `
		UPDATE payments SET status = 'paid', updated_at = now()
		WHERE order_id = $1
	`, orderID)
	if err != nil {
		return err
	}

	tag, err := tx.Exec(ctx, `
		UPDATE orders SET status = $2, updated_at = now()
		WHERE id = $1 AND status = $3
	`, orderID, domain.OrderPaid, domain.OrderPaymentPending)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}

	if err := r.insertAudit(ctx, tx, "order", orderID, "paid", map[string]any{
		"providerPaymentId": providerPaymentID,
	}); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

type PaymentRecord struct {
	ProviderPaymentID string
	Status            string
}

func (r *OrderRepository) GetPaymentByOrderID(ctx context.Context, orderID string) (PaymentRecord, error) {
	var p PaymentRecord
	err := r.store.pool.QueryRow(ctx, `
		SELECT provider_payment_id, status
		FROM payments
		WHERE order_id = $1
	`, orderID).Scan(&p.ProviderPaymentID, &p.Status)
	if errors.Is(err, pgx.ErrNoRows) {
		return PaymentRecord{}, ErrNotFound
	}
	return p, err
}

func (r *OrderRepository) MarkOrderRefunded(ctx context.Context, orderID string, from domain.OrderStatus) error {
	tx, err := r.store.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	tag, err := tx.Exec(ctx, `
		UPDATE orders SET status = $3, updated_at = now()
		WHERE id = $1 AND status = $2
	`, orderID, from, domain.OrderRefunded)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrInvalidTransition
	}

	if _, err := tx.Exec(ctx, `
		UPDATE payments SET status = 'refunded', updated_at = now()
		WHERE order_id = $1
	`, orderID); err != nil {
		return err
	}

	if err := r.insertAudit(ctx, tx, "order", orderID, "refunded", map[string]any{
		"from": string(from),
	}); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
