"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { haptics } from "@/lib/native/haptics";

export function DoneButton({
  label,
  thanks,
}: {
  label: string;
  thanks: string;
}) {
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="brand"
      size="hero"
      onClick={() => {
        haptics.success();
        toast.success(thanks);
        router.push("/pilot");
      }}
    >
      <Check aria-hidden />
      {label}
    </Button>
  );
}
