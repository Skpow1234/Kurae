export type DashboardNavItem = {
  href: string;
  label: string;
};

export const dashboardMainNav: DashboardNavItem[] = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/drops", label: "Drops" },
  { href: "/dashboard/orders", label: "Orders" },
];

export const dashboardMoreNav: DashboardNavItem[] = [
  { href: "/dashboard/analytics", label: "Analytics" },
  { href: "/dashboard/referrals", label: "Referrals" },
  { href: "/dashboard/discounts", label: "Discounts" },
  { href: "/dashboard/branding", label: "Branding" },
  { href: "/dashboard/settings/team", label: "Team" },
  { href: "/dashboard/settings", label: "Settings" },
];

export function isDashboardNavActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
