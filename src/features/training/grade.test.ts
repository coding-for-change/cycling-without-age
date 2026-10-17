import {
  drawQuestions,
  gradeAttempt,
  questionIssues,
  toAttemptView,
  type QuizQuestion,
} from "./grade";

const question = (
  id: string,
  position: number,
  kind: "single" | "multiple",
  correct: string[],
  optionIds = ["x", "y", "z"],
): QuizQuestion => ({
  id,
  position,
  kind,
  prompt: `Prompt ${id}`,
  explanation: `Because ${id}`,
  options: optionIds.map((option, index) => ({
    id: `${id}-${option}`,
    position: index,
    text: option,
    correct: correct.includes(option),
  })),
});

const quiz = [
  question("q1", 0, "single", ["x"]),
  question("q2", 1, "multiple", ["x", "z"]),
  question("q3", 2, "single", ["y"]),
  question("q4", 3, "single", ["z"]),
];

const noShuffle = { drawCount: null, shuffle: false };

describe("questionIssues", () => {
  it("accepts a valid single and multiple choice question", () => {
    expect(questionIssues(quiz[0])).toEqual([]);
    expect(questionIssues(quiz[1])).toEqual([]);
  });

  it("names what is missing", () => {
    expect(
      questionIssues({
        kind: "single",
        prompt: " ",
        options: [{ text: "", correct: false }],
      }),
    ).toEqual([
      "promptMissing",
      "tooFewOptions",
      "optionTextMissing",
      "noCorrect",
    ]);
    expect(
      questionIssues({
        kind: "single",
        prompt: "Which?",
        options: [
          { text: "a", correct: true },
          { text: "b", correct: true },
        ],
      }),
    ).toEqual(["singleNeedsOneCorrect"]);
  });
});

describe("drawQuestions", () => {
  it("keeps the authored order without shuffle", () => {
    expect(drawQuestions(quiz, noShuffle, "seed").map((d) => d.q)).toEqual([
      "q1",
      "q2",
      "q3",
      "q4",
    ]);
  });

  it("is deterministic per seed and differs between seeds", () => {
    const settings = { drawCount: null, shuffle: true };
    const first = drawQuestions(quiz, settings, "user:course:0");
    expect(drawQuestions(quiz, settings, "user:course:0")).toEqual(first);
    const others = ["1", "2", "3", "4", "5"].map((n) =>
      JSON.stringify(drawQuestions(quiz, settings, `user:course:${n}`)),
    );
    expect(others.some((other) => other !== JSON.stringify(first))).toBe(true);
  });

  it("draws N questions and keeps their authored order without shuffle", () => {
    const drawn = drawQuestions(quiz, { drawCount: 2, shuffle: false }, "s");
    expect(drawn).toHaveLength(2);
    const positions = drawn.map((d) => quiz.findIndex((q) => q.id === d.q));
    expect(positions).toEqual([...positions].sort());
  });

  it("skips questions that are not playable", () => {
    const broken = { ...question("q5", 4, "single", []), prompt: "" };
    expect(
      drawQuestions([...quiz, broken], noShuffle, "s").map((d) => d.q),
    ).not.toContain("q5");
  });
});

describe("toAttemptView", () => {
  it("never carries a correct key", () => {
    const view = toAttemptView(drawQuestions(quiz, noShuffle, "s"), quiz);
    expect(JSON.stringify(view)).not.toContain("correct");
    expect(JSON.stringify(view)).not.toContain("explanation");
    expect(view[0]).toEqual({
      id: "q1",
      kind: "single",
      prompt: "Prompt q1",
      options: [
        { id: "q1-x", text: "x" },
        { id: "q1-y", text: "y" },
        { id: "q1-z", text: "z" },
      ],
    });
  });

  it("drops a deleted question and shows a new option at the end", () => {
    const order = drawQuestions(quiz, noShuffle, "s");
    const edited = [
      {
        ...quiz[0],
        options: [
          ...quiz[0].options,
          { id: "q1-w", position: 9, text: "w", correct: false },
        ],
      },
      ...quiz.slice(2),
    ];
    const view = toAttemptView(order, edited);
    expect(view.map((q) => q.id)).toEqual(["q1", "q3", "q4"]);
    expect(view[0].options.at(-1)).toEqual({ id: "q1-w", text: "w" });
  });
});

describe("gradeAttempt", () => {
  const order = drawQuestions(quiz, noShuffle, "s");
  const allRight = {
    q1: ["q1-x"],
    q2: ["q2-z", "q2-x"],
    q3: ["q3-y"],
    q4: ["q4-z"],
  };

  it("passes only when every answer is exactly right", () => {
    expect(gradeAttempt(order, quiz, allRight)).toMatchObject({
      correctCount: 4,
      total: 4,
      passed: true,
    });
    const partial = gradeAttempt(order, quiz, { ...allRight, q2: ["q2-x"] });
    expect(partial).toMatchObject({ correctCount: 3, passed: false });
    expect(partial.questions[1]).toEqual({
      questionId: "q2",
      correct: false,
      selected: ["q2-x"],
      correctOptionIds: ["q2-x", "q2-z"],
    });
  });

  it("counts an extra selection on multiple choice as wrong", () => {
    const result = gradeAttempt(order, quiz, {
      ...allRight,
      q2: ["q2-x", "q2-y", "q2-z"],
    });
    expect(result.passed).toBe(false);
  });

  it("counts an unanswered question and foreign option ids as wrong", () => {
    const result = gradeAttempt(order, quiz, {
      ...allRight,
      q1: ["q3-y"],
      q4: [],
    });
    expect(result.correctCount).toBe(2);
  });

  it("leaves a deleted question out of the total", () => {
    const result = gradeAttempt(
      order,
      quiz.filter((q) => q.id !== "q3"),
      { ...allRight, q3: [] },
    );
    expect(result).toMatchObject({ correctCount: 3, total: 3, passed: true });
  });
});
