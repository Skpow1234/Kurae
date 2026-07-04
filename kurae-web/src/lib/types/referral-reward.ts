import type { DiscountType } from "@/lib/types/discount";

export type ReferralRewardSettings = {
  enabled: boolean;
  threshold: number;
  type: DiscountType;
  value: number;
};

export type BuyerReferralRewardItem = {
  code: string;
  rewardTier: number;
  type: DiscountType;
  value: number;
  grantedAt: string;
  redeemed: boolean;
};

export type BuyerReferralProgress = {
  sellerSlug: string;
  sellerName: string;
  code: string;
  successfulReferrals: number;
  threshold: number;
  rewardsEnabled: boolean;
  rewardType: DiscountType;
  rewardValue: number;
  progressInTier: number;
  referralsUntilReward: number;
  earnedRewards: BuyerReferralRewardItem[];
};
