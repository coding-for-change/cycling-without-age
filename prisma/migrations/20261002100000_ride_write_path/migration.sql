-- The free-text reason becomes the note beside a reason code. A rename keeps
-- what admins already wrote; rides cancelled before codes existed count as `other`.
-- AlterTable
ALTER TABLE `ride` RENAME COLUMN `cancellationReason` TO `cancellationNote`,
    ADD COLUMN `cancellationReasonCode` ENUM('weather', 'rider', 'facility', 'volunteers', 'equipment', 'noRiders', 'other') NULL,
    ADD COLUMN `cancelledByUserId` VARCHAR(191) NULL,
    ADD COLUMN `note` TEXT NULL,
    ADD COLUMN `requiredPilots` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `seriesId` VARCHAR(191) NULL;

UPDATE `ride` SET `cancellationReasonCode` = 'other' WHERE `status` = 'cancelled';

-- AlterTable
ALTER TABLE `ride_assignment` ADD COLUMN `assignedByUserId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `ride_roster_entry` ADD COLUMN `bookedByUserId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `ride_log_entry` (
    `id` VARCHAR(191) NOT NULL,
    `rideId` VARCHAR(191) NOT NULL,
    `actorUserId` VARCHAR(191) NULL,
    `type` ENUM('scheduled', 'rescheduled', 'edited', 'cancelled', 'trishawsChanged', 'pilotAssigned', 'pilotUnassigned', 'riderBooked', 'riderRemoved', 'note') NOT NULL,
    `payload` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ride_log_entry_rideId_createdAt_idx`(`rideId`, `createdAt`),
    INDEX `ride_log_entry_actorUserId_idx`(`actorUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `ride_seriesId_idx` ON `ride`(`seriesId`);

-- CreateIndex
CREATE INDEX `ride_cancelledByUserId_idx` ON `ride`(`cancelledByUserId`);

-- CreateIndex
CREATE INDEX `ride_assignment_assignedByUserId_idx` ON `ride_assignment`(`assignedByUserId`);

-- CreateIndex
CREATE INDEX `ride_roster_entry_bookedByUserId_idx` ON `ride_roster_entry`(`bookedByUserId`);

-- AddForeignKey
ALTER TABLE `ride` ADD CONSTRAINT `ride_cancelledByUserId_fkey` FOREIGN KEY (`cancelledByUserId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ride_log_entry` ADD CONSTRAINT `ride_log_entry_rideId_fkey` FOREIGN KEY (`rideId`) REFERENCES `ride`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ride_log_entry` ADD CONSTRAINT `ride_log_entry_actorUserId_fkey` FOREIGN KEY (`actorUserId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ride_assignment` ADD CONSTRAINT `ride_assignment_assignedByUserId_fkey` FOREIGN KEY (`assignedByUserId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ride_roster_entry` ADD CONSTRAINT `ride_roster_entry_bookedByUserId_fkey` FOREIGN KEY (`bookedByUserId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

