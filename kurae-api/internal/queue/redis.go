package queue

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	emailQueueKey = "kurae:jobs:email"
)

var ErrQueueDisabled = errors.New("redis not configured")

type EmailJob struct {
	OrderID    string `json:"orderId"`
	BuyerEmail string `json:"buyerEmail"`
	DropTitle  string `json:"dropTitle"`
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
		return nil
	}
	payload, err := json.Marshal(job)
	if err != nil {
		return err
	}
	return q.client.LPush(ctx, emailQueueKey, payload).Err()
}

func (q *RedisQueue) DequeueEmail(ctx context.Context, timeout time.Duration) (EmailJob, error) {
	if q == nil || q.client == nil {
		return EmailJob{}, ErrQueueDisabled
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

func (q *RedisQueue) Close() error {
	if q == nil || q.client == nil {
		return nil
	}
	return q.client.Close()
}
