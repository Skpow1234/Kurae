export type DailyAnalyticsPoint = {
  date: string;
  views: number;
  orders: number;
  revenueCents: number;
};

export type AnalyticsFunnel = {
  views: number;
  checkouts: number;
  paid: number;
};

export type DropAnalyticsRow = {
  dropId: string;
  dropTitle: string;
  dropSlug: string;
  views: number;
  waitlistSignups: number;
  checkouts: number;
  paidOrders: number;
  revenueCents: number;
  conversionRate: number;
};

export type SellerAnalytics = {
  rangeDays: number;
  periodStart: string;
  periodEnd: string;
  dropId?: string;
  pageViews7d: number;
  pageViewsPrev7d: number;
  waitlistSignups7d: number;
  waitlistSignupsPrev7d: number;
  conversionRate: number;
  conversionRatePrev: number;
  revenue7dCents: number;
  revenuePrev7dCents: number;
  dailyTraffic: DailyAnalyticsPoint[];
  funnel: AnalyticsFunnel;
  dropBreakdown?: DropAnalyticsRow[];
};

export type AnalyticsQuery = {
  days?: number;
  dropId?: string;
};
