-- AlterTable
-- Every ride time is rendered in its chapter's own zone, so the column is required.
-- Existing chapters are backfilled from their country before the default is dropped.
ALTER TABLE `organization` ADD COLUMN `timeZone` VARCHAR(64) NOT NULL DEFAULT 'UTC';

UPDATE `organization` `o`
  JOIN `country` `c` ON `o`.`countryId` = `c`.`id`
  SET `o`.`timeZone` = CASE `c`.`code`
    WHEN 'DE' THEN 'Europe/Berlin'
    WHEN 'DK' THEN 'Europe/Copenhagen'
    ELSE 'UTC'
  END;

ALTER TABLE `organization` ALTER COLUMN `timeZone` DROP DEFAULT;

-- CreateTable
CREATE TABLE `trishaw` (
    `id` VARCHAR(191) NOT NULL,
    `chapterId` VARCHAR(191) NOT NULL,
    `name` TEXT NOT NULL,
    `type` TEXT NULL,
    `seats` INTEGER NOT NULL DEFAULT 2,
    `status` ENUM('active', 'maintenance', 'retired') NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `trishaw_chapterId_status_idx`(`chapterId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ride` (
    `id` VARCHAR(191) NOT NULL,
    `chapterId` VARCHAR(191) NOT NULL,
    `model` ENUM('event', 'pleasure', 'functional') NOT NULL DEFAULT 'event',
    `status` ENUM('scheduled', 'cancelled', 'completed') NOT NULL DEFAULT 'scheduled',
    `startsAt` DATETIME(3) NOT NULL,
    `endsAt` DATETIME(3) NOT NULL,
    `locationName` TEXT NULL,
    `locationAddress` TEXT NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `destinationName` TEXT NULL,
    `destinationAddress` TEXT NULL,
    `destinationLatitude` DOUBLE NULL,
    `destinationLongitude` DOUBLE NULL,
    `returnLegOfId` VARCHAR(191) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `cancellationReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ride_returnLegOfId_key`(`returnLegOfId`),
    INDEX `ride_chapterId_startsAt_idx`(`chapterId`, `startsAt`),
    INDEX `ride_status_startsAt_idx`(`status`, `startsAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ride_trishaw` (
    `id` VARCHAR(191) NOT NULL,
    `rideId` VARCHAR(191) NOT NULL,
    `trishawId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ride_trishaw_trishawId_idx`(`trishawId`),
    UNIQUE INDEX `ride_trishaw_rideId_trishawId_key`(`rideId`, `trishawId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ride_assignment` (
    `id` VARCHAR(191) NOT NULL,
    `rideId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` ENUM('pilot', 'ambassador', 'transporter') NOT NULL DEFAULT 'pilot',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ride_assignment_userId_idx`(`userId`),
    INDEX `ride_assignment_rideId_idx`(`rideId`),
    UNIQUE INDEX `ride_assignment_rideId_userId_role_key`(`rideId`, `userId`, `role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ride_roster_entry` (
    `id` VARCHAR(191) NOT NULL,
    `rideId` VARCHAR(191) NOT NULL,
    `passengerId` VARCHAR(191) NOT NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `checkedInAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ride_roster_entry_passengerId_idx`(`passengerId`),
    INDEX `ride_roster_entry_rideId_position_idx`(`rideId`, `position`),
    UNIQUE INDEX `ride_roster_entry_rideId_passengerId_key`(`rideId`, `passengerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `trishaw` ADD CONSTRAINT `trishaw_chapterId_fkey` FOREIGN KEY (`chapterId`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ride` ADD CONSTRAINT `ride_chapterId_fkey` FOREIGN KEY (`chapterId`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ride` ADD CONSTRAINT `ride_returnLegOfId_fkey` FOREIGN KEY (`returnLegOfId`) REFERENCES `ride`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ride_trishaw` ADD CONSTRAINT `ride_trishaw_rideId_fkey` FOREIGN KEY (`rideId`) REFERENCES `ride`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ride_trishaw` ADD CONSTRAINT `ride_trishaw_trishawId_fkey` FOREIGN KEY (`trishawId`) REFERENCES `trishaw`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ride_assignment` ADD CONSTRAINT `ride_assignment_rideId_fkey` FOREIGN KEY (`rideId`) REFERENCES `ride`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ride_assignment` ADD CONSTRAINT `ride_assignment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ride_roster_entry` ADD CONSTRAINT `ride_roster_entry_rideId_fkey` FOREIGN KEY (`rideId`) REFERENCES `ride`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ride_roster_entry` ADD CONSTRAINT `ride_roster_entry_passengerId_fkey` FOREIGN KEY (`passengerId`) REFERENCES `passenger`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
