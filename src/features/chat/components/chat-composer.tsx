"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type UIEvent,
} from "react";
import {
  Bold,
  Code,
  Italic,
  Link2,
  List,
  Quote,
  SendHorizontal,
  Strikethrough,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { haptics } from "@/lib/native/haptics";
import { cn, fill } from "@/lib/utils";
import { typingAction, type ChatActionError } from "../actions";
import { MAX_MESSAGE_CHARS, type ChatMessageView } from "../schemas";
import { getDraft, setDraft } from "./chat-store";
import { HIGHLIGHT_CLASS, tokenize } from "./composer-highlight";
import { stripPreview } from "./preview";
import { sendChatMessage } from "./send-message";
import type { ChatComposerStrings, ChatErrorStrings } from "./strings";

const TYPING_INTERVAL_MS = 3_000;
const FIELD_CLASS =
  "w-full min-h-0 resize-none px-3 py-2.5 text-base leading-relaxed whitespace-pre-wrap break-words md:text-sm";

const pointerFine = () => window.matchMedia("(pointer: fine)");

const subscribePointer = (onChange: () => void) => {
  const query = pointerFine();
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

const usePointerFine = () =>
  useSyncExternalStore(
    subscribePointer,
    () => pointerFine().matches,
    () => false,
  );

type ToolKey =
  "bold" | "italic" | "strike" | "code" | "link" | "list" | "quote";

const TOOL_ICON: Record<ToolKey, LucideIcon> = {
  bold: Bold,
  italic: Italic,
  strike: Strikethrough,
  code: Code,
  link: Link2,
  list: List,
  quote: Quote,
};

const TOOL_SHORTCUT: Partial<Record<ToolKey, string[]>> = {
  bold: ["⌘", "B"],
  italic: ["⌘", "I"],
  strike: ["⌘", "⇧", "X"],
};

const WRAP: Partial<Record<ToolKey, [string, string]>> = {
  bold: ["**", "**"],
  italic: ["_", "_"],
  strike: ["~~", "~~"],
  code: ["`", "`"],
};

const PREFIX: Partial<Record<ToolKey, string>> = {
  list: "- ",
  quote: "> ",
};

export function ChatComposer({
  conversationId,
  senderId,
  replyTo,
  replyName,
  onCancelReply,
  disabled = false,
  strings,
  errors,
}: {
  conversationId: string;
  senderId: string;
  replyTo: ChatMessageView | null;
  replyName: string | null;
  onCancelReply: () => void;
  disabled?: boolean;
  strings: ChatComposerStrings;
  errors: ChatErrorStrings;
}) {
  const field = useRef<HTMLTextAreaElement>(null);
  const mirror = useRef<HTMLPreElement>(null);
  const lastTyping = useRef(0);
  const fine = usePointerFine();
  const [value, setValue] = useState(() => getDraft(conversationId));

  const grow = () => {
    const element = field.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  };

  useEffect(grow, [value]);

  useEffect(
    () => () => {
      setDraft(conversationId, field.current?.value ?? "");
    },
    [conversationId],
  );

  const signalTyping = (next: string) => {
    if (!next.trim()) {
      lastTyping.current = 0;
      void typingAction({ conversationId, typing: false });
      return;
    }
    const now = Date.now();
    if (now - lastTyping.current < TYPING_INTERVAL_MS) return;
    lastTyping.current = now;
    void typingAction({ conversationId, typing: true });
  };

  const change = (next: string) => {
    setValue(next);
    signalTyping(next);
  };

  const errorMessage = (error: ChatActionError) =>
    error === "frozen"
      ? errors.frozen
      : error === "announcementOnly"
        ? errors.announcementOnly
        : error === "tooLong"
          ? errors.tooLong
          : error === "rateLimited"
            ? errors.rateLimited
            : error === "notMember"
              ? errors.notMember
              : errors.generic;

  const send = async () => {
    const text = value.trim();
    if (!text || disabled) return;

    haptics.tap();
    setValue("");
    lastTyping.current = 0;
    void typingAction({ conversationId, typing: false });
    onCancelReply();

    const error = await sendChatMessage({
      conversationId,
      senderId,
      text,
      replyTo: replyTo
        ? { id: replyTo.id, senderId: replyTo.senderId, text: replyTo.text }
        : null,
    });
    if (error) toast.error(errorMessage(error));
  };

  const surround = (open: string, close: string) => {
    const element = field.current;
    if (!element) return;
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const next = `${value.slice(0, start)}${open}${value.slice(start, end)}${close}${value.slice(end)}`;
    change(next);
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(start + open.length, end + open.length);
    });
  };

  const prefixLines = (prefix: string) => {
    const element = field.current;
    if (!element) return;
    const start = value.lastIndexOf("\n", element.selectionStart - 1) + 1;
    const endOfLine = value.indexOf("\n", element.selectionEnd);
    const end = endOfLine === -1 ? value.length : endOfLine;
    const block = value
      .slice(start, end)
      .split("\n")
      .map((line) => `${prefix}${line}`)
      .join("\n");
    const next = `${value.slice(0, start)}${block}${value.slice(end)}`;
    change(next);
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(start + block.length, start + block.length);
    });
  };

  const insertLink = () => {
    const element = field.current;
    if (!element) return;
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const label = value.slice(start, end) || strings.link;
    const next = `${value.slice(0, start)}[${label}](https://)${value.slice(end)}`;
    change(next);
    const caret = start + label.length + 3 + "https://".length;
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(caret, caret);
    });
  };

  const runTool = (tool: ToolKey) => {
    const wrap = WRAP[tool];
    if (wrap) return surround(wrap[0], wrap[1]);
    const prefix = PREFIX[tool];
    if (prefix) return prefixLines(prefix);
    insertLink();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const meta = event.metaKey || event.ctrlKey;
    if (meta && !event.shiftKey && event.key.toLowerCase() === "b") {
      event.preventDefault();
      runTool("bold");
      return;
    }
    if (meta && !event.shiftKey && event.key.toLowerCase() === "i") {
      event.preventDefault();
      runTool("italic");
      return;
    }
    if (meta && event.shiftKey && event.key.toLowerCase() === "x") {
      event.preventDefault();
      runTool("strike");
      return;
    }
    if (event.key === "Enter" && !event.shiftKey && fine) {
      event.preventDefault();
      void send();
    }
  };

  const syncScroll = (event: UIEvent<HTMLTextAreaElement>) => {
    if (mirror.current)
      mirror.current.scrollTop = event.currentTarget.scrollTop;
  };

  const tokens = tokenize(value);

  return (
    <div className="flex flex-col gap-2 px-4 pt-1 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      {replyTo ? (
        <div className="flex items-start gap-2 rounded-lg bg-canvas-deep px-3 py-2">
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-medium text-ink">
              {fill(strings.replyingTo, { name: replyName ?? "" })}
            </span>
            <span className="block truncate text-2sm text-ink-soft">
              {stripPreview(replyTo.text, 120)}
            </span>
          </span>
          <button
            type="button"
            onClick={onCancelReply}
            aria-label={strings.cancelReply}
            className="grid size-6 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-canvas-deeper hover:text-ink"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : null}

      <InputGroup className="flex-col items-stretch rounded-2xl border-0 bg-canvas-deep shadow-none transition-colors has-[[data-slot=input-group-control]:focus-visible]:bg-canvas-deeper has-[[data-slot=input-group-control]:focus-visible]:ring-0">
        <div className="relative w-full">
          <pre
            ref={mirror}
            aria-hidden
            className={cn(
              FIELD_CLASS,
              "pointer-events-none absolute inset-0 overflow-hidden font-sans text-ink",
            )}
          >
            {tokens.map((token, index) => (
              <span
                key={index}
                className={HIGHLIGHT_CLASS[token.type]}
              >
                {token.value}
              </span>
            ))}
            {"\n"}
          </pre>
          <InputGroupTextarea
            ref={field}
            rows={1}
            value={value}
            disabled={disabled}
            maxLength={MAX_MESSAGE_CHARS}
            onChange={(event) => change(event.target.value)}
            onKeyDown={onKeyDown}
            onScroll={syncScroll}
            placeholder={strings.placeholder}
            aria-label={strings.placeholder}
            className={cn(
              FIELD_CLASS,
              "relative max-h-36 overflow-y-auto bg-transparent text-transparent caret-ink field-sizing-fixed placeholder:text-ink-faint",
            )}
          />
        </div>

        <InputGroupAddon
          align="block-end"
          className="justify-between gap-2 pt-0"
        >
          <ButtonGroup className="-ml-2 hidden md:flex">
            {(Object.keys(TOOL_ICON) as ToolKey[]).map((tool) => {
              const Icon = TOOL_ICON[tool];
              const shortcut = TOOL_SHORTCUT[tool];

              return (
                <Tooltip key={tool}>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={disabled}
                      aria-label={strings[tool]}
                      onClick={() => runTool(tool)}
                    >
                      <Icon aria-hidden />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="flex items-center gap-2">
                    {strings[tool]}
                    {shortcut ? (
                      <KbdGroup>
                        {shortcut.map((key) => (
                          <Kbd key={key}>{key}</Kbd>
                        ))}
                      </KbdGroup>
                    ) : null}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </ButtonGroup>

          <Button
            type="button"
            variant="brand"
            size="icon"
            aria-label={strings.send}
            disabled={disabled || value.trim().length === 0}
            onClick={() => void send()}
            className="ml-auto rounded-full"
          >
            <SendHorizontal aria-hidden />
          </Button>
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}
