"use client";

type Props = {
  onContinue: () => void;
};

export function SessionEnded({ onContinue }: Props) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-white px-6">
      <p className="text-center text-sm text-zinc-600">
        You&apos;re signed out of this device.
      </p>
      <button
        type="button"
        onClick={onContinue}
        className="mt-6 rounded-2xl bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
      >
        Continue
      </button>
    </div>
  );
}
