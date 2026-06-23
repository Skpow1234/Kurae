package validate

import (
	"errors"
	"regexp"
	"strings"
)

var slugPattern = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)

var ErrInvalidSlug = errors.New("slug must be lowercase letters, numbers, and hyphens")
var ErrInvalidEmail = errors.New("invalid email")

func NormalizeEmail(email string) (string, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" || !strings.Contains(email, "@") || strings.HasPrefix(email, "@") {
		return "", ErrInvalidEmail
	}
	return email, nil
}

func NormalizeSlug(slug string) (string, error) {
	slug = strings.ToLower(strings.TrimSpace(slug))
	if slug == "" || !slugPattern.MatchString(slug) {
		return "", ErrInvalidSlug
	}
	return slug, nil
}

func Trim(s string) string {
	return strings.TrimSpace(s)
}
