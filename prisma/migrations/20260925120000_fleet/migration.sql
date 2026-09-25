-- DropForeignKey
ALTER TABLE `trishaw` DROP FOREIGN KEY `trishaw_chapterId_fkey`;

-- DropForeignKey
ALTER TABLE `trishaw` DROP FOREIGN KEY `trishaw_storageLocationId_fkey`;

-- DropIndex
DROP INDEX `trishaw_type_name_key` ON `trishaw_type`;

-- DropIndex
DROP INDEX `trishaw_chapterId_status_idx` ON `trishaw`;

-- DropIndex
DROP INDEX `trishaw_storageLocationId_idx` ON `trishaw`;

-- AlterTable
ALTER TABLE `chapter_settings` ADD COLUMN `damageAlertPush` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `postRideInstructions` TEXT NULL;

-- AlterTable
ALTER TABLE `storage_location` ADD COLUMN `accessCode` VARCHAR(64) NULL,
    ADD COLUMN `accessNotes` TEXT NULL,
    ADD COLUMN `archivedAt` DATETIME(3) NULL,
    ADD COLUMN `countryId` VARCHAR(191) NULL,
    ADD COLUMN `entrance` TEXT NULL,
    ADD COLUMN `entrancePhotoFileId` VARCHAR(191) NULL,
    ADD COLUMN `isDefault` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `kind` ENUM('chapter', 'pool') NOT NULL DEFAULT 'chapter',
    ADD COLUMN `membersMayManage` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `ownerChapterId` VARCHAR(191) NULL,
    ADD COLUMN `poolCode` VARCHAR(16) NULL,
    ADD COLUMN `returnInstructions` TEXT NULL;

-- AlterTable
ALTER TABLE `storage_location_chapter` ADD COLUMN `decidedAt` DATETIME(3) NULL,
    ADD COLUMN `decidedByUserId` VARCHAR(191) NULL,
    ADD COLUMN `decisionNote` TEXT NULL,
    ADD COLUMN `requestedByUserId` VARCHAR(191) NULL,
    ADD COLUMN `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

ALTER TABLE `storage_location_chapter` ALTER COLUMN `updatedAt` DROP DEFAULT;

-- Backfill: every link that existed was already in use, so it counts as approved.
UPDATE `storage_location_chapter` SET `status` = 'approved';

-- AlterTable
ALTER TABLE `trishaw_type` ADD COLUMN `archivedAt` DATETIME(3) NULL,
    ADD COLUMN `chapterId` VARCHAR(191) NULL,
    ADD COLUMN `countryId` VARCHAR(191) NULL,
    ADD COLUMN `createdByUserId` VARCHAR(191) NULL,
    ADD COLUMN `description` TEXT NULL,
    ADD COLUMN `manualFileId` VARCHAR(191) NULL,
    ADD COLUMN `photoFileId` VARCHAR(191) NULL,
    ADD COLUMN `scope` ENUM('global', 'country', 'chapter') NOT NULL DEFAULT 'global',
    ADD COLUMN `scopeKey` VARCHAR(200) NOT NULL DEFAULT 'global',
    ADD COLUMN `seats` INTEGER NOT NULL DEFAULT 2,
    ADD COLUMN `wheelchairAccessible` BOOLEAN NOT NULL DEFAULT false;

-- Backfill: a site linked to exactly one chapter becomes that chapter's own
-- location; a site shared by several becomes a pool of their country.
UPDATE `storage_location` sl
  JOIN (SELECT `storageLocationId`, MIN(`chapterId`) AS `chapterId`
          FROM `storage_location_chapter`
         GROUP BY `storageLocationId`
        HAVING COUNT(*) = 1) one ON one.`storageLocationId` = sl.`id`
   SET sl.`kind` = 'chapter', sl.`ownerChapterId` = one.`chapterId`;

DELETE slc FROM `storage_location_chapter` slc
  JOIN `storage_location` sl ON sl.`id` = slc.`storageLocationId`
 WHERE sl.`ownerChapterId` = slc.`chapterId`;

UPDATE `storage_location` sl
  JOIN (SELECT slc.`storageLocationId`, MIN(o.`countryId`) AS `countryId`
          FROM `storage_location_chapter` slc
          JOIN `organization` o ON o.`id` = slc.`chapterId`
         GROUP BY slc.`storageLocationId`) many ON many.`storageLocationId` = sl.`id`
  JOIN `country` c ON c.`id` = many.`countryId`
   SET sl.`kind` = 'pool',
       sl.`countryId` = many.`countryId`,
       sl.`poolCode` = CONCAT(c.`code`, '-', UPPER(SUBSTRING(MD5(CONCAT(sl.`id`, RAND())), 1, 4)), '-', UPPER(SUBSTRING(MD5(CONCAT(RAND(), sl.`id`)), 1, 2)))
 WHERE sl.`ownerChapterId` IS NULL;

-- Backfill: every chapter gets its default location.
INSERT INTO `storage_location` (`id`, `kind`, `name`, `ownerChapterId`, `isDefault`, `address`, `latitude`, `longitude`, `createdAt`, `updatedAt`)
SELECT CONCAT('loc', o.`id`), 'chapter', COALESCE(o.`careHomeName`, o.`name`), o.`id`, true, o.`address`, o.`latitude`, o.`longitude`, NOW(3), NOW(3)
  FROM `organization` o;

UPDATE `trishaw` t
   SET t.`storageLocationId` = CONCAT('loc', t.`chapterId`)
 WHERE t.`storageLocationId` IS NULL;

-- Backfill: the seat count moves from the bike to its model.
UPDATE `trishaw_type` tt
  JOIN (SELECT `typeId`, MAX(`seats`) AS `seats` FROM `trishaw` WHERE `typeId` IS NOT NULL GROUP BY `typeId`) s ON s.`typeId` = tt.`id`
   SET tt.`seats` = s.`seats`;

-- AlterTable
ALTER TABLE `trishaw` DROP COLUMN `chapterId`,
    DROP COLUMN `seats`,
    ADD COLUMN `note` TEXT NULL,
    ADD COLUMN `photoFileId` VARCHAR(191) NULL,
    MODIFY `storageLocationId` VARCHAR(191) NOT NULL;

-- CreateTable
CREATE TABLE `stored_file` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(255) NOT NULL,
    `kind` ENUM('typePhoto', 'typeManual', 'trishawPhoto', 'entrancePhoto', 'damagePhoto') NOT NULL,
    `mime` VARCHAR(100) NOT NULL,
    `size` INTEGER NOT NULL,
    `uploadedByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `stored_file_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trishaw_damage` (
    `id` VARCHAR(191) NOT NULL,
    `trishawId` VARCHAR(191) NOT NULL,
    `rideId` VARCHAR(191) NULL,
    `reportedByUserId` VARCHAR(191) NULL,
    `description` TEXT NOT NULL,
    `photoFileId` VARCHAR(191) NULL,
    `grounding` BOOLEAN NOT NULL DEFAULT false,
    `reportedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `clearedAt` DATETIME(3) NULL,
    `clearedByUserId` VARCHAR(191) NULL,
    `clearNote` TEXT NULL,

    INDEX `trishaw_damage_trishawId_clearedAt_idx`(`trishawId`, `clearedAt`),
    INDEX `trishaw_damage_rideId_idx`(`rideId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trishaw_log_entry` (
    `id` VARCHAR(191) NOT NULL,
    `trishawId` VARCHAR(191) NOT NULL,
    `actorUserId` VARCHAR(191) NULL,
    `type` ENUM('created', 'statusChanged', 'moved', 'note', 'damageReported', 'damageCleared') NOT NULL,
    `payload` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `trishaw_log_entry_trishawId_createdAt_idx`(`trishawId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `storage_location_poolCode_key` ON `storage_location`(`poolCode`);

-- CreateIndex
CREATE INDEX `storage_location_ownerChapterId_idx` ON `storage_location`(`ownerChapterId`);

-- CreateIndex
CREATE INDEX `storage_location_countryId_kind_idx` ON `storage_location`(`countryId`, `kind`);

-- CreateIndex
CREATE INDEX `storage_location_chapter_chapterId_status_idx` ON `storage_location_chapter`(`chapterId`, `status`);

-- CreateIndex
CREATE INDEX `trishaw_type_countryId_idx` ON `trishaw_type`(`countryId`);

-- CreateIndex
CREATE INDEX `trishaw_type_chapterId_idx` ON `trishaw_type`(`chapterId`);

-- CreateIndex
CREATE UNIQUE INDEX `trishaw_type_scopeKey_name_key` ON `trishaw_type`(`scopeKey`, `name`);

-- CreateIndex
CREATE INDEX `trishaw_storageLocationId_status_idx` ON `trishaw`(`storageLocationId`, `status`);

-- AddForeignKey
ALTER TABLE `stored_file` ADD CONSTRAINT `stored_file_uploadedByUserId_fkey` FOREIGN KEY (`uploadedByUserId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trishaw_type` ADD CONSTRAINT `trishaw_type_countryId_fkey` FOREIGN KEY (`countryId`) REFERENCES `country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trishaw_type` ADD CONSTRAINT `trishaw_type_chapterId_fkey` FOREIGN KEY (`chapterId`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trishaw_type` ADD CONSTRAINT `trishaw_type_photoFileId_fkey` FOREIGN KEY (`photoFileId`) REFERENCES `stored_file`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trishaw_type` ADD CONSTRAINT `trishaw_type_manualFileId_fkey` FOREIGN KEY (`manualFileId`) REFERENCES `stored_file`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `storage_location` ADD CONSTRAINT `storage_location_ownerChapterId_fkey` FOREIGN KEY (`ownerChapterId`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `storage_location` ADD CONSTRAINT `storage_location_countryId_fkey` FOREIGN KEY (`countryId`) REFERENCES `country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `storage_location` ADD CONSTRAINT `storage_location_entrancePhotoFileId_fkey` FOREIGN KEY (`entrancePhotoFileId`) REFERENCES `stored_file`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trishaw` ADD CONSTRAINT `trishaw_storageLocationId_fkey` FOREIGN KEY (`storageLocationId`) REFERENCES `storage_location`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trishaw` ADD CONSTRAINT `trishaw_photoFileId_fkey` FOREIGN KEY (`photoFileId`) REFERENCES `stored_file`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trishaw_damage` ADD CONSTRAINT `trishaw_damage_trishawId_fkey` FOREIGN KEY (`trishawId`) REFERENCES `trishaw`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trishaw_damage` ADD CONSTRAINT `trishaw_damage_rideId_fkey` FOREIGN KEY (`rideId`) REFERENCES `ride`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trishaw_damage` ADD CONSTRAINT `trishaw_damage_reportedByUserId_fkey` FOREIGN KEY (`reportedByUserId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trishaw_damage` ADD CONSTRAINT `trishaw_damage_photoFileId_fkey` FOREIGN KEY (`photoFileId`) REFERENCES `stored_file`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trishaw_damage` ADD CONSTRAINT `trishaw_damage_clearedByUserId_fkey` FOREIGN KEY (`clearedByUserId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trishaw_log_entry` ADD CONSTRAINT `trishaw_log_entry_trishawId_fkey` FOREIGN KEY (`trishawId`) REFERENCES `trishaw`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trishaw_log_entry` ADD CONSTRAINT `trishaw_log_entry_actorUserId_fkey` FOREIGN KEY (`actorUserId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

