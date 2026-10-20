import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";

export const questionSelect = {
  id: true,
  position: true,
  kind: true,
  prompt: true,
  explanation: true,
  options: {
    orderBy: { position: "asc" },
    select: { id: true, position: true, text: true, correct: true },
  },
} satisfies Prisma.TrainingQuestionSelect;

export const findQuestions = (lessonId: string) =>
  prisma.trainingQuestion.findMany({
    where: { lessonId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: questionSelect,
  });

export const findQuestionById = (id: string) =>
  prisma.trainingQuestion.findUnique({
    where: { id },
    select: { ...questionSelect, lessonId: true },
  });

export const findQuestionsOfLessons = (lessonIds: string[]) =>
  prisma.trainingQuestion.findMany({
    where: { lessonId: { in: lessonIds } },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: { ...questionSelect, lessonId: true },
  });

export const maxQuestionPosition = async (lessonId: string) =>
  (
    await prisma.trainingQuestion.aggregate({
      where: { lessonId },
      _max: { position: true },
    })
  )._max.position ?? -1;

export const insertQuestion = (
  data: Prisma.TrainingQuestionUncheckedCreateInput,
) => prisma.trainingQuestion.create({ data, select: { id: true } });

export const replaceQuestion = (
  id: string,
  data: {
    kind: "single" | "multiple";
    prompt: string;
    explanation: string | null;
    options: { id?: string; text: string; correct: boolean }[];
  },
) =>
  prisma.$transaction(async (tx) => {
    const keep = data.options.flatMap((option) =>
      option.id ? [option.id] : [],
    );
    await tx.trainingOption.deleteMany({
      where: { questionId: id, id: { notIn: keep } },
    });
    for (const [position, option] of data.options.entries()) {
      if (option.id)
        await tx.trainingOption.updateMany({
          where: { id: option.id, questionId: id },
          data: { position, text: option.text, correct: option.correct },
        });
      else
        await tx.trainingOption.create({
          data: {
            questionId: id,
            position,
            text: option.text,
            correct: option.correct,
          },
        });
    }
    return tx.trainingQuestion.update({
      where: { id },
      data: {
        kind: data.kind,
        prompt: data.prompt,
        explanation: data.explanation,
      },
      select: questionSelect,
    });
  });

export const deleteQuestionById = (id: string) =>
  prisma.trainingQuestion.delete({ where: { id }, select: { id: true } });

export const setQuestionPositions = (questionIds: string[]) =>
  prisma.$transaction(
    questionIds.map((id, position) =>
      prisma.trainingQuestion.update({
        where: { id },
        data: { position },
        select: { id: true },
      }),
    ),
  );
