package domain_test

import (
	"testing"

	"github.com/kurae/kurae-api/internal/domain"
)

func TestTeamRolePermissions(t *testing.T) {
	if !domain.RoleAllows(domain.TeamRoleOwner, domain.PermTeamManage) {
		t.Fatal("owner should manage team")
	}
	if domain.RoleAllows(domain.TeamRoleAdmin, domain.PermTeamManage) {
		t.Fatal("admin should not manage team")
	}
	if !domain.RoleAllows(domain.TeamRoleStaff, domain.PermOrdersFulfill) {
		t.Fatal("staff should fulfill orders")
	}
	if domain.RoleAllows(domain.TeamRoleStaff, domain.PermOrdersRefund) {
		t.Fatal("staff should not refund orders")
	}
	if domain.RoleAllows(domain.TeamRoleStaff, domain.PermDropsWrite) {
		t.Fatal("staff should not write drops")
	}
}
