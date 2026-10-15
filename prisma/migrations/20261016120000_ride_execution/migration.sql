-- AlterTable
ALTER TABLE `chapter_settings` ADD COLUMN `demandCheckLeadHours` INTEGER NOT NULL DEFAULT 24,
    ADD COLUMN `riderReminderLeadMinutes` INTEGER NOT NULL DEFAULT 1440,
    ADD COLUMN `volunteerReminderLeadMinutes` INTEGER NOT NULL DEFAULT 1440;

-- AlterTable
ALTER TABLE `ride` ADD COLUMN `completedAt` DATETIME(3) NULL,
    ADD COLUMN `completedByUserId` VARCHAR(191) NULL,
    ADD COLUMN `demandCheckedAt` DATETIME(3) NULL,
    ADD COLUMN `riderReminderSentAt` DATETIME(3) NULL,
    ADD COLUMN `volunteerReminderSentAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `ride_assignment` ADD COLUMN `attendance` ENUM('signedUp', 'completed', 'noShow') NOT NULL DEFAULT 'signedUp';

-- AlterTable
ALTER TABLE `ride_log_entry` MODIFY `type` ENUM('scheduled', 'rescheduled', 'edited', 'cancelled', 'trishawsChanged', 'pilotAssigned', 'pilotUnassigned', 'riderBooked', 'riderRemoved', 'rosterReordered', 'note', 'seatConfirmed', 'seatCancelled', 'checkedIn', 'checkInUndone', 'walkUpAdded', 'walkUpRemoved', 'pilotNoShow', 'completed', 'reopened', 'debriefed') NOT NULL;

-- AlterTable
ALTER TABLE `ride_roster_entry` ADD COLUMN `attendance` ENUM('booked', 'confirmed', 'checkedIn', 'completed', 'noShow', 'cancelled') NOT NULL DEFAULT 'booked',
    ADD COLUMN `cancelledAt` DATETIME(3) NULL,
    ADD COLUMN `confirmedAt` DATETIME(3) NULL,
    ADD COLUMN `guestName` TEXT NULL,
    MODIFY `passengerId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `ride_debrief` (
    `id` VARCHAR(191) NOT NULL,
    `rideId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `distanceKm` DECIMAL(7, 2) NULL,
    `donationCents` INTEGER NULL,
    `currency` VARCHAR(3) NULL,
    `bikeCondition` ENUM('good', 'fair', 'poor') NULL,
    `cooperation` ENUM('good', 'fair', 'poor') NULL,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ride_debrief_userId_idx`(`userId`),
    UNIQUE INDEX `ride_debrief_rideId_userId_key`(`rideId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `ride_completedByUserId_idx` ON `ride`(`completedByUserId`);

-- AddForeignKey
ALTER TABLE `ride` ADD CONSTRAINT `ride_completedByUserId_fkey` FOREIGN KEY (`completedByUserId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ride_debrief` ADD CONSTRAINT `ride_debrief_rideId_fkey` FOREIGN KEY (`rideId`) REFERENCES `ride`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ride_debrief` ADD CONSTRAINT `ride_debrief_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- A rider already marked as checked in before attendance existed keeps that standing.
UPDATE `ride_roster_entry` SET `attendance` = 'checkedIn' WHERE `checkedInAt` IS NOT NULL;
