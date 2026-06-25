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

export type SellerAnalytics = {
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
};
