"use client";

/* Canonical chat renderer — every chat view uses this so styling stays
   consistent. Admin messages are visually distinct (black + role label) so
   passengers and pilots always know when the chapter team speaks. */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { useStore, notify, find } from "@/lib/store";
import { chatForRide } from "@/lib/selectors";
import type { ChatMessage, ChatRole } from "@/lib/types";
import { Icon } from "./Icon";

export function ChatMessageRow({
  m,
  myRole,
}: {
  m: ChatMessage;
  myRole: ChatRole;
}) {
  const { t, fmt } = useI18n();
  if (m.from === "system")
    return <div className="msg msg-system">{t(m.tKey || "")}</div>;
  const mine = m.from === myRole;
  if (mine)
    return (
      <>
        <div className="msg msg-mine">{m.text}</div>
        <div className="msg-meta mine">{fmt.time(m.ts)}</div>
      </>
    );
  if (m.from === "admin")
    return (
      <>
        <div className="msg-label">
          <Icon name="shield" /> {t("chat.adminLabel")} · {m.name}
        </div>
        <div className="msg msg-admin">{m.text}</div>
        <div className="msg-meta">{fmt.time(m.ts)}</div>
      </>
    );
  return (
    <>
      <div className="msg-meta">{m.name}</div>
      <div className="msg msg-theirs">{m.text}</div>
      <div className="msg-meta">{fmt.time(m.ts)}</div>
    </>
  );
}

/** Full thread: scrolling messages + input row. Creates the message in the
 * store and pushes a mock notification at the other side(s). */
export function ChatThread({
  rideId,
  myRole,
  myName,
  notifyAudiences,
  notifyHref,
  header,
}: {
  rideId: string;
  myRole: ChatRole;
  myName: string;
  /** who should get the push (e.g. ['client:c1'] when the pilot writes) */
  notifyAudiences: string[];
  /** route to the chat on the RECEIVING side */
  notifyHref: string;
  header?: ReactNode;
}) {
  const { t } = useI18n();
  const db = useStore((s) => s.db)!;
  const update = useStore((s) => s.update);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const chat = chatForRide(db, rideId);
  const count = chat?.messages.length ?? 0;

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [count]);

  function send() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    update((d) => {
      let c = d.chats.find((x) => x.rideId === rideId);
      if (!c) {
        c = { id: `chat-${rideId}`, rideId, messages: [] };
        d.chats.push(c);
      }
      c.messages.push({
        from: myRole,
        name: myName,
        text: trimmed,
        ts: Date.now(),
      });
      const ride = find(d.rides, rideId);
      for (const aud of notifyAudiences) {
        notify(
          d,
          aud,
          "notif.message",
          { name: myName, text: trimmed, when: "" },
          notifyHref,
        );
      }
      void ride;
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {header}
      <div
        className="chat-scroll"
        ref={scrollRef}
      >
        {(chat?.messages || []).map((m, i) => (
          <ChatMessageRow
            key={i}
            m={m}
            myRole={myRole}
          />
        ))}
      </div>
      <div className="chat-input-row">
        <input
          className="input"
          value={text}
          placeholder={t("chat.placeholder")}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
        />
        <button
          type="button"
          className="send-btn"
          aria-label={t("common.send")}
          onClick={send}
        >
          <Icon name="send" />
        </button>
      </div>
    </div>
  );
}
