"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BuyerSession } from "@/lib/types";

type BuyerSettingsFormProps = {
  session: BuyerSession;
};

export function BuyerSettingsForm({ session }: BuyerSettingsFormProps) {
  const router = useRouter();
  const [name, setName] = useState(session.name);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function saveProfile() {
    setSavingProfile(true);
    setProfileMessage(null);
    setProfileError(null);

    try {
      const res = await fetch("/api/auth/buyer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = (await res.json().catch(() => null)) as {
        error?: string;
        session?: BuyerSession;
      } | null;

      if (!res.ok) {
        setProfileError(data?.error ?? "Could not save profile.");
        return;
      }

      if (data?.session) {
        setName(data.session.name);
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
      const res = await fetch("/api/auth/buyer/password", {
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

  async function signOut() {
    setSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4 rounded-lg border border-sakura-petal p-5">
        <h2 className="text-sm font-medium text-sakura-ink">Account</h2>
        <div>
          <label htmlFor="buyer-email" className="mb-1 block text-sm text-sakura-mist">
            Email
          </label>
          <Input id="buyer-email" value={session.email} disabled />
        </div>
        <div>
          <label htmlFor="buyer-name" className="mb-1 block text-sm text-sakura-mist">
            Name
          </label>
          <Input
            id="buyer-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={savingProfile}
          />
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
          disabled={savingProfile || !name.trim()}
          onClick={() => void saveProfile()}
        >
          {savingProfile ? "Saving…" : "Save changes"}
        </Button>
      </section>

      <section className="space-y-4 rounded-lg border border-sakura-petal p-5">
        <h2 className="text-sm font-medium text-sakura-ink">Password</h2>
        <div>
          <label
            htmlFor="buyer-current-password"
            className="mb-1 block text-sm text-sakura-mist"
          >
            Current password
          </label>
          <Input
            id="buyer-current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            disabled={savingPassword}
          />
        </div>
        <div>
          <label
            htmlFor="buyer-new-password"
            className="mb-1 block text-sm text-sakura-mist"
          >
            New password
          </label>
          <Input
            id="buyer-new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={savingPassword}
          />
        </div>
        <div>
          <label
            htmlFor="buyer-confirm-password"
            className="mb-1 block text-sm text-sakura-mist"
          >
            Confirm new password
          </label>
          <Input
            id="buyer-confirm-password"
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

      <Button
        type="button"
        variant="ghost"
        className="text-sakura-mist hover:text-sakura-ink"
        disabled={signingOut}
        onClick={() => void signOut()}
      >
        {signingOut ? "Signing out…" : "Sign out"}
      </Button>
    </div>
  );
}
