import { MapPinOff } from "lucide-react";

/**
 * What a map surface says when Mapbox has no token. The panel around it is the
 * caller's — a drawer, a full-height column and a list pane all want a
 * different box, and only the message inside is the same.
 */
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
