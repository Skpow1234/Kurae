package validate

import (
	"strings"

	"github.com/kurae/kurae-api/internal/domain"
)

const maxUTMLength = 128

func NormalizeUTM(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	if len(value) > maxUTMLength {
		value = value[:maxUTMLength]
	}
	return value
}

func NormalizeCampaign(c domain.CampaignAttribution) domain.CampaignAttribution {
	return domain.CampaignAttribution{
		Source:   NormalizeUTM(c.Source),
		Medium:   NormalizeUTM(c.Medium),
		Campaign: NormalizeUTM(c.Campaign),
		Term:     NormalizeUTM(c.Term),
		Content:  NormalizeUTM(c.Content),
	}
}
