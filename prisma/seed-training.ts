import { execFile } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import type { Job } from "bullmq";
import { personProfiles } from "@/features/person-profiles";
import { training, type ContentLanguage } from "@/features/training";
import { activity } from "@/lib/activity";
import { withScratch } from "@/lib/media";
import { runMediaJob } from "@/worker/media";

const run = promisify(execFile);

const VIDEO_TITLE = "Seed fixture — trishaw safety check";
const CLIP_SECONDS = 20;
const GLOBAL_SEARCH = { countryIds: [], chapterIds: [] };

type QuestionSeed = {
  kind: "single" | "multiple";
  prompt: string;
  explanation: string;
  options: { text: string; correct: boolean }[];
};

type CourseSeed = {
  language: ContentLanguage;
  title: string;
  summary: string;
  lessons: {
    first: { title: string; videoBody: string; readingBody: string };
    second: { title: string; body: string };
  };
  quizzes: { first: string; second: string };
  questions: QuestionSeed[];
};

const ENGLISH: CourseSeed = {
  language: "en",
  title: "Basic Pilot Training",
  summary:
    "Everything a new pilot needs before the first ride: the pre-ride check, getting a passenger in and out safely, and riding with care.",
  lessons: {
    first: {
      title: "Before you ride",
      videoBody:
        "Watch the whole video once. It walks through the **pre-ride check** you do every time before a passenger gets in.",
      readingBody: `Do the **pre-ride check** every time, before a passenger gets in:

1. **Brakes** — squeeze both levers; the trishaw must not roll.
2. **Tyres** — press each one; none may be soft.
3. **Battery** — at least half full for a normal ride.
4. **Seat belt and blanket** — both on board and clean.

If anything is off, do not ride. Report it as damage in the app.`,
    },
    second: {
      title: "Riding with a passenger",
      body: `## Getting in

Set the **parking brake** before the passenger stands up. Offer your arm, never pull. Fasten the seat belt and ask if it sits comfortably.

## On the way

- Ride at walking pace on shared paths and at most **15 km/h** anywhere else.
- Tell your passenger before every bump, curve or stop.
- Talk, listen and stop when they want to look at something — the ride is theirs.

## Getting out

Parking brake first, then the belt. Help them up slowly and wait until they stand steady.`,
    },
  },
  quizzes: {
    first: "Check: before you ride",
    second: "Check: riding with a passenger",
  },
  questions: [
    {
      kind: "single",
      prompt: "When do you do the pre-ride check?",
      explanation:
        "The check takes two minutes and catches a soft tyre or a weak brake before it matters.",
      options: [
        { text: "Before every ride", correct: true },
        { text: "Once a week", correct: false },
        { text: "Only when something sounds wrong", correct: false },
      ],
    },
    {
      kind: "multiple",
      prompt: "What do you do before your passenger gets in or out?",
      explanation:
        "The parking brake keeps the trishaw still, and a calm explanation lets the passenger move at their own pace.",
      options: [
        { text: "Set the parking brake", correct: true },
        { text: "Explain what happens next", correct: true },
        { text: "Keep the motor assist switched on", correct: false },
        { text: "Hold the trishaw with one hand only", correct: false },
      ],
    },
    {
      kind: "single",
      prompt: "How fast do you ride on a path shared with pedestrians?",
      explanation:
        "On shared paths walking pace keeps everyone safe and gives your passenger time to enjoy the view.",
      options: [
        { text: "Walking pace", correct: true },
        { text: "15 km/h", correct: false },
        { text: "As fast as the motor allows", correct: false },
      ],
    },
    {
      kind: "single",
      prompt: "Your passenger wants to get out. What comes first?",
      explanation:
        "With the parking brake set the trishaw cannot roll while your passenger stands up.",
      options: [
        { text: "Set the parking brake", correct: true },
        { text: "Open the seat belt", correct: false },
        { text: "Help them stand up", correct: false },
      ],
    },
  ],
};

const GERMAN: CourseSeed = {
  language: "de",
  title: "Grundlagen für Pilot:innen",
  summary:
    "Alles, was du vor deiner ersten Ausfahrt brauchst: der Check vor der Fahrt, sicheres Ein- und Aussteigen und rücksichtsvolles Fahren.",
  lessons: {
    first: {
      title: "Bevor du losfährst",
      videoBody:
        "Schau dir das Video einmal ganz an. Es zeigt dir den **Check vor der Fahrt**, den du jedes Mal machst, bevor jemand einsteigt.",
      readingBody: `Mach den **Check vor der Fahrt** jedes Mal, bevor jemand einsteigt:

1. **Bremsen** — zieh beide Hebel; die Rikscha darf nicht rollen.
2. **Reifen** — drück auf jeden Reifen; keiner darf weich sein.
3. **Akku** — für eine normale Fahrt mindestens halb voll.
4. **Gurt und Decke** — beides an Bord und sauber.

Wenn etwas nicht stimmt, fährst du nicht. Melde es in der App als Schaden.`,
    },
    second: {
      title: "Fahren mit Fahrgast",
      body: `## Einsteigen

Zieh die **Feststellbremse**, bevor dein Fahrgast aufsteht. Biete deinen Arm an, zieh nie. Schließ den Gurt und frag, ob er bequem sitzt.

## Unterwegs

- Auf gemeinsamen Wegen fährst du Schrittgeschwindigkeit, sonst höchstens **15 km/h**.
- Sag vor jeder Kante, Kurve und jedem Halt Bescheid.
- Rede, hör zu und halt an, wenn dein Fahrgast sich etwas anschauen möchte — es ist seine Fahrt.

## Aussteigen

Erst die Feststellbremse, dann der Gurt. Hilf langsam beim Aufstehen und warte, bis dein Fahrgast sicher steht.`,
    },
  },
  quizzes: {
    first: "Check: bevor du losfährst",
    second: "Check: Fahren mit Fahrgast",
  },
  questions: [
    {
      kind: "single",
      prompt: "Wann machst du den Check vor der Fahrt?",
      explanation:
        "Der Check dauert zwei Minuten und findet einen weichen Reifen oder eine schwache Bremse, bevor es darauf ankommt.",
      options: [
        { text: "Vor jeder Fahrt", correct: true },
        { text: "Einmal pro Woche", correct: false },
        { text: "Nur wenn etwas komisch klingt", correct: false },
      ],
    },
    {
      kind: "multiple",
      prompt: "Was machst du, bevor dein Fahrgast ein- oder aussteigt?",
      explanation:
        "Die Feststellbremse hält die Rikscha still, und wenn du erklärst, was passiert, kann sich dein Fahrgast in seinem Tempo bewegen.",
      options: [
        { text: "Die Feststellbremse ziehen", correct: true },
        { text: "Erklären, was als Nächstes passiert", correct: true },
        { text: "Die Motorunterstützung eingeschaltet lassen", correct: false },
        { text: "Die Rikscha nur mit einer Hand halten", correct: false },
      ],
    },
    {
      kind: "single",
      prompt:
        "Wie schnell fährst du auf einem Weg, den du mit Fußgänger:innen teilst?",
      explanation:
        "Auf gemeinsamen Wegen ist Schrittgeschwindigkeit sicher für alle und lässt deinem Fahrgast Zeit, die Aussicht zu genießen.",
      options: [
        { text: "Schrittgeschwindigkeit", correct: true },
        { text: "15 km/h", correct: false },
        { text: "So schnell, wie der Motor erlaubt", correct: false },
      ],
    },
    {
      kind: "single",
      prompt: "Dein Fahrgast möchte aussteigen. Was kommt zuerst?",
      explanation:
        "Mit gezogener Feststellbremse kann die Rikscha nicht rollen, während dein Fahrgast aufsteht.",
      options: [
        { text: "Die Feststellbremse ziehen", correct: true },
        { text: "Den Gurt öffnen", correct: false },
        { text: "Beim Aufstehen helfen", correct: false },
      ],
    },
  ],
};

const COURSES = [ENGLISH, GERMAN];

async function reachable(url: string) {
  try {
    return (await fetch(url, { method: "HEAD" })).ok;
  } catch {
    return false;
  }
}

async function usableVideo(
  video: Awaited<ReturnType<typeof training.getVideo>>,
) {
  if (!video) return false;
  const playback = training.playbackOf(video);
  if (!playback) return false;
  return (await reachable(playback.src)) && (await reachable(playback.poster));
}

async function renderClip(dir: string) {
  const output = join(dir, "fixture.mp4");
  await run(
    process.env.FFMPEG_PATH || "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-f",
      "lavfi",
      "-i",
      `testsrc2=size=1280x720:rate=30:duration=${CLIP_SECONDS}`,
      "-f",
      "lavfi",
      "-i",
      `sine=frequency=440:sample_rate=48000:duration=${CLIP_SECONDS}`,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "28",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "96k",
      "-shortest",
      "-movflags",
      "+faststart",
      output,
    ],
    { timeout: 120_000 },
  );
  return output;
}

async function uploadSource(path: string, actorUserId: string) {
  const { size } = await stat(path);
  const { videoId, partSize, partCount } = await training.createVideo(
    {
      owner: { scope: "global" },
      language: "en",
      title: VIDEO_TITLE,
      mime: "video/mp4",
      size,
    },
    actorUserId,
  );
  try {
    const bytes = await readFile(path);
    const urls = await training.signParts({
      videoId,
      partNumbers: Array.from({ length: partCount }, (_, index) => index + 1),
    });
    const parts = [];
    for (const { partNumber, url } of urls) {
      const response = await fetch(url, {
        method: "PUT",
        body: bytes.subarray(
          (partNumber - 1) * partSize,
          partNumber * partSize,
        ),
      });
      const etag = response.headers.get("etag");
      if (!response.ok || !etag)
        throw new Error(
          `part ${partNumber} upload failed (${response.status})`,
        );
      parts.push({ partNumber, etag });
    }
    await training.markUploaded({ videoId, parts }, actorUserId);
    return videoId;
  } catch (error) {
    await training.abortUpload(videoId).catch(() => undefined);
    throw error;
  }
}

async function transcode(videoId: string) {
  const video = await training.getVideo(videoId);
  if (!video) throw new Error("video vanished");
  const outcome = await runMediaJob({
    name: "transcode",
    data: { videoId, revision: video.revision },
    attemptsMade: 0,
    opts: { attempts: 1 },
  } as Job);
  const ready = await training.getVideo(videoId);
  if (ready?.status !== "ready")
    throw new Error(`transcode ended as ${outcome}`);
}

async function discardVideo(
  videoId: string,
  lessonIds: string[],
  actorUserId: string,
) {
  for (const lessonId of lessonIds) {
    const lesson = await training.getElement(lessonId);
    if (lesson?.videoId === videoId)
      await training.updateElement(lessonId, { videoId: null }, actorUserId);
  }
  await training.deleteVideo(videoId, actorUserId).catch(() => undefined);
}

async function ensureVideo(firstLessonIds: string[], actorUserId: string) {
  const existing = (await training.listVideosVisibleTo(GLOBAL_SEARCH)).filter(
    (video) => video.scope === "global" && video.title === VIDEO_TITLE,
  );
  let keep: string | null = null;
  for (const video of existing) {
    if (!keep && (await usableVideo(video))) keep = video.id;
    else await discardVideo(video.id, firstLessonIds, actorUserId);
  }
  if (keep) return keep;

  try {
    return await withScratch(async (dir) => {
      const videoId = await uploadSource(await renderClip(dir), actorUserId);
      try {
        await transcode(videoId);
      } catch (error) {
        await discardVideo(videoId, firstLessonIds, actorUserId);
        throw error;
      }
      return videoId;
    });
  } catch (error) {
    console.log(
      `Training video fixture skipped (${error instanceof Error ? error.message.split("\n")[0] : String(error)}); lesson 1 stays a reading lesson.`,
    );
    return null;
  }
}

async function ensureFamily(actorUserId: string) {
  const family = (await training.listCourseFamilies(GLOBAL_SEARCH)).find(
    (row) =>
      row.scope === "global" &&
      row.courses.some(
        (course) =>
          course.language === ENGLISH.language &&
          course.title === ENGLISH.title,
      ),
  );
  const courseIds = new Map<ContentLanguage, string>();
  for (const course of family?.courses ?? [])
    courseIds.set(course.language as ContentLanguage, course.id);

  let familyId = family?.id ?? null;
  for (const seed of COURSES) {
    if (courseIds.has(seed.language)) continue;
    const created = await training.createCourse(
      familyId
        ? {
            kind: "translation",
            familyId,
            language: seed.language,
            title: seed.title,
          }
        : {
            kind: "family",
            owner: { scope: "global" },
            language: seed.language,
            title: seed.title,
          },
      actorUserId,
    );
    familyId = created.familyId;
    courseIds.set(seed.language, created.courseId);
  }
  return { familyId: familyId!, courseIds };
}

type ElementSeed = {
  kind: "lesson" | "quiz";
  title: string;
  questions: QuestionSeed[];
};

const elementsOf = (seed: CourseSeed): ElementSeed[] => [
  { kind: "lesson", title: seed.lessons.first.title, questions: [] },
  {
    kind: "quiz",
    title: seed.quizzes.first,
    questions: seed.questions.slice(0, 2),
  },
  { kind: "lesson", title: seed.lessons.second.title, questions: [] },
  {
    kind: "quiz",
    title: seed.quizzes.second,
    questions: seed.questions.slice(2, 4),
  },
];

async function ensureElements(courseId: string, seed: CourseSeed) {
  const wanted = elementsOf(seed);
  const existing = await training.courseElements(courseId);
  const ids: string[] = [];
  for (const [position, element] of wanted.entries()) {
    const found = existing.find(
      (row) => row.kind === element.kind && row.title === element.title,
    );
    const id =
      found?.id ??
      (
        await training.createElement({
          courseId,
          kind: element.kind,
          title: element.title,
          position,
        })
      ).id;
    ids.push(id);
    if (
      element.kind === "quiz" &&
      (await training.listQuestions(id)).length === 0
    )
      for (const question of element.questions) {
        const created = await training.createQuestion(id);
        await training.saveQuestion(created.id, question);
      }
  }
  for (const row of existing)
    if (!ids.includes(row.id)) await training.deleteElement(row.id);
  await training.reorderElements({ courseId, elementIds: ids });
  const [first, , second] = ids;
  return [first, second];
}

async function seedCourses(actorUserId: string) {
  const { familyId, courseIds } = await ensureFamily(actorUserId);
  const lessonIds = new Map<ContentLanguage, string[]>();
  for (const seed of COURSES) {
    const courseId = courseIds.get(seed.language)!;
    lessonIds.set(seed.language, await ensureElements(courseId, seed));
  }

  const videoId = await ensureVideo(
    [...lessonIds.values()].map(([first]) => first),
    actorUserId,
  );

  for (const seed of COURSES) {
    const courseId = courseIds.get(seed.language)!;
    const [first, second] = lessonIds.get(seed.language)!;
    await training.updateElement(
      first,
      {
        body: videoId
          ? seed.lessons.first.videoBody
          : seed.lessons.first.readingBody,
        videoId,
      },
      actorUserId,
    );
    await training.updateElement(
      second,
      { body: seed.lessons.second.body },
      actorUserId,
    );
    await training.updateCourse(courseId, {
      summary: seed.summary,
      published: true,
    });
  }

  await training.setRequirement(
    { owner: { scope: "global" }, familyId },
    actorUserId,
  );

  return { familyId, courseIds, videoId };
}

export type TrainedPilot = {
  userId: string;
  chapterId: string;
  confirmedBy: string;
};

async function clearPilots(pilots: TrainedPilot[], actorUserId: string) {
  const confirmed = await personProfiles.inPersonTrainingOf(
    pilots.map((pilot) => pilot.userId),
  );
  for (const pilot of pilots) {
    await training.grantExemption(
      { userId: pilot.userId, familyId: null, reason: "migration" },
      { grantedByUserId: actorUserId, chapterId: null },
    );
    if (confirmed.get(pilot.userId)?.confirmedAt) continue;
    await personProfiles.confirmPilotStep(
      pilot.userId,
      "inPersonTraining",
      pilot.confirmedBy,
    );
    await activity.record({
      userId: pilot.userId,
      actorUserId: pilot.confirmedBy,
      chapterId: pilot.chapterId,
      type: "inPersonTrainingConfirmed",
    });
  }
}

async function resetTrainees(userIds: string[], actorUserId: string) {
  for (const userId of userIds) {
    await training.revokeExemption(
      { userId, familyId: null },
      { actorUserId, chapterId: null },
    );
    await personProfiles.revokePilotStep(userId, "inPersonTraining");
  }
}

export async function seedTraining({
  actorUserId,
  experiencedPilots,
  trainees,
}: {
  actorUserId: string;
  experiencedPilots: TrainedPilot[];
  trainees: string[];
}) {
  const result = await seedCourses(actorUserId);
  await clearPilots(experiencedPilots, actorUserId);
  await resetTrainees(trainees, actorUserId);
  return result;
}
