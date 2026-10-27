"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { use, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/misc";
import { useSession } from "@/lib/data/hooks";
import { useInvalidate, useStore } from "@/lib/data/provider";
import { toast } from "@/lib/toast";

export default function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const t = useTranslations("household");
  const router = useRouter();
  const store = useStore();
  const invalidate = useInvalidate();
  const { data: session } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const upper = code.toUpperCase();
  const already = session?.households.some((h) => h.inviteCode === upper);

  const join = async () => {
    setBusy(true);
    setError(null);
    try {
      await store.joinHousehold(upper);
      invalidate("household");
      toast(t("joined"));
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error && e.message === "not_found" ? t("codeNotFound") : t("error"));
      setBusy(false);
    }
  };

  return (
    <div className="safe-top flex min-h-[80dvh] flex-col items-center justify-center px-8 text-center">
      <div className="font-fraktur text-[72px] leading-none">KF</div>
      <h1 className="mt-6 font-serif text-[28px] leading-tight">{t("inviteTitle")}</h1>
      <p className="mt-3 text-[15px] text-ink-soft">{t("inviteBody")}</p>
      <div className="mt-6 font-mono text-[30px] tracking-[0.25em]">{upper}</div>
      {!session ? (
        <Spinner className="mt-8" />
      ) : already ? (
        <Button variant="solid" className="mt-8 w-full max-w-xs" onClick={() => router.replace("/household")}>
          {t("alreadyMember")}
        </Button>
      ) : (
        <>
          {session.mode === "local" && <p className="mt-4 text-[13px] text-muted">{t("localJoinHint")}</p>}
          <Button variant="solid" className="mt-8 w-full max-w-xs" disabled={busy} onClick={join}>
            {busy ? <Spinner className="size-4 border-paper/40 border-t-paper" /> : t("join")}
          </Button>
          {error && <p className="mt-3 text-[14px] text-accent">{error}</p>}
        </>
      )}
    </div>
  );
}
