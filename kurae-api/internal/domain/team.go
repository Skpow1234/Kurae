package domain

type TeamRole string

const (
	TeamRoleOwner TeamRole = "owner"
	TeamRoleAdmin TeamRole = "admin"
	TeamRoleStaff TeamRole = "staff"
)

type Permission string

const (
	PermTeamManage     Permission = "team.manage"
	PermDropsRead      Permission = "drops.read"
	PermDropsWrite     Permission = "drops.write"
	PermOrdersRead     Permission = "orders.read"
	PermOrdersFulfill  Permission = "orders.fulfill"
	PermOrdersRefund   Permission = "orders.refund"
	PermDiscountsWrite Permission = "discounts.write"
	PermReferralsWrite Permission = "referrals.write"
	PermBrandingWrite  Permission = "branding.write"
	PermAnalyticsRead  Permission = "analytics.read"
	PermSettingsBrand  Permission = "settings.brand"
	PermUploadsWrite   Permission = "uploads.write"
)

var teamRolePermissions = map[TeamRole]map[Permission]bool{
	TeamRoleOwner: {
		PermTeamManage:     true,
		PermDropsRead:      true,
		PermDropsWrite:     true,
		PermOrdersRead:     true,
		PermOrdersFulfill:  true,
		PermOrdersRefund:   true,
		PermDiscountsWrite: true,
		PermReferralsWrite: true,
		PermBrandingWrite:  true,
		PermAnalyticsRead:  true,
		PermSettingsBrand:  true,
		PermUploadsWrite:   true,
	},
	TeamRoleAdmin: {
		PermDropsRead:      true,
		PermDropsWrite:     true,
		PermOrdersRead:     true,
		PermOrdersFulfill:  true,
		PermOrdersRefund:   true,
		PermDiscountsWrite: true,
		PermReferralsWrite: true,
		PermBrandingWrite:  true,
		PermAnalyticsRead:  true,
		PermUploadsWrite:   true,
	},
	TeamRoleStaff: {
		PermDropsRead:     true,
		PermOrdersRead:    true,
		PermOrdersFulfill: true,
		PermAnalyticsRead: true,
	},
}

func ParseTeamRole(raw string) (TeamRole, bool) {
	switch TeamRole(raw) {
	case TeamRoleOwner, TeamRoleAdmin, TeamRoleStaff:
		return TeamRole(raw), true
	default:
		return "", false
	}
}

func RoleAllows(role TeamRole, perm Permission) bool {
	perms, ok := teamRolePermissions[role]
	if !ok {
		return false
	}
	return perms[perm]
}

type TeamMember struct {
	ID        string   `json:"id"`
	Email     string   `json:"email"`
	Name      string   `json:"name"`
	Role      TeamRole `json:"role"`
	CreatedAt string   `json:"createdAt"`
}
