"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Send } from "lucide-react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { inviteChapterUser } from "@/features/accounts/actions";
import { inviteInput } from "@/features/accounts/schemas";
import { fill } from "@/lib/utils";
import { notify, type NotifyLabels } from "../../_components/action-feedback";

const schema = inviteInput.omit({ chapterId: true });
type FormValues = z.infer<typeof schema>;

const ROLES = schema.shape.role.options;

export type InviteLabels = {
  open: string;
  title: string;
  name: string;
  email: string;
  role: Record<(typeof ROLES)[number], string>;
  submit: string;
  sent: string;
  existing: string;
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
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", role: "pilot" },
  });

  const submit = form.handleSubmit((data) => {
    startTransition(async () => {
      const result = await inviteChapterUser({ ...data, chapterId });
      notify(result, {
        done: fill(
          result.ok && !result.created ? labels.existing : labels.sent,
          {
            name: data.name,
          },
        ),
        errors: labels.errors,
      });
      if (!result.ok) return;
      form.reset();
      setOpen(false);
      router.refresh();
    });
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) form.reset();
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="min-h-11"
        >
          <Send aria-hidden />
          {labels.open}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <Form {...form}>
          <form
            onSubmit={submit}
            aria-busy={pending}
            className="grid gap-5"
          >
            <DialogHeader>
              <DialogTitle>
                {fill(labels.title, { chapter: chapterName })}
              </DialogTitle>
            </DialogHeader>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{labels.name}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      autoComplete="off"
                      className="h-11 border-line text-base"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{labels.email}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      className="h-11 border-line text-base"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{roleLabel}</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="h-11 w-full border-line text-base">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ROLES.map((role) => (
                        <SelectItem
                          key={role}
                          value={role}
                        >
                          {labels.role[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="submit"
                disabled={pending}
                className="min-h-11"
              >
                {labels.submit}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
