-- AlterTable
ALTER TABLE `activity_event` MODIFY `type` ENUM('applicationSubmitted', 'applicationApproved', 'applicationRejected', 'roleGranted', 'roleRevoked', 'memberRemoved', 'emailSent', 'countryAdminAppointed', 'countryAdminRemoved', 'accountCreated', 'invited', 'accountClaimed', 'chapterCreated', 'chapterUpdated', 'chapterDeleted', 'countryDeleted', 'trainingPassed', 'trainingExemptionGranted', 'trainingExemptionRevoked', 'inPersonTrainingConfirmed') NOT NULL;

-- PilotStep: workshop becomes inPersonTraining, the self-ticked trainingVideos step is gone
DELETE FROM `pilot_step_tick` WHERE `step` = 'trainingVideos';

ALTER TABLE `pilot_step_tick` MODIFY `step` ENUM('trainingVideos', 'workshop', 'inPersonTraining') NOT NULL;

UPDATE `pilot_step_tick` SET `step` = 'inPersonTraining' WHERE `step` = 'workshop';

ALTER TABLE `pilot_step_tick` MODIFY `step` ENUM('inPersonTraining') NOT NULL;

-- CreateTable
CREATE TABLE `training_requirement` (
    `id` VARCHAR(191) NOT NULL,
    `familyId` VARCHAR(191) NOT NULL,
    `scope` ENUM('global', 'country', 'chapter') NOT NULL DEFAULT 'global',
    `scopeKey` VARCHAR(200) NOT NULL DEFAULT 'global',
    `countryId` VARCHAR(191) NULL,
    `chapterId` VARCHAR(191) NULL,
    `createdByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `training_requirement_familyId_idx`(`familyId`),
    INDEX `training_requirement_countryId_idx`(`countryId`),
    INDEX `training_requirement_chapterId_idx`(`chapterId`),
    UNIQUE INDEX `training_requirement_scopeKey_familyId_key`(`scopeKey`, `familyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `training_exemption` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `familyKey` VARCHAR(64) NOT NULL,
    `familyId` VARCHAR(191) NULL,
    `reason` ENUM('experienced', 'manual', 'migration') NOT NULL,
    `grantedByUserId` VARCHAR(191) NULL,
    `chapterId` VARCHAR(191) NULL,
    `grantedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `training_exemption_familyId_idx`(`familyId`),
    INDEX `training_exemption_grantedByUserId_idx`(`grantedByUserId`),
    INDEX `training_exemption_chapterId_idx`(`chapterId`),
    UNIQUE INDEX `training_exemption_userId_familyKey_key`(`userId`, `familyKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `training_requirement` ADD CONSTRAINT `training_requirement_familyId_fkey` FOREIGN KEY (`familyId`) REFERENCES `training_course_family`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `training_requirement` ADD CONSTRAINT `training_requirement_countryId_fkey` FOREIGN KEY (`countryId`) REFERENCES `country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `training_requirement` ADD CONSTRAINT `training_requirement_chapterId_fkey` FOREIGN KEY (`chapterId`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `training_exemption` ADD CONSTRAINT `training_exemption_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `training_exemption` ADD CONSTRAINT `training_exemption_familyId_fkey` FOREIGN KEY (`familyId`) REFERENCES `training_course_family`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `training_exemption` ADD CONSTRAINT `training_exemption_grantedByUserId_fkey` FOREIGN KEY (`grantedByUserId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `training_exemption` ADD CONSTRAINT `training_exemption_chapterId_fkey` FOREIGN KEY (`chapterId`) REFERENCES `organization`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: every approved pilot today is exempt from training and has had in-person training
INSERT INTO `training_exemption` (`id`, `userId`, `familyKey`, `familyId`, `reason`, `grantedByUserId`, `chapterId`, `grantedAt`)
SELECT CONCAT('mig', LEFT(MD5(CONCAT('training-exemption:', `pilots`.`userId`)), 22)), `pilots`.`userId`, 'all', NULL, 'migration', NULL, NULL, CURRENT_TIMESTAMP(3)
FROM (SELECT DISTINCT `userId` FROM `member` WHERE FIND_IN_SET('pilot', `role`) > 0) AS `pilots`
ON DUPLICATE KEY UPDATE `familyKey` = `familyKey`;

INSERT INTO `pilot_step_tick` (`id`, `userId`, `step`, `tickedAt`, `confirmedByUserId`, `confirmedAt`)
SELECT CONCAT('mig', LEFT(MD5(CONCAT('in-person-training:', `pilots`.`userId`)), 22)), `pilots`.`userId`, 'inPersonTraining', CURRENT_TIMESTAMP(3), NULL, CURRENT_TIMESTAMP(3)
FROM (SELECT DISTINCT `userId` FROM `member` WHERE FIND_IN_SET('pilot', `role`) > 0) AS `pilots`
ON DUPLICATE KEY UPDATE `confirmedAt` = COALESCE(`pilot_step_tick`.`confirmedAt`, CURRENT_TIMESTAMP(3));
