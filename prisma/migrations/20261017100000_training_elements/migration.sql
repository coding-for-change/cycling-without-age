-- A course is an ordered list of elements: lessons and quizzes
ALTER TABLE `training_lesson` ADD COLUMN `kind` ENUM('lesson', 'quiz') NOT NULL DEFAULT 'lesson',
    ADD COLUMN `quizDrawCount` INTEGER NULL,
    ADD COLUMN `quizShuffle` BOOLEAN NOT NULL DEFAULT true;

-- Chapter overlays and chapter-only lessons are gone: higher-level courses are immutable for lower admins
DROP TABLE `training_lesson_placement`;

DROP TABLE `training_course_overlay`;

DELETE FROM `training_lesson` WHERE `chapterId` IS NOT NULL;

ALTER TABLE `training_lesson` DROP FOREIGN KEY `training_lesson_chapterId_fkey`;

DROP INDEX `training_lesson_chapterId_idx` ON `training_lesson`;

ALTER TABLE `training_lesson` DROP COLUMN `chapterId`,
    DROP COLUMN `mandatory`;

-- Every course with questions gets one quiz element at the end that carries them and its settings
INSERT INTO `training_lesson` (`id`, `courseId`, `kind`, `position`, `title`, `quizDrawCount`, `quizShuffle`, `createdAt`, `updatedAt`)
SELECT CONCAT('mig', LEFT(MD5(CONCAT('training-quiz:', `course`.`id`)), 22)),
    `course`.`id`,
    'quiz',
    COALESCE((SELECT MAX(`lesson`.`position`) FROM `training_lesson` AS `lesson` WHERE `lesson`.`courseId` = `course`.`id`), -1) + 1,
    'Quiz',
    `course`.`quizDrawCount`,
    `course`.`quizShuffle`,
    CURRENT_TIMESTAMP(3),
    CURRENT_TIMESTAMP(3)
FROM `training_course` AS `course`
WHERE EXISTS (SELECT 1 FROM `training_question` AS `question` WHERE `question`.`courseId` = `course`.`id`);

ALTER TABLE `training_question` ADD COLUMN `lessonId` VARCHAR(191) NULL;

UPDATE `training_question` SET `lessonId` = CONCAT('mig', LEFT(MD5(CONCAT('training-quiz:', `courseId`)), 22));

ALTER TABLE `training_question` DROP FOREIGN KEY `training_question_courseId_fkey`;

DROP INDEX `training_question_courseId_position_idx` ON `training_question`;

ALTER TABLE `training_question` DROP COLUMN `courseId`,
    MODIFY `lessonId` VARCHAR(191) NOT NULL;

CREATE INDEX `training_question_lessonId_position_idx` ON `training_question`(`lessonId`, `position`);

ALTER TABLE `training_question` ADD CONSTRAINT `training_question_lessonId_fkey` FOREIGN KEY (`lessonId`) REFERENCES `training_lesson`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Attempts belong to a quiz element
ALTER TABLE `training_quiz_attempt` ADD COLUMN `lessonId` VARCHAR(191) NULL;

UPDATE `training_quiz_attempt` SET `lessonId` = CONCAT('mig', LEFT(MD5(CONCAT('training-quiz:', `courseId`)), 22));

DELETE `attempt` FROM `training_quiz_attempt` AS `attempt`
LEFT JOIN `training_lesson` AS `lesson` ON `lesson`.`id` = `attempt`.`lessonId`
WHERE `lesson`.`id` IS NULL;

ALTER TABLE `training_quiz_attempt` MODIFY `lessonId` VARCHAR(191) NOT NULL;

ALTER TABLE `training_quiz_attempt` DROP FOREIGN KEY `training_quiz_attempt_enrollmentId_fkey`;

DROP INDEX `training_quiz_attempt_enrollmentId_number_key` ON `training_quiz_attempt`;

CREATE UNIQUE INDEX `training_quiz_attempt_enrollmentId_lessonId_number_key` ON `training_quiz_attempt`(`enrollmentId`, `lessonId`, `number`);

CREATE INDEX `training_quiz_attempt_lessonId_idx` ON `training_quiz_attempt`(`lessonId`);

ALTER TABLE `training_quiz_attempt` ADD CONSTRAINT `training_quiz_attempt_enrollmentId_fkey` FOREIGN KEY (`enrollmentId`) REFERENCES `training_enrollment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `training_quiz_attempt` ADD CONSTRAINT `training_quiz_attempt_lessonId_fkey` FOREIGN KEY (`lessonId`) REFERENCES `training_lesson`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- A passed quiz is a completed quiz element; completions stick
INSERT INTO `training_lesson_progress` (`userId`, `lessonId`, `furthestSeconds`, `positionSeconds`, `heartbeatAt`, `completedAt`, `createdAt`)
SELECT `attempt`.`userId`, `attempt`.`lessonId`, 0, 0, MIN(`attempt`.`submittedAt`), MIN(`attempt`.`submittedAt`), MIN(`attempt`.`submittedAt`)
FROM `training_quiz_attempt` AS `attempt`
WHERE `attempt`.`passed` = true AND `attempt`.`submittedAt` IS NOT NULL
GROUP BY `attempt`.`userId`, `attempt`.`lessonId`
ON DUPLICATE KEY UPDATE `completedAt` = COALESCE(`training_lesson_progress`.`completedAt`, VALUES(`completedAt`));

-- Quiz settings moved to the quiz element
ALTER TABLE `training_course` DROP COLUMN `quizDrawCount`,
    DROP COLUMN `quizShuffle`;
