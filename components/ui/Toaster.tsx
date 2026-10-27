"use client";

import { useEffect } from "react";
import { useToast } from "@/lib/toast";

export function Toaster() {
  const { message, id, hide } = useToast();

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(hide, 2600);
    return () => clearTimeout(t);
  }, [message, id, hide]);

  if (!message) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-[70] flex justify-center px-3">
      <div
        key={id}
        role="status"
        className="animate-fade-in w-full max-w-xl rounded-lg bg-ink/90 px-4 py-3 text-[15px] text-paper shadow-lg"
      >
        {message}
      </div>
    </div>
  );
}
