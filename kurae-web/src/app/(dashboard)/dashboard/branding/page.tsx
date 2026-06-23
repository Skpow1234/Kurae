"use client";

import Image from "next/image";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SWATCHES = [
  { id: "blush", label: "Sakura blush", class: "bg-sakura-blush" },
  { id: "dusk", label: "Sakura dusk", class: "bg-sakura-dusk" },
  { id: "teal", label: "Slate teal", class: "bg-[#5C6B6A]" },
];

export default function BrandingPage() {
  const [accent, setAccent] = useState("blush");
  const [bio, setBio] = useState(
    "Japanese-inspired clothing. Limited drops only.",
  );

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-sakura-ink">Branding</h1>
        <p className="mt-1 text-sm text-sakura-mist">
          Custom branding on public pages only — mock UI (phase 2).
        </p>
      </div>

      <section className="space-y-4 rounded-lg border border-sakura-petal p-5">
        <div>
          <label className="mb-1 block text-sm font-medium">Logo</label>
          <Input type="file" accept="image/*" disabled />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Accent color</label>
          <div className="flex gap-3">
            {SWATCHES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setAccent(s.id)}
                className={`h-10 w-10 rounded-full ring-2 ring-offset-2 ${s.class} ${
                  accent === s.id ? "ring-sakura-ink" : "ring-transparent"
                }`}
                title={s.label}
              />
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-sakura-petal bg-sakura-paper px-3 py-2 text-sm"
          />
        </div>
        <Button type="button" disabled>
          Save branding
        </Button>
      </section>

      <section className="rounded-lg border border-sakura-petal p-5">
        <p className="text-xs uppercase tracking-wide text-sakura-mist">
          Preview
        </p>
        <div className="mt-4 flex items-center gap-3">
          <div className="relative h-12 w-12 overflow-hidden rounded-full bg-sakura-petal">
            <Image
              src="https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=100&q=80"
              alt=""
              fill
              className="object-cover"
            />
          </div>
          <div>
            <p className="font-semibold text-sakura-ink">Hana Studio</p>
            <p className="text-sm text-sakura-mist">{bio}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
