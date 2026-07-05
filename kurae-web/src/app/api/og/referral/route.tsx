import { ImageResponse } from "next/og";

import { requireApiBase } from "@/lib/api/config";
import type { ReferralPreview } from "@/lib/referral-preview";
import {
  buildReferralPageDescription,
} from "@/lib/referral-preview";

export const runtime = "nodejs";

const SIZE = { width: 1200, height: 630 };

const FALLBACK_ACCENT = "#a67a7a";
const PAPER = "#fdf8f8";
const INK = "#2a2224";
const MIST = "#9a858a";

async function loadPreview(
  seller: string,
  drop: string,
  code: string,
): Promise<ReferralPreview | null> {
  const qs = new URLSearchParams({
    sellerSlug: seller,
    code: code.toUpperCase(),
  });
  if (drop.trim()) qs.set("dropSlug", drop);

  try {
    const res = await fetch(
      `${requireApiBase()}/public/referrals/preview?${qs}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as ReferralPreview;
    return data.valid ? data : null;
  } catch {
    return null;
  }
}

function pickHeroImage(preview: ReferralPreview): string | null {
  const hero = preview.heroImageUrl?.trim();
  if (hero) return hero;
  const logo = preview.logoUrl?.trim();
  return logo || null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const seller = searchParams.get("seller")?.trim() ?? "";
  const drop = searchParams.get("drop")?.trim() ?? "";
  const code = searchParams.get("code")?.trim() ?? "";

  if (!seller || !code) {
    return new Response("seller and code are required", { status: 400 });
  }

  const preview = await loadPreview(seller, drop, code);
  if (!preview) {
    return new Response("Referral preview not found", { status: 404 });
  }

  const accent = preview.accent?.trim() || FALLBACK_ACCENT;
  const description = buildReferralPageDescription(preview);
  const heroImage = pickHeroImage(preview);
  const headline = preview.dropTitle?.trim() || preview.sellerName?.trim() || "Limited drop";
  const referrer = preview.referrerLabel?.trim() || "A friend";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: PAPER,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 420,
            height: "100%",
            background: accent,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {heroImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={heroImage}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                width: "100%",
                height: "100%",
                alignItems: "center",
                justifyContent: "center",
                color: PAPER,
                fontSize: 48,
                fontWeight: 700,
              }}
            >
              {preview.sellerName?.slice(0, 1) ?? "K"}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "56px 64px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p
              style={{
                margin: 0,
                fontSize: 28,
                fontWeight: 600,
                color: accent,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {referrer} invited you
            </p>
            <h1
              style={{
                margin: 0,
                fontSize: 56,
                fontWeight: 700,
                color: INK,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
              }}
            >
              {headline}
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: 28,
                color: MIST,
                lineHeight: 1.4,
                maxHeight: 120,
                overflow: "hidden",
              }}
            >
              {description.slice(0, 140)}
            </p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <p style={{ margin: 0, fontSize: 24, color: MIST }}>
              {preview.sellerName?.trim() || "Kurae"}
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 600,
                color: INK,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Kurae
            </p>
          </div>
        </div>
      </div>
    ),
    {
      ...SIZE,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate",
      },
    },
  );
}
