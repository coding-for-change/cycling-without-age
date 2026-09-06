-- AlterTable
ALTER TABLE `chapter_application` ADD COLUMN `approvalSeenAt` DATETIME(3) NULL,
    ADD COLUMN `decisionNote` TEXT NULL;

-- CreateTable
CREATE TABLE `activity_event` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `actorUserId` VARCHAR(191) NULL,
    `chapterId` VARCHAR(191) NULL,
    `type` ENUM('applicationSubmitted', 'applicationApproved', 'applicationRejected', 'roleGranted', 'roleRevoked', 'memberRemoved', 'emailSent', 'countryAdminAppointed', 'countryAdminRemoved') NOT NULL,
    `payload` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `activity_event_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `activity_event_chapterId_createdAt_idx`(`chapterId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `activity_event` ADD CONSTRAINT `activity_event_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `activity_event` ADD CONSTRAINT `activity_event_actorUserId_fkey` FOREIGN KEY (`actorUserId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `activity_event` ADD CONSTRAINT `activity_event_chapterId_fkey` FOREIGN KEY (`chapterId`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
