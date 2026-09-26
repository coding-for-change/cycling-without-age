"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react";
import { SendHorizontal, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { haptics } from "@/lib/native/haptics";
import { fill } from "@/lib/utils";
import { typingAction, type ChatActionError } from "../actions";
import { MAX_MESSAGE_CHARS, type ChatMessageView } from "../schemas";
import { getDraft, setDraft } from "./chat-store";
import {
  HighlightedTextarea,
  MarkdownToolbar,
  useMarkdownTools,
  type MarkdownToolLabels,
} from "@/components/markdown-editor";
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

export function ChatComposer({
  conversationId,
  senderId,
  replyTo,
  replyName,
  onCancelReply,
  disabled = false,
  strings,
  markdown,
  errors,
}: {
  conversationId: string;
  senderId: string;
  replyTo: ChatMessageView | null;
  replyName: string | null;
  onCancelReply: () => void;
  disabled?: boolean;
  strings: ChatComposerStrings;
  markdown: MarkdownToolLabels;
  errors: ChatErrorStrings;
}) {
  const field = useRef<HTMLTextAreaElement>(null);
  const lastTyping = useRef(0);
  const fine = usePointerFine();
  const [value, setValue] = useState(() => getDraft(conversationId));

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

  const { run: runTool, shortcut } = useMarkdownTools(
    field,
    value,
    change,
    markdown.link,
  );

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (shortcut(event)) return;
    if (event.key === "Enter" && !event.shiftKey && fine) {
      event.preventDefault();
      void send();
    }
  };

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
        <HighlightedTextarea
          ref={field}
          control={InputGroupTextarea}
          rows={1}
          value={value}
          onChange={change}
          disabled={disabled}
          maxLength={MAX_MESSAGE_CHARS}
          onKeyDown={onKeyDown}
          placeholder={strings.placeholder}
          aria-label={strings.placeholder}
          fieldClassName={FIELD_CLASS}
          className="max-h-36 field-sizing-fixed"
        />

        <InputGroupAddon
          align="block-end"
          className="justify-between gap-2 pt-0"
        >
          <ButtonGroup className="-ml-2 hidden md:flex">
            <MarkdownToolbar
              labels={markdown}
              run={runTool}
              disabled={disabled}
              size="icon-sm"
            />
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
