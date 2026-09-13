-- CreateTable
CREATE TABLE `chapter_settings` (
    `chapterId` VARCHAR(191) NOT NULL,
    `notifyOnMemberJoined` BOOLEAN NOT NULL DEFAULT true,
    `applicationAlertPush` BOOLEAN NOT NULL DEFAULT true,
    `replyToEmail` VARCHAR(254) NULL,
    `welcomeNote` TEXT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`chapterId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `chapter_settings` ADD CONSTRAINT `chapter_settings_chapterId_fkey` FOREIGN KEY (`chapterId`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX `device_lastSeenAt_idx` ON `device`(`lastSeenAt`);
