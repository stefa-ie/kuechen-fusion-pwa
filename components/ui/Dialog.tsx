"use client";

import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function PromptDialog({
  open,
  title,
  placeholder,
  initialValue = "",
  confirmLabel,
  cancelLabel,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: ReactNode;
  placeholder?: string;
  initialValue?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: (value: string) => void;
  onClose: () => void;
}) {
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <PromptBody
      title={title}
      placeholder={placeholder}
      initialValue={initialValue}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      onConfirm={onConfirm}
      onClose={onClose}
    />,
    document.body,
  );
}

function PromptBody({
  title,
  placeholder,
  initialValue,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onClose,
}: {
  title: ReactNode;
  placeholder?: string;
  initialValue: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: (value: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  const submit = () => {
    if (!value.trim()) return;
    onConfirm(value.trim());
    onClose();
  };
  return (
    <div className="animate-fade-in fixed inset-0 z-[60] flex items-center justify-center bg-black/35 p-8">
      <form
        className="w-full max-w-[290px] overflow-hidden rounded-2xl bg-paper/95 text-center shadow-2xl backdrop-blur"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="px-4 pt-5 pb-4">
          <div className="mb-3 text-[17px] font-semibold">{title}</div>
          <input
            autoFocus
            value={value}
            placeholder={placeholder}
            onChange={(e) => setValue(e.target.value)}
            className="w-full rounded-md border border-line bg-paper px-2 py-1.5 text-[15px] outline-none focus:border-ink"
          />
        </div>
        <div className="grid grid-cols-2 border-t border-line text-[17px]">
          <button type="button" onClick={onClose} className="border-r border-line py-3">
            {cancelLabel}
          </button>
          <button type="submit" className="py-3 font-semibold">
            {confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  destructive,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: ReactNode;
  body?: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="animate-fade-in fixed inset-0 z-[60] flex items-center justify-center bg-black/35 p-8">
      <div className="w-full max-w-[290px] overflow-hidden rounded-2xl bg-paper text-center shadow-2xl">
        <div className="px-4 pt-5 pb-4">
          <div className="text-[17px] font-semibold">{title}</div>
          {body && <div className="mt-1 text-[14px] text-muted">{body}</div>}
        </div>
        <div className="grid grid-cols-2 border-t border-line text-[17px]">
          <button onClick={onClose} className="border-r border-line py-3">
            {cancelLabel}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={destructive ? "py-3 font-semibold text-accent" : "py-3 font-semibold"}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
