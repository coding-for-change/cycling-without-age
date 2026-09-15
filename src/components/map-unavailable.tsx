import { MapPinOff } from "lucide-react";

export function MapUnavailable({ label }: { label: string }) {
  return (
    <p className="max-w-xs text-sm text-ink-soft">
      <MapPinOff
        className="mx-auto mb-3 size-6"
        aria-hidden
      />
      {label}
    </p>
  );
}
