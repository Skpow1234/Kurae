export type TeamRole = "owner" | "admin" | "staff";

export type TeamMember = {
  id: string;
  email: string;
  name: string;
  role: Exclude<TeamRole, "owner">;
  createdAt: string;
};

export function canManageTeam(role: TeamRole): boolean {
  return role === "owner";
}

export function canWriteDrops(role: TeamRole): boolean {
  return role === "owner" || role === "admin";
}

export function canWriteDiscounts(role: TeamRole): boolean {
  return role === "owner" || role === "admin";
}

export function canWriteReferrals(role: TeamRole): boolean {
  return role === "owner" || role === "admin";
}

export function canWriteBranding(role: TeamRole): boolean {
  return role === "owner" || role === "admin";
}

export function canRefundOrders(role: TeamRole): boolean {
  return role === "owner" || role === "admin";
}

export function canShipOrders(role: TeamRole): boolean {
  return role === "owner" || role === "admin" || role === "staff";
}

export function teamRoleLabel(role: TeamRole): string {
  switch (role) {
    case "owner":
      return "Owner";
    case "admin":
      return "Admin";
    case "staff":
      return "Staff";
  }
}
