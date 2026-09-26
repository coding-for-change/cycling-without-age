"use client";

import { useSearchParams } from "next/navigation";
import { useId, useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { AppDrawer, submitOnCmdEnter } from "@/components/app-drawer";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { requestPoolAccessAction } from "@/features/fleet/actions";
import { useDrawerParam } from "@/hooks/use-drawer-param";
import type { Dictionary } from "@/lib/i18n";
import { haptics } from "@/lib/native/haptics";

export function PoolJoinDrawer({
  chapters,
  strings,
  common,
}: {
  chapters: { id: string; name: string }[];
  strings: Dictionary["fleet"]["locations"];
  common: Dictionary["fleet"]["common"];
}) {
  const searchParams = useSearchParams();
  const { go } = useDrawerParam();
  const open = searchParams.get("join") === "1" && chapters.length > 0;
  const formId = useId();
  const chapterFieldId = useId();
  const codeId = useId();
  const [chapterId, setChapterId] = useState(chapters[0]?.id ?? "");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const join = strings.join;

  const close = () => {
    setCode("");
    setError(null);
    go((params) => params.delete("join"));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    startTransition(async () => {
      const result = await requestPoolAccessAction({
        code: trimmed,
        chapterId,
      });
      if (!result.ok) {
        haptics.error();
        setError(common.errors[result.error]);
        return;
      }
      haptics.success();
      toast.success(result.status === "approved" ? join.approved : join.sent);
      close();
    });
  };

  return (
    <AppDrawer
      open={open}
      onOpenChange={(next) => {
        if (!next && !pending) close();
      }}
      dismissible={!pending}
      title={join.title}
      description={join.body}
      footer={
        <Button
          type="submit"
          form={formId}
          disabled={pending || code.trim() === ""}
          variant="brand"
          className="min-h-11"
        >
          {join.submit}
        </Button>
      }
    >
      <form
        id={formId}
        onSubmit={submit}
        onKeyDown={submitOnCmdEnter}
        aria-busy={pending}
        className="grid gap-5"
      >
        {chapters.length > 1 ? (
          <Field>
            <FieldLabel htmlFor={chapterFieldId}>{join.chapter}</FieldLabel>
            <NativeSelect
              id={chapterFieldId}
              value={chapterId}
              onChange={(event) => setChapterId(event.target.value)}
              className="h-11 border-line text-base"
            >
              {chapters.map((chapter) => (
                <NativeSelectOption
                  key={chapter.id}
                  value={chapter.id}
                >
                  {chapter.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        ) : null}
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor={codeId}>{join.code}</FieldLabel>
          <Input
            id={codeId}
            autoFocus
            required
            maxLength={32}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder={join.codePlaceholder}
            value={code}
            aria-invalid={error ? true : undefined}
            onChange={(event) => {
              setCode(event.target.value);
              setError(null);
            }}
            className="h-11 border-line font-mono text-base tracking-wider uppercase"
          />
          {error ? <FieldError>{error}</FieldError> : null}
        </Field>
      </form>
    </AppDrawer>
  );
}
