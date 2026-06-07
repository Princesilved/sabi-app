"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useBusiness } from "@/components/dashboard/business-context";
import { toast } from "sonner";
import { X, UserPlus, Info, Trash2 } from "lucide-react";

const ROLE_INFO: Record<
  string,
  { label: string; tagline: string; canDo: string[]; cannotDo: string[] }
> = {
  manager: {
    label: "Manager",
    tagline: "Runs the business day-to-day. Trusted #2.",
    canDo: [
      "See all financials (revenue, profit, expenses)",
      "Log and edit transactions",
      "Manage inventory and customers",
      "Use AI assistant and generate adverts",
      "Invite staff",
    ],
    cannotDo: ["Manage billing", "Delete the business"],
  },
  accountant: {
    label: "Accountant",
    tagline: "Handles the money. Sees the full financial picture.",
    canDo: [
      "See all revenue, profit, and expenses",
      "Log and edit transactions",
      "Record customer debt payments",
      "Upload and confirm receipts",
      "View inventory value (read-only)",
    ],
    cannotDo: ["Edit inventory stock", "Invite/remove team", "Manage billing"],
  },
  sales_rep: {
    label: "Sales Rep",
    tagline: "Sells and serves customers on the floor.",
    canDo: [
      "Log their own sales",
      "Add and manage customers",
      "Record customer payments",
      "See what's in stock to sell",
    ],
    cannotDo: [
      "See total revenue, profit, or expenses",
      "Edit inventory or prices",
    ],
  },
  marketer: {
    label: "Marketer",
    tagline: "Promotes the business. Never sees the money.",
    canDo: [
      "See what products are in stock to promote",
      "Generate adverts for WhatsApp, Instagram, etc.",
      "Use the AI assistant for marketing ideas",
    ],
    cannotDo: [
      "See ANY money — no revenue, profit, expenses, or debt",
      "Log transactions",
      "Edit inventory or customers",
    ],
  },
  inventory_clerk: {
    label: "Inventory Clerk",
    tagline: "Manages stock. Nothing financial.",
    canDo: [
      "Add and edit inventory items",
      "Adjust stock quantities",
      "Upload supplier delivery notes",
    ],
    cannotDo: ["See any financials", "See customers", "Log sales or expenses"],
  },
  viewer: {
    label: "Viewer",
    tagline: "Read-only access. Good for investors or assistants.",
    canDo: ["View dashboard, financials, inventory, and customers"],
    cannotDo: ["Edit or change anything at all"],
  },
};

const ROLE_ORDER = [
  "manager",
  "accountant",
  "sales_rep",
  "marketer",
  "inventory_clerk",
  "viewer",
];

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  ...Object.fromEntries(
    Object.entries(ROLE_INFO).map(([k, v]) => [k, v.label])
  ),
};

export default function TeamPage() {
  const { businessId, can } = useBusiness();
  const team = useQuery(
    api.team.list,
    businessId ? { businessId } : "skip"
  );
  const [inviteOpen, setInviteOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  const changeRole = useMutation(api.team.changeRole);
  const removeMember = useMutation(api.team.removeMember);
  const revokeInvite = useMutation(api.team.revokeInvite);

  if (!businessId) return null;

  if (!can("invite_members")) {
    return (
      <div className="px-6 lg:px-10 py-8 max-w-3xl">
        <h1 className="font-display text-4xl mb-3">Team</h1>
        <p className="text-[var(--text-muted)]">
          Your role doesn't include managing the team. Ask the business owner if
          you need access.
        </p>
      </div>
    );
  }

  return (
    <div className="px-6 lg:px-10 py-8 max-w-4xl">
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-jollof font-medium mb-2">
            Team
          </div>
          <h1 className="font-display text-5xl leading-none">
            Who runs <span className="italic">this place.</span>
          </h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setInfoOpen(true)} className="sabi-btn-secondary">
            <Info className="w-4 h-4" /> What can each role do?
          </button>
          <button onClick={() => setInviteOpen(true)} className="sabi-btn-jollof">
            <UserPlus className="w-4 h-4" /> Invite
          </button>
        </div>
      </div>

      {/* Active members */}
      <div className="sabi-card mb-6">
        <h2 className="font-display text-2xl mb-4">Members</h2>
        <div className="space-y-2">
          {team?.members.map((m: any) => (
            <div
              key={m.membershipId}
              className="flex items-center justify-between py-3"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <div>
                <div className="font-medium">{m.name || m.email}</div>
                <div className="text-xs text-[var(--text-muted)]">{m.email}</div>
              </div>
              <div className="flex items-center gap-3">
                {m.role === "owner" ? (
                  <span className="px-3 py-1.5 rounded-full text-xs bg-jollof/10 text-jollof font-medium">
                    Owner
                  </span>
                ) : (
                  <>
                    <select
                      value={m.role}
                      onChange={async (e) => {
                        await changeRole({
                          membershipId: m.membershipId as any,
                          role: e.target.value,
                        });
                        toast.success("Role updated");
                      }}
                      className="sabi-input !py-1.5 !px-3 text-sm !w-auto"
                    >
                      {ROLE_ORDER.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                    {can("remove_members") && (
                      <button
                        onClick={async () => {
                          if (confirm(`Remove ${m.name || m.email}?`)) {
                            await removeMember({ membershipId: m.membershipId as any });
                            toast.success("Member removed");
                          }
                        }}
                        className="p-2 text-jollof hover:opacity-70"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending invites */}
      {team && team.pending.length > 0 && (
        <div className="sabi-card">
          <h2 className="font-display text-2xl mb-4">Pending invites</h2>
          <div className="space-y-2">
            {team.pending.map((p: any) => (
              <div
                key={p.inviteId}
                className="flex items-center justify-between py-3"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <div>
                  <div className="font-medium">{p.email}</div>
                  <div className="text-xs text-[var(--text-muted)]">
                    Invited as {ROLE_LABELS[p.role]} · waiting for them to sign up
                  </div>
                </div>
                <button
                  onClick={async () => {
                    await revokeInvite({ inviteId: p.inviteId as any });
                    toast.success("Invite revoked");
                  }}
                  className="text-sm text-jollof hover:underline"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {inviteOpen && (
        <InviteDialog businessId={businessId} onClose={() => setInviteOpen(false)} />
      )}
      {infoOpen && <RoleInfoDialog onClose={() => setInfoOpen(false)} />}
    </div>
  );
}

function InviteDialog({
  businessId,
  onClose,
}: {
  businessId: any;
  onClose: () => void;
}) {
  const invite = useMutation(api.team.invite);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("sales_rep");
  const [submitting, setSubmitting] = useState(false);

  const info = ROLE_INFO[role];

  const handleSubmit = async () => {
    if (!email.includes("@")) return toast.error("Enter a valid email");
    setSubmitting(true);
    try {
      const res = await invite({ businessId, email: email.trim(), role });
      toast.success(
        res.linked
          ? "Added — they already have a Sabi account"
          : "Invite sent. They'll join when they sign up with this email."
      );
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm overflow-y-auto py-8">
      <div
        className="rounded-2xl w-full max-w-md p-6 shadow-2xl animate-rise"
        style={{ background: "var(--paper)" }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-3xl">
            Invite <span className="italic text-jollof">someone</span>
          </h2>
          <button onClick={onClose} className="text-[var(--text-muted)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          <label className="sabi-label">Their email</label>
          <input
            type="email"
            className="sabi-input"
            placeholder="person@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
          <p className="text-xs text-[var(--text-muted)] mt-2">
            They'll sign up with this email and automatically join your business.
          </p>
        </div>

        <div className="mb-4">
          <label className="sabi-label">Role</label>
          <select
            className="sabi-input"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            {ROLE_ORDER.map((r) => (
              <option key={r} value={r}>
                {ROLE_INFO[r].label}
              </option>
            ))}
          </select>
        </div>

        {/* Role explanation */}
        {info && (
          <div
            className="rounded-xl p-4 mb-6 text-sm"
            style={{ background: "var(--bg-deep)" }}
          >
            <div className="font-medium mb-1">{info.label}</div>
            <p className="text-[var(--text-muted)] mb-3">{info.tagline}</p>
            <div className="mb-2">
              <span className="text-[var(--moss)] font-medium text-xs uppercase tracking-wide">
                Can do
              </span>
              <ul className="mt-1 space-y-0.5">
                {info.canDo.map((c) => (
                  <li key={c} className="text-xs">
                    ✓ {c}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <span className="text-jollof font-medium text-xs uppercase tracking-wide">
                Cannot
              </span>
              <ul className="mt-1 space-y-0.5">
                {info.cannotDo.map((c) => (
                  <li key={c} className="text-xs">
                    ✕ {c}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="sabi-btn-secondary flex-1">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="sabi-btn-primary flex-1"
          >
            {submitting ? "Sending…" : "Send invite"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RoleInfoDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm overflow-y-auto py-8">
      <div
        className="rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-rise"
        style={{ background: "var(--paper)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-3xl">
            What each <span className="italic text-jollof">role does</span>
          </h2>
          <button onClick={onClose} className="text-[var(--text-muted)]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-[var(--text-muted)] mb-5">
          New to running a team? Here's a plain-language guide. Give people only
          the access they need — for example, a marketer should never see your
          total revenue.
        </p>
        <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-2">
          {ROLE_ORDER.map((r) => {
            const info = ROLE_INFO[r];
            return (
              <div
                key={r}
                className="rounded-xl p-4"
                style={{ background: "var(--bg-deep)" }}
              >
                <div className="font-medium">{info.label}</div>
                <p className="text-[var(--text-muted)] text-sm mb-2">
                  {info.tagline}
                </p>
                <div className="text-xs space-y-0.5">
                  {info.canDo.map((c) => (
                    <div key={c} className="text-[var(--moss)]">
                      ✓ {c}
                    </div>
                  ))}
                  {info.cannotDo.map((c) => (
                    <div key={c} className="text-jollof">
                      ✕ {c}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <button onClick={onClose} className="sabi-btn-primary w-full mt-5">
          Got it
        </button>
      </div>
    </div>
  );
}
