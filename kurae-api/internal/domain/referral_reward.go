package domain

type ReferralRewardSettings struct {
	Enabled   bool         `json:"enabled"`
	Threshold int          `json:"threshold"`
	Type      DiscountType `json:"type"`
	Value     int          `json:"value"`
}

type BuyerReferralRewardItem struct {
	Code          string       `json:"code"`
	RewardTier    int          `json:"rewardTier"`
	Type          DiscountType `json:"type"`
	Value         int          `json:"value"`
	GrantedAt     string       `json:"grantedAt"`
	Redeemed      bool         `json:"redeemed"`
}

type BuyerReferralProgress struct {
	SellerSlug          string                    `json:"sellerSlug"`
	SellerName          string                    `json:"sellerName"`
	Code                string                    `json:"code"`
	SuccessfulReferrals int                       `json:"successfulReferrals"`
	Threshold           int                       `json:"threshold"`
	RewardsEnabled      bool                      `json:"rewardsEnabled"`
	RewardType          DiscountType              `json:"rewardType"`
	RewardValue         int                       `json:"rewardValue"`
	ProgressInTier      int                       `json:"progressInTier"`
	ReferralsUntilReward  int                       `json:"referralsUntilReward"`
	EarnedRewards       []BuyerReferralRewardItem `json:"earnedRewards"`
}
