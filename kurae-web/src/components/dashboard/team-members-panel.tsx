"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import {
  createTeamMember,
  deleteTeamMember,
  updateTeamMember,
} from "@/lib/api/team";
import type { TeamMember } from "@/lib/team-permissions";
import { teamRoleLabel } from "@/lib/team-permissions";

type TeamMembersPanelProps = {
  initialMembers: TeamMember[];
};

export function TeamMembersPanel({ initialMembers }: TeamMembersPanelProps) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "staff">("staff");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setCreateError(null);

    const result = await createTeamMember({
      email: email.trim(),
      name: name.trim(),
      password,
      role,
    });

    if (!result.ok || !result.member) {
      setCreateError(result.error ?? "Could not add team member.");
      setCreating(false);
      return;
    }

    setMembers((current) => [...current, result.member!]);
    setEmail("");
    setName("");
    setPassword("");
    setRole("staff");
    setCreating(false);
    router.refresh();
  }

  async function handleRoleChange(member: TeamMember, nextRole: "admin" | "staff") {
    setRowError(null);
    const result = await updateTeamMember(member.id, {
      name: member.name,
      role: nextRole,
    });
    if (!result.ok) {
      setRowError(result.error ?? "Could not update team member.");
      return;
    }
    setMembers((current) =>
      current.map((item) =>
        item.id === member.id ? { ...item, role: nextRole } : item,
      ),
    );
    router.refresh();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setPendingDeleteId(deleteTarget.id);
    setRowError(null);

    const result = await deleteTeamMember(deleteTarget.id);
    if (!result.ok) {
      setRowError(result.error ?? "Could not remove team member.");
      setPendingDeleteId(null);
      return;
    }

    setMembers((current) => current.filter((item) => item.id !== deleteTarget.id));
    setDeleteTarget(null);
    setPendingDeleteId(null);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4 rounded-lg border border-sakura-petal p-5">
        <h2 className="text-sm font-medium text-sakura-ink">Add team member</h2>
        <p className="text-sm text-sakura-mist">
          Admins can manage drops, orders, discounts, and branding. Staff can view
          drops and analytics and mark orders shipped.
        </p>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => void handleCreate(e)}>
          <div>
            <label htmlFor="team-email" className="mb-1 block text-sm text-sakura-mist">
              Email
            </label>
            <Input
              id="team-email"
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={creating}
              required
            />
          </div>
          <div>
            <label htmlFor="team-name" className="mb-1 block text-sm text-sakura-mist">
              Display name
            </label>
            <Input
              id="team-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={creating}
              required
            />
          </div>
          <div>
            <label htmlFor="team-password" className="mb-1 block text-sm text-sakura-mist">
              Temporary password
            </label>
            <Input
              id="team-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={creating}
              required
              minLength={8}
            />
          </div>
          <div>
            <label htmlFor="team-role" className="mb-1 block text-sm text-sakura-mist">
              Role
            </label>
            <select
              id="team-role"
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "staff")}
              disabled={creating}
              className="flex h-10 w-full rounded-md border border-sakura-petal bg-sakura-paper px-3 text-sm text-sakura-ink"
            >
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {createError && (
            <p className="sm:col-span-2 text-sm text-sakura-warning" role="alert">
              {createError}
            </p>
          )}
          <div className="sm:col-span-2">
            <Button
              type="submit"
              className="bg-sakura-dusk"
              disabled={creating || !email.trim() || !name.trim() || password.length < 8}
            >
              {creating ? "Adding…" : "Add member"}
            </Button>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-sakura-ink">Current members</h2>
        {members.length === 0 ? (
          <div className="rounded-lg border border-dashed border-sakura-petal p-8 text-center text-sm text-sakura-stone">
            No team members yet. You are the only account with dashboard access.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-sakura-petal">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-sakura-petal bg-sakura-surface text-xs uppercase tracking-wide text-sakura-mist">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Added</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} className="border-b border-sakura-petal last:border-0">
                    <td className="px-4 py-3 font-medium text-sakura-ink">{member.name}</td>
                    <td className="px-4 py-3 text-sakura-mist">{member.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={member.role}
                        onChange={(e) =>
                          void handleRoleChange(member, e.target.value as "admin" | "staff")
                        }
                        className="rounded-md border border-sakura-petal bg-sakura-paper px-2 py-1 text-sm"
                      >
                        <option value="staff">{teamRoleLabel("staff")}</option>
                        <option value="admin">{teamRoleLabel("admin")}</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-sakura-mist">
                      {new Date(member.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-sakura-warning/40 text-sakura-warning hover:bg-sakura-warning/10"
                        disabled={pendingDeleteId === member.id}
                        onClick={() => setDeleteTarget(member)}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {rowError && (
          <p className="text-sm text-sakura-warning" role="alert">
            {rowError}
          </p>
        )}
      </section>

      <ConfirmDialog
        open={deleteTarget != null}
        title="Remove team member?"
        description={
          deleteTarget ? (
            <>
              {deleteTarget.name} ({deleteTarget.email}) will lose dashboard access
              immediately.
            </>
          ) : null
        }
        confirmLabel="Remove member"
        destructive
        pending={pendingDeleteId != null}
        onConfirm={() => void confirmDelete()}
        onCancel={() => {
          if (pendingDeleteId == null) {
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
}
