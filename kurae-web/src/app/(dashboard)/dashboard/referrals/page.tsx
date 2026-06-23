"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check } from "lucide-react";

export default function ReferralsPage() {
  const [copied, setCopied] = useState(false);
  const link = "https://kurae.com/hana-studio/sakura-hoodie?ref=HANASTUDIO";

  async function copy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-sakura-ink">Referrals</h1>
        <p className="mt-1 text-sm text-sakura-mist">
          Generate referral links and track conversions — mock UI (phase 2).
        </p>
      </div>

      <section className="space-y-4 rounded-lg border border-sakura-petal p-5">
        <h2 className="text-sm font-medium">Drop referral link</h2>
        <div className="flex gap-2">
          <Input value={link} readOnly className="font-mono text-xs" />
          <Button type="button" variant="outline" onClick={copy}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        <dl className="grid grid-cols-3 gap-4 pt-2 text-center">
          <div className="rounded-md bg-sakura-surface p-3">
            <dt className="text-xs text-sakura-mist">Clicks</dt>
            <dd className="font-mono text-lg font-semibold">128</dd>
          </div>
          <div className="rounded-md bg-sakura-surface p-3">
            <dt className="text-xs text-sakura-mist">Signups</dt>
            <dd className="font-mono text-lg font-semibold">34</dd>
          </div>
          <div className="rounded-md bg-sakura-surface p-3">
            <dt className="text-xs text-sakura-mist">Orders</dt>
            <dd className="font-mono text-lg font-semibold">7</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
