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
