"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { InlineField } from "@/components/inline-field";
import { useOptimisticSave } from "@/components/use-optimistic-save";
import {
  PROMPT_ANSWER_MAX,
  PROMPT_KEYS,
  PROMPTS_MAX,
  type PromptAnswer,
  type PromptKey,
} from "../schemas";
import { updatePersonProfileAction } from "../actions";
import { useEditor } from "./editor-context";

export function PromptList({ value }: { value: PromptAnswer[] }) {
  const { subject, strings, labels } = useEditor();
  const { shown, persist } = useOptimisticSave(
    value,
    (next) => updatePersonProfileAction({ subject, patch: { prompts: next } }),
    labels,
  );
  const unused = PROMPT_KEYS.filter(
    (key) => !shown.some((prompt) => prompt.key === key),
  );
  const [adding, setAdding] = useState<PromptKey | null>(null);
  const [answer, setAnswer] = useState("");

  const replace = (key: PromptKey, next: string | null) =>
    updatePersonProfileAction({
      subject,
      patch: {
        prompts: next
          ? shown.map((p) => (p.key === key ? { key, answer: next } : p))
          : shown.filter((p) => p.key !== key),
      },
    });

  const add = () => {
    const text = answer.trim();
    if (!adding || !text) return;
    void persist([...shown, { key: adding, answer: text }], shown, false);
    setAdding(null);
    setAnswer("");
  };

  return (
    <div className="grid gap-3">
      {shown.length > 0 ? (
        <ul className="grid gap-3">
          {shown.map((prompt) => (
            <li
              key={prompt.key}
              className="grid gap-1 rounded-2xl bg-canvas-deep p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-ink-soft">
                  {strings.prompts.options[prompt.key]}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-full"
                  aria-label={strings.prompts.remove}
                  onClick={() =>
                    void persist(
                      shown.filter((p) => p.key !== prompt.key),
                      shown,
                    )
                  }
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
              <InlineField
                value={prompt.answer}
                multiline
                required
                maxLength={PROMPT_ANSWER_MAX}
                label={strings.prompts.options[prompt.key]}
                placeholder={strings.prompts.answerPlaceholder}
                labels={labels}
                className="mx-0 w-full text-base"
                onSave={(next) => replace(prompt.key, next)}
              />
            </li>
          ))}
        </ul>
      ) : null}

      {adding ? (
        <form
          className="grid gap-3 rounded-2xl border border-line p-4"
          onSubmit={(event) => {
            event.preventDefault();
            add();
          }}
        >
          <span className="text-xs font-medium text-ink-soft">
            {strings.prompts.options[adding]}
          </span>
          <Textarea
            autoFocus
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            maxLength={PROMPT_ANSWER_MAX}
            placeholder={strings.prompts.answerPlaceholder}
            aria-label={strings.prompts.options[adding]}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey))
                add();
            }}
          />
          <div className="flex justify-end gap-1.25">
            <Button
              type="button"
              variant="ghost"
              className="rounded-full"
              onClick={() => {
                setAdding(null);
                setAnswer("");
              }}
            >
              {strings.prompts.cancel}
            </Button>
            <Button
              type="submit"
              className="rounded-full"
              disabled={!answer.trim()}
            >
              {strings.prompts.save}
            </Button>
          </div>
        </form>
      ) : shown.length < PROMPTS_MAX && unused.length > 0 ? (
        <NativeSelect
          value=""
          aria-label={strings.prompts.add}
          className="rounded-full"
          onChange={(event) => setAdding(event.target.value as PromptKey)}
        >
          <NativeSelectOption
            value=""
            disabled
          >
            {strings.prompts.add}
          </NativeSelectOption>
          {unused.map((key) => (
            <NativeSelectOption
              key={key}
              value={key}
            >
              {strings.prompts.options[key]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      ) : null}
    </div>
  );
}
