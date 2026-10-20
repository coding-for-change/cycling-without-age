import type { QuestionKind, QuizAnswers } from "./schemas";

export type QuizOption = {
  id: string;
  position: number;
  text: string;
  correct: boolean;
};

export type QuizQuestion = {
  id: string;
  position: number;
  kind: QuestionKind;
  prompt: string;
  explanation: string | null;
  options: QuizOption[];
};

export type DrawnQuestion = { q: string; o: string[] };

export type AttemptOptionView = { id: string; text: string };

export type AttemptQuestionView = {
  id: string;
  kind: QuestionKind;
  prompt: string;
  options: AttemptOptionView[];
};

export type QuestionIssue =
  | "promptMissing"
  | "tooFewOptions"
  | "optionTextMissing"
  | "noCorrect"
  | "singleNeedsOneCorrect";

export function questionIssues(question: {
  kind: QuestionKind;
  prompt: string;
  options: { text: string; correct: boolean }[];
}): QuestionIssue[] {
  const issues: QuestionIssue[] = [];
  if (!question.prompt.trim()) issues.push("promptMissing");
  if (question.options.length < 2) issues.push("tooFewOptions");
  if (question.options.some((option) => !option.text.trim()))
    issues.push("optionTextMissing");
  const correct = question.options.filter((option) => option.correct).length;
  if (correct === 0) issues.push("noCorrect");
  else if (question.kind === "single" && correct !== 1)
    issues.push("singleNeedsOneCorrect");
  return issues;
}

export const isPlayable = (question: QuizQuestion) =>
  questionIssues(question).length === 0;

function hashSeed(seed: string) {
  let hash = 1779033703 ^ seed.length;
  for (let index = 0; index < seed.length; index++) {
    hash = Math.imul(hash ^ seed.charCodeAt(index), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }
  return hash >>> 0;
}

export function seededRandom(seed: string) {
  let state = hashSeed(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: readonly T[], random: () => number) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

const byPosition = (a: { position: number }, b: { position: number }) =>
  a.position - b.position;

export function drawQuestions(
  questions: readonly QuizQuestion[],
  settings: { drawCount: number | null; shuffle: boolean },
  seed: string,
): DrawnQuestion[] {
  const random = seededRandom(seed);
  const pool = questions.filter(isPlayable).sort(byPosition);
  const count =
    settings.drawCount && settings.drawCount < pool.length
      ? settings.drawCount
      : pool.length;

  let picked = pool;
  if (count < pool.length) {
    const chosen = new Set(
      shuffled(pool, random)
        .slice(0, count)
        .map((question) => question.id),
    );
    picked = pool.filter((question) => chosen.has(question.id));
  }
  if (settings.shuffle) picked = shuffled(picked, random);

  return picked.map((question) => {
    const options = [...question.options].sort(byPosition);
    return {
      q: question.id,
      o: (settings.shuffle ? shuffled(options, random) : options).map(
        (option) => option.id,
      ),
    };
  });
}

export function toAttemptView(
  order: readonly DrawnQuestion[],
  questions: readonly QuizQuestion[],
): AttemptQuestionView[] {
  const byId = new Map(questions.map((question) => [question.id, question]));
  return order.flatMap(({ q, o }) => {
    const question = byId.get(q);
    if (!question) return [];
    const options = new Map(
      question.options.map((option) => [option.id, option]),
    );
    const ordered = [
      ...o.flatMap((optionId) => {
        const option = options.get(optionId);
        return option ? [option] : [];
      }),
      ...[...question.options]
        .sort(byPosition)
        .filter((option) => !o.includes(option.id)),
    ];
    return [
      {
        id: question.id,
        kind: question.kind,
        prompt: question.prompt,
        options: ordered.map((option) => ({
          id: option.id,
          text: option.text,
        })),
      },
    ];
  });
}

export type GradedQuestion = {
  questionId: string;
  correct: boolean;
  selected: string[];
  correctOptionIds: string[];
};

export type Grade = {
  questions: GradedQuestion[];
  correctCount: number;
  total: number;
  passed: boolean;
};

export function gradeAttempt(
  order: readonly DrawnQuestion[],
  questions: readonly QuizQuestion[],
  answers: QuizAnswers,
): Grade {
  const byId = new Map(questions.map((question) => [question.id, question]));
  const graded = order.flatMap(({ q }) => {
    const question = byId.get(q);
    if (!question) return [];
    const known = new Set(question.options.map((option) => option.id));
    const selected = [...new Set(answers[q] ?? [])].filter((optionId) =>
      known.has(optionId),
    );
    const correctOptionIds = question.options
      .filter((option) => option.correct)
      .map((option) => option.id);
    const correct =
      correctOptionIds.length > 0 &&
      selected.length === correctOptionIds.length &&
      correctOptionIds.every((optionId) => selected.includes(optionId)) &&
      (question.kind === "multiple" || selected.length === 1);
    return [{ questionId: q, correct, selected, correctOptionIds }];
  });
  const correctCount = graded.filter((question) => question.correct).length;
  return {
    questions: graded,
    correctCount,
    total: graded.length,
    passed: correctCount === graded.length,
  };
}
