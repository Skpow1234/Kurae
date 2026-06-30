package queue

import "time"

const MaxEmailAttempts = 5

// EmailRetryDelay returns backoff before the next attempt (attempt is 1-based after a failure).
func EmailRetryDelay(attempt int) time.Duration {
	delays := []time.Duration{
		30 * time.Second,
		2 * time.Minute,
		10 * time.Minute,
		30 * time.Minute,
		time.Hour,
	}
	if attempt <= 0 {
		return delays[0]
	}
	if attempt > len(delays) {
		return delays[len(delays)-1]
	}
	return delays[attempt-1]
}
