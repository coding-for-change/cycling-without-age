-- AlterTable
ALTER TABLE `stored_file` MODIFY `kind` ENUM('typePhoto', 'typeManual', 'trishawPhoto', 'entrancePhoto', 'damagePhoto', 'ridePhoto', 'profilePhoto', 'trainingAttachment') NOT NULL;

-- CreateTable
CREATE TABLE `training_video` (
    `id` VARCHAR(191) NOT NULL,
    `scope` ENUM('global', 'country', 'chapter') NOT NULL DEFAULT 'global',
    `scopeKey` VARCHAR(200) NOT NULL DEFAULT 'global',
    `countryId` VARCHAR(191) NULL,
    `chapterId` VARCHAR(191) NULL,
    `language` VARCHAR(16) NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('uploading', 'queued', 'processing', 'ready', 'failed') NOT NULL DEFAULT 'uploading',
    `progress` INTEGER NOT NULL DEFAULT 0,
    `failureCode` VARCHAR(40) NULL,
    `sourceKey` VARCHAR(255) NOT NULL,
    `sourceMime` VARCHAR(100) NOT NULL,
    `sourceSize` BIGINT NOT NULL,
    `uploadId` VARCHAR(1024) NULL,
    `mediaKey` VARCHAR(32) NOT NULL,
    `revision` INTEGER NOT NULL DEFAULT 1,
    `durationSeconds` DOUBLE NULL,
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `renditions` JSON NULL,
    `posterSeconds` DOUBLE NULL,
    `uploadedByUserId` VARCHAR(191) NULL,
    `readyAt` DATETIME(3) NULL,
    `archivedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `training_video_sourceKey_key`(`sourceKey`),
    UNIQUE INDEX `training_video_mediaKey_key`(`mediaKey`),
    INDEX `training_video_scopeKey_status_idx`(`scopeKey`, `status`),
    INDEX `training_video_countryId_idx`(`countryId`),
    INDEX `training_video_chapterId_idx`(`chapterId`),
    INDEX `training_video_status_updatedAt_idx`(`status`, `updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `training_video` ADD CONSTRAINT `training_video_countryId_fkey` FOREIGN KEY (`countryId`) REFERENCES `country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `training_video` ADD CONSTRAINT `training_video_chapterId_fkey` FOREIGN KEY (`chapterId`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

