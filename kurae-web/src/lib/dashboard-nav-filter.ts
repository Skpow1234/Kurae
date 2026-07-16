import type { DashboardNavItem } from "@/lib/dashboard-nav";
import type { TeamRole } from "@/lib/team-permissions";

function roleCanSeeTeam(role: TeamRole): boolean {
  return role === "owner";
}

function roleCanSeeMore(role: TeamRole, href: string): boolean {
  if (role === "staff") {
    return (
      href === "/dashboard/analytics" ||
      href === "/dashboard/webhooks" ||
      href === "/dashboard/settings"
    );
  }
  if (role === "admin") {
    return href !== "/dashboard/settings/team";
  }
  return true;
}

export function navItemsForRole(
  items: DashboardNavItem[],
  role: TeamRole,
  section: "main" | "more",
): DashboardNavItem[] {
  return items.filter((item) => {
    if (item.href === "/dashboard/settings/team") {
      return roleCanSeeTeam(role);
    }
    if (section === "more") {
      return roleCanSeeMore(role, item.href);
    }
    if (role === "staff" && item.href === "/dashboard/drops") {
      return true;
    }
    return true;
  });
}
