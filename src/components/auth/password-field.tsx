"use client";

import { useId, useState } from "react";

type Props = {
  id?: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  error?: string | null;
};

export function PasswordField({
  id: idProp,
  label,
  value,
  onChange,
  autoComplete = "current-password",
  error,
}: Props) {
  const genId = useId();
  const id = idProp ?? genId;
  const [show, setShow] = useState(false);

  return (
    <div className="w-full space-y-1.5">
      <label htmlFor={id} className="block text-xs font-medium text-zinc-500">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="w-full rounded-2xl border-0 bg-zinc-50 px-4 py-3 pr-12 text-sm text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-200"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-medium text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>
      {error ? (
        <p className="text-xs text-zinc-500" role="status">
          {error}
        </p>
      ) : null}
    </div>
  );
}
