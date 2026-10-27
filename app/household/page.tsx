"use client";

import { Check, Copy, LogOut, Pencil, Plus, Share, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog, PromptDialog } from "@/components/ui/Dialog";
import { SectionTitle, Spinner } from "@/components/ui/misc";
import { TopBar } from "@/components/ui/TopBar";
import { cn } from "@/lib/cn";
import { useSession } from "@/lib/data/hooks";
import { useInvalidate, useStore } from "@/lib/data/provider";
import { toast } from "@/lib/toast";

const AVATARS = ["🍋", "🥕", "🍅", "🧄", "🌶️", "🥑", "🍆", "🧀", "🥐", "🍜", "🫒", "🍓"];
const COLORS = ["#c4342d", "#d97706", "#2f7d4f", "#2563eb", "#7c3aed", "#121212"];

export default function HouseholdPage() {
  const t = useTranslations("household");
  const tc = useTranslations("common");
  const store = useStore();
  const invalidate = useInvalidate();
  const { data: session } = useSession();
  const [name, setName] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [leaving, setLeaving] = useState(false);

  if (!session) {
    return (
      <div>
        <TopBar back="/" title={t("title")} />
        <div className="flex justify-center py-24">
          <Spinner />
        </div>
      </div>
    );
  }

  const { profile, household, households, members } = session;
  const link = typeof window !== "undefined" ? `${window.location.origin}/join/${household.inviteCode}` : "";
  const run = async (fn: () => Promise<void>, ok?: string) => {
    try {
      await fn();
      invalidate("household");
      if (ok) toast(ok);
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      toast(code === "not_found" ? t("codeNotFound") : code === "last_household" ? t("lastHousehold") : t("error"));
    }
  };

  const shareInvite = async () => {
    const text = t("inviteText", { name: household.name, code: household.inviteCode });
    try {
      if (navigator.share) await navigator.share({ title: "Küchen Fusion", text, url: link });
      else {
        await navigator.clipboard.writeText(`${text}\n${link}`);
        toast(tc("linkCopied"));
      }
    } catch {
      /* dismissed */
    }
  };

  return (
    <div className="pb-10">
      <TopBar back="/" title={t("title")} />

      {session.mode === "local" && (
        <div className="mx-4 mt-2 rounded-lg bg-wash p-4 text-[14px] leading-relaxed text-ink-soft">
          <b className="text-ink">{t("localTitle")}</b> {t("localBody")}
        </div>
      )}

      <SectionTitle>{t("profile")}</SectionTitle>
      <div className="px-4">
        <div className="flex items-center gap-3">
          <span
            className="flex size-14 shrink-0 items-center justify-center rounded-full text-[28px]"
            style={{ backgroundColor: `${profile.color}1f`, boxShadow: `inset 0 0 0 2px ${profile.color}` }}
          >
            {profile.avatar}
          </span>
          <form
            className="flex flex-1 items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (name?.trim()) void run(() => store.updateProfile({ displayName: name.trim() }), t("saved"));
              setName(null);
            }}
          >
            <input
              value={name ?? profile.displayName}
              onChange={(e) => setName(e.target.value)}
              onBlur={(e) => e.currentTarget.form?.requestSubmit()}
              aria-label={t("displayName")}
              className="h-11 min-w-0 flex-1 rounded-lg border border-line px-3 text-[17px] outline-none focus:border-ink"
            />
          </form>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {AVATARS.map((a) => (
            <button
              key={a}
              onClick={() => run(() => store.updateProfile({ avatar: a }))}
              className={cn(
                "flex size-10 items-center justify-center rounded-full text-[20px]",
                a === profile.avatar ? "bg-ink/10 ring-2 ring-ink" : "bg-wash",
              )}
            >
              {a}
            </button>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              aria-label={c}
              onClick={() => run(() => store.updateProfile({ color: c }))}
              className="flex size-8 items-center justify-center rounded-full"
              style={{ backgroundColor: c }}
            >
              {c === profile.color && <Check className="size-4 text-white" />}
            </button>
          ))}
        </div>
      </div>

      <SectionTitle
        action={
          <button onClick={() => setRenaming(true)} aria-label={t("rename")} className="rounded-full p-1.5 hover:bg-wash">
            <Pencil className="size-4" />
          </button>
        }
      >
        {household.name}
      </SectionTitle>
      <div className="px-4">
        <p className="text-[14px] text-muted">{t("sharedHint")}</p>
        <div className="mt-4 rounded-xl border border-line p-4">
          <div className="kicker">{t("inviteCode")}</div>
          <div className="mt-1 flex items-center justify-between">
            <span className="font-mono text-[28px] tracking-[0.2em]">{household.inviteCode}</span>
            <button
              aria-label={t("copy")}
              onClick={async () => {
                await navigator.clipboard.writeText(link);
                toast(tc("linkCopied"));
              }}
              className="rounded-full p-2 hover:bg-wash"
            >
              <Copy className="size-5" />
            </button>
          </div>
          <Button variant="solid" className="mt-3 w-full" onClick={shareInvite}>
            <Share className="size-4" />
            {t("invite")}
          </Button>
        </div>

        <h3 className="kicker pt-6 pb-2">{t("members", { count: members.length })}</h3>
        <ul className="divide-y divide-line">
          {members.map((m) => (
            <li key={m.profileId} className="flex items-center gap-3 py-2.5">
              <span className="flex size-9 items-center justify-center rounded-full text-[18px]" style={{ backgroundColor: `${m.color}1f` }}>
                {m.avatar}
              </span>
              <span className="flex-1 text-[16px]">
                {m.displayName}
                {m.profileId === profile.id && <span className="text-muted"> ({t("you")})</span>}
              </span>
              {m.role === "owner" && <span className="text-[12px] text-muted">{t("owner")}</span>}
            </li>
          ))}
        </ul>
      </div>

      <SectionTitle>{t("yourHouseholds")}</SectionTitle>
      <div className="px-4">
        <ul className="divide-y divide-line">
          {households.map((h) => (
            <li key={h.id}>
              <button
                onClick={() => h.id !== household.id && run(() => store.switchHousehold(h.id), t("switched", { name: h.name }))}
                className="flex w-full items-center justify-between py-3 text-left text-[16px]"
              >
                {h.name}
                {h.id === household.id ? <Check className="size-5" /> : <span className="text-[14px] text-muted">{t("switch")}</span>}
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button onClick={() => setJoining(true)}>
            <UserPlus className="size-4" />
            {t("join")}
          </Button>
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" />
            {t("create")}
          </Button>
        </div>
        {households.length > 1 && (
          <button onClick={() => setLeaving(true)} className="mt-6 flex items-center gap-2 text-[14px] text-accent">
            <LogOut className="size-4" />
            {t("leave", { name: household.name })}
          </button>
        )}
      </div>

      <PromptDialog
        open={joining}
        title={t("joinTitle")}
        placeholder="ABC123"
        confirmLabel={t("join")}
        cancelLabel={tc("cancel")}
        onClose={() => setJoining(false)}
        onConfirm={(code) => run(() => store.joinHousehold(code), t("joined"))}
      />
      <PromptDialog
        open={creating}
        title={t("createTitle")}
        placeholder={t("createPlaceholder")}
        confirmLabel={tc("create")}
        cancelLabel={tc("cancel")}
        onClose={() => setCreating(false)}
        onConfirm={(n) => run(() => store.createHousehold(n))}
      />
      <PromptDialog
        open={renaming}
        title={t("rename")}
        initialValue={household.name}
        confirmLabel={tc("save")}
        cancelLabel={tc("cancel")}
        onClose={() => setRenaming(false)}
        onConfirm={(n) => run(() => store.renameHousehold(household.id, n))}
      />
      <ConfirmDialog
        open={leaving}
        title={t("leave", { name: household.name })}
        body={t("leaveBody")}
        confirmLabel={t("leaveConfirm")}
        cancelLabel={tc("cancel")}
        destructive
        onClose={() => setLeaving(false)}
        onConfirm={() => run(() => store.leaveHousehold(household.id))}
      />
    </div>
  );
}
