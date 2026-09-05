"use client";

import { Download } from "lucide-react";
import { encode } from "uqr";
import { haptics } from "@/lib/native/haptics";
import { Button } from "@/components/ui/button";

const PX = 1024;

export function DownloadQrButton({
  value,
  fileName,
  label,
}: {
  value: string;
  fileName: string;
  label: string;
}) {
  const download = () => {
    const canvas = document.createElement("canvas");
    canvas.width = PX;
    canvas.height = PX;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const theme = getComputedStyle(document.documentElement);
    const { size, data } = encode(value, { border: 4 });
    const cell = PX / size;

    ctx.fillStyle = theme.getPropertyValue("--canvas").trim();
    ctx.fillRect(0, 0, PX, PX);
    ctx.fillStyle = theme.getPropertyValue("--ink").trim();
    data.forEach((row, y) =>
      row.forEach((dark, x) => {
        if (dark)
          ctx.fillRect(
            Math.floor(x * cell),
            Math.floor(y * cell),
            Math.ceil(cell),
            Math.ceil(cell),
          );
      }),
    );

    canvas.toBlob((blob) => {
      if (!blob) return;
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(href);
      haptics.tap();
    }, "image/png");
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="min-h-11"
      onClick={download}
    >
      <Download aria-hidden />
      {label}
    </Button>
  );
}
