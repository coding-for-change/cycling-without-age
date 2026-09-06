"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Send, UserRound } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { PersonAvatar } from "@/components/person-avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { inviteChapterUser, previewAvatar } from "@/features/accounts/actions";
import { inviteInput, inviteRole } from "@/features/accounts/schemas";
import { avatarSeed } from "@/lib/avatar-seed";
import { fill } from "@/lib/utils";
import { AdminDrawer, submitOnCmdEnter } from "../../_components/admin-drawer";
import { notify, type NotifyLabels } from "../../_components/action-feedback";
import { TextField } from "../../_components/text-field";

const schema = inviteInput.omit({ chapterId: true });
type FormValues = z.infer<typeof schema>;

const ROLES = inviteRole.options;
type Role = (typeof ROLES)[number];

export type InviteLabels = {
  open: string;
  title: string;
  description: string;
  name: string;
  namePlaceholder: string;
  email: string;
  emailPlaceholder: string;
  role: Record<Role, string>;
  roleHint: Record<Role, string>;
  submit: string;
  sending: string;
  cancel: string;
  sent: string;
  errors: NotifyLabels["errors"];
};

export function InviteDialog({
  chapterId,
  chapterName,
  roleLabel,
  labels,
}: {
  chapterId: string;
  chapterName: string;
  roleLabel: string;
  labels: InviteLabels;
}) {
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", roles: ["pilot"] },
  });
  const email = useWatch({ control: form.control, name: "email" });
  const roles = useWatch({ control: form.control, name: "roles" });

  const submit = form.handleSubmit((data) => {
    startTransition(async () => {
      const result = await inviteChapterUser({ ...data, chapterId });
      notify(result, {
        done: fill(labels.sent, { name: data.name }),
        errors: labels.errors,
      });
      if (!result.ok) return;
      form.reset();
      setOpen(false);
    });
  });

  return (
    <>
      <Button
        variant="outline"
        className="min-h-11"
        onClick={() => setOpen(true)}
      >
        <Send aria-hidden />
        {labels.open}
      </Button>

      <AdminDrawer
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) form.reset();
        }}
        title={labels.title}
        description={fill(labels.description, { chapter: chapterName })}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => setOpen(false)}
            >
              {labels.cancel}
            </Button>
            <Button
              type="submit"
              form={formId}
              disabled={pending || roles.length === 0}
              variant="brand"
              className="min-h-11"
            >
              {pending ? (
                <LoaderCircle
                  aria-hidden
                  className="animate-spin"
                />
              ) : (
                <Send aria-hidden />
              )}
              {pending ? labels.sending : labels.submit}
            </Button>
          </>
        }
      >
        <Form {...form}>
          <form
            id={formId}
            onSubmit={submit}
            onKeyDown={submitOnCmdEnter}
            aria-busy={pending}
            className="grid gap-5"
          >
            <div className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-x-4">
              <AvatarPreview email={email} />
              <div className="grid gap-3.5">
                <TextField
                  control={form.control}
                  name="name"
                  label={labels.name}
                  autoFocus
                  autoComplete="off"
                  placeholder={labels.namePlaceholder}
                />
                <TextField
                  control={form.control}
                  name="email"
                  label={labels.email}
                  type="email"
                  inputMode="email"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder={labels.emailPlaceholder}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="roles"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{roleLabel}</FormLabel>
                  <div className="grid gap-3">
                    {ROLES.map((role) => (
                      <label
                        key={role}
                        className="flex cursor-pointer items-start gap-3 rounded-(--r-card) border border-line p-3.5 transition-colors hover:bg-canvas-deep has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50 has-data-[state=checked]:border-ink has-data-[state=checked]:bg-mint-tint has-data-[state=checked]:hover:bg-mint-tint"
                      >
                        <Checkbox
                          checked={field.value.includes(role)}
                          onCheckedChange={(checked) =>
                            field.onChange(
                              checked
                                ? [...field.value, role]
                                : field.value.filter((r) => r !== role),
                            )
                          }
                          className="mt-px border-ink-faint"
                        />
                        <span className="grid gap-1.25">
                          <span className="text-sm leading-none font-medium">
                            {labels.role[role]}
                          </span>
                          <span className="text-xs text-ink-soft">
                            {labels.roleHint[role]}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </AdminDrawer>
    </>
  );
}

const PREVIEWS = new Map<string, string>();
const PREVIEW_DELAY_MS = 150;

function AvatarPreview({ email }: { email: string }) {
  const seed = avatarSeed(email);
  const [drawn, setDrawn] = useState<{ seed: string; svg: string } | null>(
    null,
  );

  useEffect(() => {
    if (!seed || PREVIEWS.has(seed)) return;
    let stale = false;
    const timer = setTimeout(async () => {
      const svg = await previewAvatar(seed).catch(() => null);
      if (!svg) return;
      if (PREVIEWS.size >= 200) PREVIEWS.clear();
      PREVIEWS.set(seed, svg);
      if (!stale) setDrawn({ seed, svg });
    }, PREVIEW_DELAY_MS);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [seed]);

  const cached = seed ? PREVIEWS.get(seed) : undefined;
  const shown = !seed ? null : cached ? { seed, svg: cached } : drawn;

  return (
    <div className="grid size-13 place-items-center self-center">
      {shown ? (
        <div
          key={shown.seed}
          className="fade-in-0 zoom-in-75 duration-300 motion-safe:animate-in"
        >
          <PersonAvatar
            svg={shown.svg}
            className="size-13"
          />
        </div>
      ) : (
        <span
          aria-hidden
          className="grid size-13 place-items-center rounded-full border border-dashed border-ink-faint text-ink-faint"
        >
          <UserRound className="size-5" />
        </span>
      )}
    </div>
  );
}
