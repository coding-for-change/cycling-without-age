-- CreateTable
CREATE TABLE `training_course_family` (
    `id` VARCHAR(191) NOT NULL,
    `scope` ENUM('global', 'country', 'chapter') NOT NULL DEFAULT 'global',
    `scopeKey` VARCHAR(200) NOT NULL DEFAULT 'global',
    `countryId` VARCHAR(191) NULL,
    `chapterId` VARCHAR(191) NULL,
    `createdByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `training_course_family_scopeKey_idx`(`scopeKey`),
    INDEX `training_course_family_countryId_idx`(`countryId`),
    INDEX `training_course_family_chapterId_idx`(`chapterId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `training_course` (
    `id` VARCHAR(191) NOT NULL,
    `familyId` VARCHAR(191) NOT NULL,
    `language` VARCHAR(16) NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `summary` TEXT NULL,
    `publishedAt` DATETIME(3) NULL,
    `quizDrawCount` INTEGER NULL,
    `quizShuffle` BOOLEAN NOT NULL DEFAULT true,
    `createdByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `training_course_familyId_language_key`(`familyId`, `language`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `training_lesson` (
    `id` VARCHAR(191) NOT NULL,
    `courseId` VARCHAR(191) NOT NULL,
    `chapterId` VARCHAR(191) NULL,
    `position` INTEGER NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `body` TEXT NULL,
    `videoId` VARCHAR(191) NULL,
    `attachmentFileId` VARCHAR(191) NULL,
    `mandatory` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `training_lesson_courseId_position_idx`(`courseId`, `position`),
    INDEX `training_lesson_chapterId_idx`(`chapterId`),
    INDEX `training_lesson_videoId_idx`(`videoId`),
    INDEX `training_lesson_attachmentFileId_idx`(`attachmentFileId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `training_course_overlay` (
    `id` VARCHAR(191) NOT NULL,
    `courseId` VARCHAR(191) NOT NULL,
    `chapterId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `training_course_overlay_chapterId_idx`(`chapterId`),
    UNIQUE INDEX `training_course_overlay_courseId_chapterId_key`(`courseId`, `chapterId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `training_lesson_placement` (
    `overlayId` VARCHAR(191) NOT NULL,
    `lessonId` VARCHAR(191) NOT NULL,
    `position` INTEGER NOT NULL,
    `hidden` BOOLEAN NOT NULL DEFAULT false,

    INDEX `training_lesson_placement_lessonId_idx`(`lessonId`),
    PRIMARY KEY (`overlayId`, `lessonId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `training_question` (
    `id` VARCHAR(191) NOT NULL,
    `courseId` VARCHAR(191) NOT NULL,
    `position` INTEGER NOT NULL,
    `kind` ENUM('single', 'multiple') NOT NULL DEFAULT 'single',
    `prompt` TEXT NOT NULL,
    `explanation` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `training_question_courseId_position_idx`(`courseId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `training_option` (
    `id` VARCHAR(191) NOT NULL,
    `questionId` VARCHAR(191) NOT NULL,
    `position` INTEGER NOT NULL,
    `text` VARCHAR(500) NOT NULL,
    `correct` BOOLEAN NOT NULL DEFAULT false,

    INDEX `training_option_questionId_position_idx`(`questionId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `training_enrollment` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `courseId` VARCHAR(191) NOT NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastActivityAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastLessonId` VARCHAR(191) NULL,
    `passedAt` DATETIME(3) NULL,
    `attemptCount` INTEGER NOT NULL DEFAULT 0,

    INDEX `training_enrollment_courseId_idx`(`courseId`),
    INDEX `training_enrollment_lastLessonId_idx`(`lastLessonId`),
    UNIQUE INDEX `training_enrollment_userId_courseId_key`(`userId`, `courseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `training_lesson_progress` (
    `userId` VARCHAR(191) NOT NULL,
    `lessonId` VARCHAR(191) NOT NULL,
    `furthestSeconds` DOUBLE NOT NULL DEFAULT 0,
    `positionSeconds` DOUBLE NOT NULL DEFAULT 0,
    `heartbeatAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `training_lesson_progress_lessonId_idx`(`lessonId`),
    PRIMARY KEY (`userId`, `lessonId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `training_quiz_attempt` (
    `id` VARCHAR(191) NOT NULL,
    `enrollmentId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `courseId` VARCHAR(191) NOT NULL,
    `number` INTEGER NOT NULL,
    `questionOrder` JSON NOT NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `submittedAt` DATETIME(3) NULL,
    `answers` JSON NULL,
    `correctCount` INTEGER NULL,
    `total` INTEGER NOT NULL,
    `passed` BOOLEAN NULL,

    INDEX `training_quiz_attempt_userId_courseId_idx`(`userId`, `courseId`),
    INDEX `training_quiz_attempt_courseId_idx`(`courseId`),
    UNIQUE INDEX `training_quiz_attempt_enrollmentId_number_key`(`enrollmentId`, `number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `training_course_family` ADD CONSTRAINT `training_course_family_countryId_fkey` FOREIGN KEY (`countryId`) REFERENCES `country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `training_course_family` ADD CONSTRAINT `training_course_family_chapterId_fkey` FOREIGN KEY (`chapterId`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `training_course` ADD CONSTRAINT `training_course_familyId_fkey` FOREIGN KEY (`familyId`) REFERENCES `training_course_family`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `training_lesson` ADD CONSTRAINT `training_lesson_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `training_course`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `training_lesson` ADD CONSTRAINT `training_lesson_chapterId_fkey` FOREIGN KEY (`chapterId`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `training_lesson` ADD CONSTRAINT `training_lesson_videoId_fkey` FOREIGN KEY (`videoId`) REFERENCES `training_video`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `training_lesson` ADD CONSTRAINT `training_lesson_attachmentFileId_fkey` FOREIGN KEY (`attachmentFileId`) REFERENCES `stored_file`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `training_course_overlay` ADD CONSTRAINT `training_course_overlay_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `training_course`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `training_course_overlay` ADD CONSTRAINT `training_course_overlay_chapterId_fkey` FOREIGN KEY (`chapterId`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `training_lesson_placement` ADD CONSTRAINT `training_lesson_placement_overlayId_fkey` FOREIGN KEY (`overlayId`) REFERENCES `training_course_overlay`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `training_lesson_placement` ADD CONSTRAINT `training_lesson_placement_lessonId_fkey` FOREIGN KEY (`lessonId`) REFERENCES `training_lesson`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `training_question` ADD CONSTRAINT `training_question_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `training_course`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `training_option` ADD CONSTRAINT `training_option_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `training_question`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `training_enrollment` ADD CONSTRAINT `training_enrollment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `training_enrollment` ADD CONSTRAINT `training_enrollment_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `training_course`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `training_enrollment` ADD CONSTRAINT `training_enrollment_lastLessonId_fkey` FOREIGN KEY (`lastLessonId`) REFERENCES `training_lesson`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `training_lesson_progress` ADD CONSTRAINT `training_lesson_progress_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `training_lesson_progress` ADD CONSTRAINT `training_lesson_progress_lessonId_fkey` FOREIGN KEY (`lessonId`) REFERENCES `training_lesson`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `training_quiz_attempt` ADD CONSTRAINT `training_quiz_attempt_enrollmentId_fkey` FOREIGN KEY (`enrollmentId`) REFERENCES `training_enrollment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `training_quiz_attempt` ADD CONSTRAINT `training_quiz_attempt_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `training_quiz_attempt` ADD CONSTRAINT `training_quiz_attempt_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `training_course`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

