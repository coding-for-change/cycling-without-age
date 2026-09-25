"use client";

import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  TOOL_ICON,
  TOOL_SHORTCUT,
  type MarkdownToolLabels,
  type ToolKey,
} from "./tools";

export function MarkdownToolbar({
  labels,
  run,
  disabled,
  size = "icon-xs",
}: {
  labels: MarkdownToolLabels;
  run: (tool: ToolKey) => void;
  disabled?: boolean;
  size?: ComponentProps<typeof Button>["size"];
}) {
  return (Object.keys(TOOL_ICON) as ToolKey[]).map((tool) => {
    const Icon = TOOL_ICON[tool];
    const keys = TOOL_SHORTCUT[tool];
    return (
      <Tooltip key={tool}>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size={size}
            disabled={disabled}
            aria-label={labels[tool]}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => run(tool)}
          >
            <Icon aria-hidden />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="flex items-center gap-2">
          {labels[tool]}
          {keys ? (
            <KbdGroup>
              {keys.map((key) => (
                <Kbd key={key}>{key}</Kbd>
              ))}
            </KbdGroup>
          ) : null}
        </TooltipContent>
      </Tooltip>
    );
  });
}
