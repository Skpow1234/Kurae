package queue

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	emailQueueKey = "kurae:jobs:email"
	emailRetryKey = "kurae:jobs:email:retry"
	emailDLQKey   = "kurae:jobs:email:dlq"

	EmailTypeOrderConfirmation = "order_confirmation"
	EmailTypeWaitlistLive      = "waitlist_live"
	EmailTypeWaitlistSoon      = "waitlist_soon"
	EmailTypeWaitlistRestock   = "waitlist_restock"
)

var ErrQueueDisabled = errors.New("redis not configured")

type EmailJob struct {
	Type       string `json:"type,omitempty"`
	OrderID    string `json:"orderId,omitempty"`
	BuyerEmail string `json:"buyerEmail,omitempty"`
	DropTitle     string `json:"dropTitle,omitempty"`
	DropID        string `json:"dropId,omitempty"`
	DropURL       string `json:"dropUrl,omitempty"`
	DropStartsAt  string `json:"dropStartsAt,omitempty"`
	Attempt       int    `json:"attempt,omitempty"`
}

type EmailDLQEntry struct {
	Job      EmailJob `json:"job"`
	Reason   string   `json:"reason"`
	FailedAt string   `json:"failedAt"`
}

type RedisQueue struct {
	client *redis.Client
}

func NewRedisQueue(redisURL string) (*RedisQueue, error) {
	if redisURL == "" {
		return nil, ErrQueueDisabled
	}
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, err
	}
	client := redis.NewClient(opts)
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, err
	}
	return &RedisQueue{client: client}, nil
}

func (q *RedisQueue) EnqueueEmail(ctx context.Context, job EmailJob) error {
	if q == nil || q.client == nil {
		return ErrQueueDisabled
	}
	payload, err := json.Marshal(job)
	if err != nil {
		return err
	}
	return q.client.LPush(ctx, emailQueueKey, payload).Err()
}

func (q *RedisQueue) RequeueEmail(ctx context.Context, job EmailJob, reason string) error {
	if q == nil || q.client == nil {
		return ErrQueueDisabled
	}
	job.Attempt++
	if job.Attempt >= MaxEmailAttempts {
		return q.EnqueueEmailDLQ(ctx, job, reason)
	}
	payload, err := json.Marshal(job)
	if err != nil {
		return err
	}
	runAt := float64(time.Now().Add(EmailRetryDelay(job.Attempt)).UnixMilli())
	return q.client.ZAdd(ctx, emailRetryKey, redis.Z{Score: runAt, Member: payload}).Err()
}

func (q *RedisQueue) EnqueueEmailDLQ(ctx context.Context, job EmailJob, reason string) error {
	if q == nil || q.client == nil {
		return ErrQueueDisabled
	}
	entry := EmailDLQEntry{
		Job:      job,
		Reason:   reason,
		FailedAt: time.Now().UTC().Format(time.RFC3339),
	}
	payload, err := json.Marshal(entry)
	if err != nil {
		return err
	}
	return q.client.LPush(ctx, emailDLQKey, payload).Err()
}

func (q *RedisQueue) DequeueEmail(ctx context.Context, timeout time.Duration) (EmailJob, error) {
	if q == nil || q.client == nil {
		return EmailJob{}, ErrQueueDisabled
	}

	if job, ok, err := q.dequeueDueRetry(ctx); ok {
		return job, err
	} else if err != nil && !errors.Is(err, redis.Nil) {
		return EmailJob{}, err
	}

	result, err := q.client.BRPop(ctx, timeout, emailQueueKey).Result()
	if err != nil {
		return EmailJob{}, err
	}
	if len(result) < 2 {
		return EmailJob{}, errors.New("empty queue result")
	}
	var job EmailJob
	if err := json.Unmarshal([]byte(result[1]), &job); err != nil {
		return EmailJob{}, err
	}
	return job, nil
}

func (q *RedisQueue) dequeueDueRetry(ctx context.Context) (EmailJob, bool, error) {
	now := fmt.Sprintf("%f", float64(time.Now().UnixMilli()))
	items, err := q.client.ZRangeByScore(ctx, emailRetryKey, &redis.ZRangeBy{
		Min:   "0",
		Max:   now,
		Count: 1,
	}).Result()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return EmailJob{}, false, nil
		}
		return EmailJob{}, false, err
	}
	if len(items) == 0 {
		return EmailJob{}, false, nil
	}

	member := items[0]
	removed, err := q.client.ZRem(ctx, emailRetryKey, member).Result()
	if err != nil {
		return EmailJob{}, false, err
	}
	if removed == 0 {
		return EmailJob{}, false, nil
	}

	var job EmailJob
	if err := json.Unmarshal([]byte(member), &job); err != nil {
		return EmailJob{}, false, err
	}
	return job, true, nil
}

func (q *RedisQueue) Close() error {
	if q == nil || q.client == nil {
		return nil
	}
	return q.client.Close()
}

func (q *RedisQueue) Ping(ctx context.Context) error {
	if q == nil || q.client == nil {
		return ErrQueueDisabled
	}
	return q.client.Ping(ctx).Err()
}
