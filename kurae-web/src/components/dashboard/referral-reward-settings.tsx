"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { ReferralRewardSettings } from "@/lib/types/referral-reward";

type ReferralRewardSettingsFormProps = {
  initial: ReferralRewardSettings;
};

export function ReferralRewardSettingsForm({
  initial,
}: ReferralRewardSettingsFormProps) {
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch("/api/referral-rewards/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await res.json().catch(() => null)) as {
        settings?: ReferralRewardSettings;
        error?: string;
      } | null;

      if (!res.ok) {
        setError(data?.error ?? "Could not save settings.");
        return;
      }

      if (data?.settings) {
        setValues(data.settings);
      }
      setSaved(true);
    } catch {
      setError("Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-4 rounded-lg border border-sakura-petal p-5">
      <div>
        <h2 className="text-sm font-medium uppercase tracking-wide text-sakura-mist">
          Buyer referral rewards
        </h2>
        <p className="mt-1 text-sm text-sakura-stone">
          Logged-in buyers get a personal link. After N friends complete a paid order,
          they receive a single-use discount code automatically.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={values.enabled}
          onChange={(e) => setValues((prev) => ({ ...prev, enabled: e.target.checked }))}
          className="rounded border-sakura-petal text-sakura-blush focus:ring-sakura-bloom"
        />
        Enable buyer referral rewards
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="reward-threshold" className="mb-1 block text-sm font-medium">
            Referrals per reward
          </label>
          <Input
            id="reward-threshold"
            type="number"
            min={1}
            max={100}
            value={values.threshold}
            onChange={(e) =>
              setValues((prev) => ({
                ...prev,
                threshold: Number.parseInt(e.target.value, 10) || 1,
              }))
            }
          />
        </div>
        <div>
          <label htmlFor="reward-type" className="mb-1 block text-sm font-medium">
            Reward type
          </label>
          <Select
            id="reward-type"
            value={values.type}
            onChange={(e) =>
              setValues((prev) => ({
                ...prev,
                type: e.target.value as ReferralRewardSettings["type"],
              }))
            }
          >
            <option value="percent">Percent off</option>
            <option value="fixed">Fixed amount</option>
          </Select>
        </div>
        <div>
          <label htmlFor="reward-value" className="mb-1 block text-sm font-medium">
            Reward value
          </label>
          <Input
            id="reward-value"
            type="number"
            min={1}
            max={values.type === "percent" ? 100 : undefined}
            value={values.value}
            onChange={(e) =>
              setValues((prev) => ({
                ...prev,
                value: Number.parseInt(e.target.value, 10) || 1,
              }))
            }
          />
          <p className="mt-1 text-xs text-sakura-mist">
            {values.type === "percent" ? "Percent (1–100)" : "Amount in cents"}
          </p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-sakura-warning" role="alert">
          {error}
        </p>
      )}
      {saved && (
        <p className="text-sm text-sakura-success" role="status">
          Settings saved.
        </p>
      )}

      <Button type="button" variant="outline" disabled={saving} onClick={() => void save()}>
        {saving ? "Saving…" : "Save reward settings"}
      </Button>
    </section>
  );
}
