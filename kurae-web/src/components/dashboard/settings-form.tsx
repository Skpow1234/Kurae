"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SellerSession } from "@/lib/types";

type SettingsFormProps = {
  session: SellerSession;
};

export function SettingsForm({ session }: SettingsFormProps) {
  const router = useRouter();
  const [sellerName, setSellerName] = useState(session.sellerName);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  async function saveProfile() {
    setSavingProfile(true);
    setProfileMessage(null);
    setProfileError(null);

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: sellerName.trim() }),
      });

      const data = (await res.json().catch(() => null)) as {
        error?: string;
        session?: SellerSession;
      } | null;

      if (!res.ok) {
        setProfileError(data?.error ?? "Could not save profile.");
        return;
      }

      if (data?.session) {
        setSellerName(data.session.sellerName);
      }
      setProfileMessage("Profile updated.");
      router.refresh();
    } catch {
      setProfileError("Could not save profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword() {
    setSavingPassword(true);
    setPasswordMessage(null);
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      setSavingPassword(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = (await res.json().catch(() => null)) as { error?: string } | null;

      if (!res.ok) {
        setPasswordError(data?.error ?? "Could not change password.");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Password updated.");
    } catch {
      setPasswordError("Could not change password.");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4 rounded-lg border border-sakura-petal p-5">
        <h2 className="text-sm font-medium text-sakura-ink">Account</h2>
        <div>
          <label htmlFor="settings-email" className="mb-1 block text-sm text-sakura-mist">
            Email
          </label>
          <Input id="settings-email" value={session.email} disabled />
        </div>
        <div>
          <label htmlFor="settings-name" className="mb-1 block text-sm text-sakura-mist">
            Brand name
          </label>
          <Input
            id="settings-name"
            value={sellerName}
            onChange={(e) => setSellerName(e.target.value)}
            disabled={savingProfile}
          />
        </div>
        <div>
          <label htmlFor="settings-slug" className="mb-1 block text-sm text-sakura-mist">
            Store URL
          </label>
          <Input
            id="settings-slug"
            value={`/${session.sellerSlug}`}
            disabled
          />
          <p className="mt-1 text-xs text-sakura-mist">
            Store slug cannot be changed after signup.
          </p>
        </div>
        {profileError && (
          <p className="text-sm text-sakura-warning" role="alert">
            {profileError}
          </p>
        )}
        {profileMessage && (
          <p className="text-sm text-sakura-success">{profileMessage}</p>
        )}
        <Button
          type="button"
          className="bg-sakura-dusk"
          disabled={savingProfile || !sellerName.trim()}
          onClick={() => void saveProfile()}
        >
          {savingProfile ? "Saving…" : "Save changes"}
        </Button>
      </section>

      <section className="space-y-4 rounded-lg border border-sakura-petal p-5">
        <h2 className="text-sm font-medium text-sakura-ink">Password</h2>
        <div>
          <label htmlFor="current-password" className="mb-1 block text-sm text-sakura-mist">
            Current password
          </label>
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            disabled={savingPassword}
          />
        </div>
        <div>
          <label htmlFor="new-password" className="mb-1 block text-sm text-sakura-mist">
            New password
          </label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={savingPassword}
          />
        </div>
        <div>
          <label htmlFor="confirm-password" className="mb-1 block text-sm text-sakura-mist">
            Confirm new password
          </label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={savingPassword}
          />
        </div>
        {passwordError && (
          <p className="text-sm text-sakura-warning" role="alert">
            {passwordError}
          </p>
        )}
        {passwordMessage && (
          <p className="text-sm text-sakura-success">{passwordMessage}</p>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={
            savingPassword ||
            !currentPassword ||
            !newPassword ||
            !confirmPassword
          }
          onClick={() => void changePassword()}
        >
          {savingPassword ? "Updating…" : "Change password"}
        </Button>
      </section>
    </div>
  );
}
