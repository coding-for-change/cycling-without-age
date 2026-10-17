"use client";

/// <reference types="react/canary" />
import {
  ViewTransition,
  addTransitionType,
  startTransition,
  useEffect,
  useOptimistic,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { ArrowLeft, Check, Lock, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { Character } from "@/components/character";
import { Button } from "@/components/ui/button";
import type { QuizResult, ReviewedQuestion } from "@/features/training";
import type { AttemptQuestionView } from "@/features/training/grade";
import type { Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { haptics } from "@/lib/native/haptics";
import { cn } from "@/lib/utils";
import { MintConfetti } from "./pilot-confetti";
import { ProgressRing, useCountUp } from "./pilot-progress-ring";

export type QuizFlowStrings = Dictionary["pilot"]["training"]["quiz"];

export type QuizAttemptView = {
  number: number;
  questions: AttemptQuestionView[];
};

export type QuizSubmitResult =
  { ok: true; result: QuizResult } | { ok: false; error: string };

export type QuizFlowProps = {
  initial: QuizAttemptView;
  locked: boolean;
  lockedHref?: string | null;
  passedOn?: string | null;
  onStart?: (number: number) => void;
  submit: (answers: Record<string, string[]>) => Promise<QuizSubmitResult>;
  strings: QuizFlowStrings;
  language: string;
  backHref: string;
  doneHref: string;
  final?: boolean;
  mode: "pilot" | "preview";
};

type Stage = "intro" | "question" | "review" | "result";

const SLIDE = {
  "quiz-next": "quiz-next",
  "quiz-back": "quiz-back",
  "quiz-fade": "quiz-fade",
  default: "none",
} as const;

const NEXT_BUTTON =
  "min-h-12 rounded-full bg-mint-deep px-6 text-white hover:bg-mint-deep/90";

function move(type: keyof typeof SLIDE, update: () => void) {
  startTransition(() => {
    if (type !== "default") addTransitionType(type);
    update();
  });
}

export function QuizFlow({
  initial,
  locked,
  lockedHref,
  passedOn,
  onStart,
  submit,
  strings,
  language,
  backHref,
  doneHref,
  final = true,
  mode,
}: QuizFlowProps) {
  const [attempt, setAttempt] = useState(initial);
  const [stage, setStage] = useState<Stage>("intro");
  const [optimisticStage, setOptimisticStage] = useOptimistic(stage);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [fromReview, setFromReview] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);

  const questions = attempt.questions;
  const total = questions.length;
  const question = questions[index];
  const answered = (id: string) => (answers[id]?.length ?? 0) > 0;
  const allAnswered = questions.every((item) => answered(item.id));

  const begin = () => {
    onStart?.(attempt.number);
    move("quiz-next", () => {
      setIndex(0);
      setStage("question");
    });
  };

  const goTo = (next: number, type: "quiz-next" | "quiz-back") =>
    move(type, () => setIndex(next));

  const forward = () => {
    if (fromReview || index === total - 1)
      move("quiz-next", () => {
        setFromReview(false);
        setStage("review");
      });
    else goTo(index + 1, "quiz-next");
  };

  const backward = () => {
    if (index === 0) move("quiz-back", () => setStage("intro"));
    else goTo(index - 1, "quiz-back");
  };

  const choose = (item: AttemptQuestionView, optionId: string) => {
    haptics.selectionChanged();
    setAnswers((current) => {
      const picked = current[item.id] ?? [];
      const next =
        item.kind === "single"
          ? [optionId]
          : picked.includes(optionId)
            ? picked.filter((id) => id !== optionId)
            : [...picked, optionId];
      return { ...current, [item.id]: next };
    });
  };

  const jumpTo = (target: number) =>
    move("quiz-back", () => {
      setIndex(target);
      setFromReview(true);
      setStage("question");
    });

  const send = () => {
    haptics.tap();
    startTransition(async () => {
      addTransitionType("quiz-next");
      setOptimisticStage("result");
      const outcome = await submit(answers);
      startTransition(() => {
        if (outcome.ok) {
          setResult(outcome.result);
          setStage("result");
        } else {
          haptics.error();
          toast.error(strings.error);
          setStage("review");
        }
      });
    });
  };

  const retry = () => {
    if (!result?.next) return;
    const next = result.next;
    onStart?.(next.number);
    move("quiz-fade", () => {
      setAttempt(next);
      setAnswers({});
      setIndex(0);
      setResult(null);
      setFromReview(false);
      setStage("question");
    });
  };

  if (locked)
    return (
      <QuizFrame
        backHref={backHref}
        strings={strings}
        mode={mode}
      >
        <div className="grid justify-items-center gap-4 rounded-(--r-tile) border border-line bg-canvas px-5 py-10 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-canvas-deep text-ink-soft">
            <Lock
              className="size-6"
              aria-hidden
            />
          </span>
          <h1 className="text-2xl tracking-tight">{strings.lockedTitle}</h1>
          <p className="max-w-sm text-sm text-ink-soft">{strings.lockedBody}</p>
          {lockedHref ? (
            <Button
              asChild
              variant="brand"
              className="min-h-12 rounded-full px-6"
            >
              <Link
                href={lockedHref}
                transitionTypes={["push"]}
              >
                {strings.toLesson}
              </Link>
            </Button>
          ) : null}
        </div>
      </QuizFrame>
    );

  return (
    <QuizFrame
      backHref={backHref}
      strings={strings}
      mode={mode}
      progress={
        optimisticStage === "question" || optimisticStage === "review" ? (
          <SegmentedProgress
            total={total}
            current={optimisticStage === "question" ? index : -1}
            done={questions.map((item) => answered(item.id))}
            label={strings.progress}
          />
        ) : null
      }
    >
      <ViewTransition
        key={
          optimisticStage === "question"
            ? `q-${attempt.number}-${index}`
            : `${optimisticStage}-${attempt.number}`
        }
        enter={SLIDE}
        exit={SLIDE}
        default="none"
      >
        <div>
          {optimisticStage === "intro" ? (
            <Intro
              count={total}
              passedOn={passedOn}
              strings={strings}
              language={language}
              onStart={begin}
            />
          ) : optimisticStage === "question" && question ? (
            <QuestionCard
              question={question}
              index={index}
              total={total}
              picked={answers[question.id] ?? []}
              onChoose={(optionId) => choose(question, optionId)}
              onNext={forward}
              onBack={backward}
              nextLabel={
                fromReview || index === total - 1
                  ? strings.review
                  : strings.next
              }
              strings={strings}
              language={language}
            />
          ) : optimisticStage === "review" ? (
            <Review
              questions={questions}
              answers={answers}
              allAnswered={allAnswered}
              onJump={jumpTo}
              onSubmit={send}
              onBackToQuestions={() =>
                move("quiz-back", () => {
                  setIndex(total - 1);
                  setStage("question");
                })
              }
              strings={strings}
            />
          ) : (
            <Result
              result={result}
              strings={strings}
              language={language}
              doneHref={doneHref}
              final={final}
              onRetry={retry}
            />
          )}
        </div>
      </ViewTransition>
    </QuizFrame>
  );
}

function QuizFrame({
  backHref,
  strings,
  mode,
  progress,
  children,
}: {
  backHref: string;
  strings: QuizFlowStrings;
  mode: "pilot" | "preview";
  progress?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto grid w-full max-w-xl gap-5">
      <div className="flex items-center gap-3">
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="size-11 shrink-0 rounded-full"
        >
          <Link
            href={backHref}
            transitionTypes={["pop"]}
            aria-label={strings.exit}
          >
            <X aria-hidden />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">{progress}</div>
        {mode === "preview" ? (
          <span className="shrink-0 rounded-full bg-mint-tint px-3 py-1 text-xs font-medium text-mint-ink">
            {strings.preview}
          </span>
        ) : null}
      </div>
      {mode === "preview" ? (
        <p className="-mt-2 text-sm text-ink-soft">{strings.previewBody}</p>
      ) : null}
      {children}
    </div>
  );
}

function SegmentedProgress({
  total,
  current,
  done,
  label,
}: {
  total: number;
  current: number;
  done: boolean[];
  label: string;
}) {
  const answered = done.filter(Boolean).length;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={answered}
      className="flex h-2 items-center gap-1.25"
    >
      {done.map((filled, position) => (
        <span
          key={position}
          className={cn(
            "relative h-1.5 flex-1 overflow-hidden rounded-full bg-mint-tint transition-[height] duration-300 motion-reduce:transition-none",
            position === current && "h-2",
          )}
        >
          <span
            className={cn(
              "absolute inset-0 origin-left rounded-full bg-mint transition-transform duration-500 ease-out motion-reduce:transition-none",
              filled ? "scale-x-100" : "scale-x-0",
              position === current && filled && "bg-mint-deep",
            )}
          />
        </span>
      ))}
    </div>
  );
}

function Intro({
  count,
  passedOn,
  strings,
  language,
  onStart,
}: {
  count: number;
  passedOn?: string | null;
  strings: QuizFlowStrings;
  language: string;
  onStart: () => void;
}) {
  return (
    <section className="grid justify-items-center gap-5 rounded-(--r-tile) bg-mint-tint px-5 pt-8 pb-6 text-center">
      <Character
        size={112}
        expression="curieux"
        follow={false}
        className="text-mint"
      />
      <div className="grid gap-2">
        <h1 className="text-2xl tracking-tight md:text-3xl">
          {strings.introTitle}
        </h1>
        <p className="mx-auto max-w-sm text-sm text-ink-soft">
          {formatMessage(strings.introBody, { count }, language)}
        </p>
      </div>
      {passedOn ? (
        <p className="flex items-center gap-2 rounded-full bg-canvas px-4 py-2 text-xs text-ink-soft">
          <Check
            className="size-4 text-mint-ink"
            aria-hidden
          />
          {formatMessage(strings.alreadyPassed, { date: passedOn }, language)}
        </p>
      ) : null}
      <Button
        variant="brand"
        onClick={onStart}
        disabled={count === 0}
        className="min-h-12 w-full max-w-xs rounded-full text-base"
      >
        {strings.start}
      </Button>
    </section>
  );
}

function QuestionCard({
  question,
  index,
  total,
  picked,
  onChoose,
  onNext,
  onBack,
  nextLabel,
  strings,
  language,
}: {
  question: AttemptQuestionView;
  index: number;
  total: number;
  picked: string[];
  onChoose: (optionId: string) => void;
  onNext: () => void;
  onBack: () => void;
  nextLabel: string;
  strings: QuizFlowStrings;
  language: string;
}) {
  const multiple = question.kind === "multiple";
  const ready = picked.length > 0;
  const latest = useRef({ onChoose, onNext, ready, question });
  useEffect(() => {
    latest.current = { onChoose, onNext, ready, question };
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable=true]")) return;
      const { onChoose, onNext, ready, question } = latest.current;
      const number = Number(event.key);
      if (Number.isInteger(number) && number >= 1 && number <= 9) {
        const option = question.options[number - 1];
        if (option) {
          event.preventDefault();
          onChoose(option.id);
        }
      } else if (event.key === "Enter" && ready) {
        event.preventDefault();
        onNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <section className="grid gap-5">
      <div className="grid gap-2 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500">
        <p className="text-xs font-medium tracking-wide text-ink-soft uppercase">
          {formatMessage(
            strings.questionOf,
            { index: index + 1, total },
            language,
          )}
        </p>
        <h1 className="text-xl leading-snug tracking-tight md:text-2xl">
          {question.prompt}
        </h1>
        <p className="text-sm text-ink-soft">
          {multiple ? strings.pickAll : strings.pickOne}
        </p>
      </div>

      <div
        role={multiple ? "group" : "radiogroup"}
        aria-label={question.prompt}
        className="grid gap-2.75"
      >
        {question.options.map((option, position) => {
          const selected = picked.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              role={multiple ? "checkbox" : "radio"}
              aria-checked={selected}
              onClick={() => onChoose(option.id)}
              className={cn(
                "group flex min-h-13 w-full touch-manipulation items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-[background-color,border-color,transform] duration-200 active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100",
                selected
                  ? "border-mint-deep bg-mint-tint"
                  : "border-line bg-canvas hover:border-ink-faint hover:bg-canvas-deep",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "grid size-5.5 shrink-0 place-items-center border-2 transition-colors duration-200 motion-reduce:transition-none",
                  multiple ? "rounded-md" : "rounded-full",
                  selected
                    ? "border-mint-deep bg-mint-deep text-white"
                    : "border-ink-faint bg-canvas",
                )}
              >
                {selected ? (
                  multiple ? (
                    <Check
                      className="size-3.5"
                      strokeWidth={3}
                    />
                  ) : (
                    <span className="size-2 rounded-full bg-white" />
                  )
                ) : null}
              </span>
              <span className="min-w-0 flex-1 text-base">{option.text}</span>
              {position < 9 ? (
                <kbd className="hidden shrink-0 rounded-md border border-line px-1.5 text-xs text-ink-soft pointer-fine:inline">
                  {position + 1}
                </kbd>
              ) : null}
            </button>
          );
        })}
      </div>

      <p className="hidden text-xs text-ink-soft pointer-fine:block">
        {formatMessage(
          strings.keys,
          { max: Math.min(9, question.options.length) },
          language,
        )}
      </p>

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          onClick={onBack}
          className="min-h-12 rounded-full px-4"
        >
          <ArrowLeft aria-hidden />
          {strings.back}
        </Button>
        <Button
          onClick={onNext}
          disabled={!ready}
          className={NEXT_BUTTON}
        >
          {nextLabel}
        </Button>
      </div>
    </section>
  );
}

function optionTexts(question: AttemptQuestionView, ids: string[]) {
  return question.options
    .filter((option) => ids.includes(option.id))
    .map((option) => option.text);
}

function Review({
  questions,
  answers,
  allAnswered,
  onJump,
  onSubmit,
  onBackToQuestions,
  strings,
}: {
  questions: AttemptQuestionView[];
  answers: Record<string, string[]>;
  allAnswered: boolean;
  onJump: (index: number) => void;
  onSubmit: () => void;
  onBackToQuestions: () => void;
  strings: QuizFlowStrings;
}) {
  return (
    <section className="grid gap-5">
      <div className="grid gap-1">
        <h1 className="text-2xl tracking-tight">{strings.reviewTitle}</h1>
        <p className="text-sm text-ink-soft">{strings.reviewBody}</p>
      </div>
      <ol className="grid gap-2">
        {questions.map((question, position) => {
          const texts = optionTexts(question, answers[question.id] ?? []);
          return (
            <li key={question.id}>
              <button
                type="button"
                onClick={() => onJump(position)}
                className="flex w-full items-start gap-3 rounded-2xl border border-line bg-canvas px-4 py-3 text-left transition-colors hover:bg-canvas-deep motion-reduce:transition-none"
              >
                <span
                  className={cn(
                    "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold tabular-nums",
                    texts.length > 0
                      ? "bg-mint text-ink"
                      : "border border-dashed border-ink-faint text-ink-soft",
                  )}
                >
                  {position + 1}
                </span>
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className="line-clamp-2 text-sm font-medium">
                    {question.prompt}
                  </span>
                  <span
                    className={cn(
                      "text-sm",
                      texts.length > 0 ? "text-ink-soft" : "text-red-ink",
                    )}
                  >
                    {texts.length > 0 ? texts.join(" · ") : strings.unanswered}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          onClick={onBackToQuestions}
          className="min-h-12 rounded-full px-4"
        >
          <ArrowLeft aria-hidden />
          {strings.back}
        </Button>
        <Button
          variant="brand"
          onClick={onSubmit}
          disabled={!allAnswered}
          className="min-h-12 rounded-full px-6"
        >
          {strings.submit}
        </Button>
      </div>
    </section>
  );
}

function Result({
  result,
  strings,
  language,
  doneHref,
  final,
  onRetry,
}: {
  result: QuizResult | null;
  strings: QuizFlowStrings;
  language: string;
  doneHref: string;
  final: boolean;
  onRetry: () => void;
}) {
  const announced = useRef(false);

  useEffect(() => {
    if (!result || announced.current) return;
    announced.current = true;
    if (result.passed) haptics.success();
    else haptics.warning();
  }, [result]);

  const ratio =
    result && result.total > 0 ? result.correctCount / result.total : 0;
  const shown = Math.round(useCountUp(result?.correctCount ?? 0, 900));

  if (!result)
    return (
      <section
        className="grid justify-items-center gap-4 py-10 text-center"
        aria-live="polite"
      >
        <span className="relative grid size-32 place-items-center">
          <span className="absolute inset-0 rounded-full border-8 border-mint-tint" />
          <span className="absolute inset-0 animate-spin rounded-full border-8 border-transparent border-t-mint motion-reduce:animate-none" />
        </span>
        <p className="text-sm text-ink-soft">{strings.checking}</p>
      </section>
    );

  const wrong = result.questions.filter((question) => !question.correct);

  return (
    <section
      className="relative grid gap-6"
      aria-live="polite"
    >
      {result.passed ? <MintConfetti fire /> : null}
      <div
        className={cn(
          "relative grid justify-items-center gap-4 overflow-hidden rounded-(--r-tile) px-5 pt-8 pb-6 text-center",
          result.passed ? "bg-mint-tint" : "bg-canvas-deep",
        )}
      >
        <div className="relative">
          <ProgressRing
            value={ratio}
            size={136}
            stroke={10}
            tone={result.passed ? "deep" : "mint"}
            label={formatMessage(
              strings.score,
              { correct: result.correctCount, total: result.total },
              language,
            )}
          >
            <span className="grid justify-items-center leading-none">
              <span className="font-display text-4xl font-bold tabular-nums">
                {shown}
              </span>
              <span className="mt-1 text-xs text-ink-soft">
                {formatMessage(
                  strings.outOf,
                  { total: result.total },
                  language,
                )}
              </span>
            </span>
          </ProgressRing>
          {result.passed ? (
            <Character
              size={96}
              expression="hilare"
              follow={false}
              className="absolute -right-16 -bottom-4 text-mint drop-shadow-sm motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:fade-in motion-safe:delay-500 motion-safe:duration-500 motion-safe:fill-mode-both"
            />
          ) : null}
        </div>
        <div className="grid gap-2 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:delay-300 motion-safe:duration-500 motion-safe:fill-mode-both">
          <h1 className="text-2xl tracking-tight md:text-3xl">
            {result.passed ? strings.passTitle : strings.failTitle}
          </h1>
          <p className="mx-auto max-w-sm text-sm text-ink-soft">
            {result.passed
              ? final
                ? strings.passBody
                : strings.checkpointBody
              : formatMessage(
                  strings.failBody,
                  { correct: result.correctCount, total: result.total },
                  language,
                )}
          </p>
        </div>
        {result.passed ? (
          <Button
            asChild
            variant="brand"
            className="min-h-12 w-full max-w-xs rounded-full text-base"
          >
            <Link
              href={doneHref}
              prefetch
              transitionTypes={[final ? "pop" : "push"]}
            >
              {final ? strings.passNext : strings.continue}
            </Link>
          </Button>
        ) : null}
      </div>

      {wrong.length > 0 ? (
        <ol className="grid gap-3">
          {wrong.map((question, position) => (
            <WrongAnswer
              key={question.id}
              question={question}
              delay={400 + position * 90}
              strings={strings}
            />
          ))}
        </ol>
      ) : null}

      {!result.passed ? (
        <Button
          variant="brand"
          onClick={onRetry}
          disabled={!result.next}
          className="min-h-12 w-full rounded-full text-base sm:mx-auto sm:max-w-xs"
        >
          <RotateCcw aria-hidden />
          {strings.tryAgain}
        </Button>
      ) : null}
    </section>
  );
}

function WrongAnswer({
  question,
  delay,
  strings,
}: {
  question: ReviewedQuestion;
  delay: number;
  strings: QuizFlowStrings;
}) {
  const chosen = question.options.filter((option) =>
    question.selected.includes(option.id),
  );
  const right = question.options.filter((option) => option.correct);
  return (
    <li
      className="grid gap-3 rounded-2xl border border-line bg-canvas p-4 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-500 motion-safe:fill-mode-both"
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="font-medium">{question.prompt}</p>
      <dl className="grid gap-2 text-sm">
        <div className="grid gap-0.5">
          <dt className="text-xs text-ink-soft">{strings.yourAnswer}</dt>
          <dd className="flex items-start gap-2">
            <X
              className="mt-0.5 size-4 shrink-0 text-red-ink"
              aria-hidden
            />
            <span className="text-ink-soft line-through decoration-ink-faint">
              {chosen.length > 0
                ? chosen.map((option) => option.text).join(" · ")
                : strings.noAnswer}
            </span>
          </dd>
        </div>
        <div className="grid gap-0.5">
          <dt className="text-xs text-ink-soft">{strings.rightAnswer}</dt>
          <dd className="flex items-start gap-2">
            <Check
              className="mt-0.5 size-4 shrink-0 text-mint-ink"
              aria-hidden
            />
            <span>{right.map((option) => option.text).join(" · ")}</span>
          </dd>
        </div>
      </dl>
      {question.explanation ? (
        <p className="rounded-xl bg-mint-tint px-3 py-2 text-sm whitespace-pre-line">
          {question.explanation}
        </p>
      ) : null}
    </li>
  );
}
