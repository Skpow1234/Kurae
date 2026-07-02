export type ReferralCode = {
  id: string;
  code: string;
  dropId?: string;
  dropTitle?: string;
  dropSlug?: string;
  clicksCount: number;
  signupsCount: number;
  ordersCount: number;
  createdAt: string;
};

export type ReferralStats = {
  valid: boolean;
  code?: string;
  clicksCount: number;
  signupsCount: number;
  ordersCount: number;
};
