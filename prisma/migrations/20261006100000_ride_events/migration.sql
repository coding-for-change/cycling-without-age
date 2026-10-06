-- AlterTable
ALTER TABLE `ride` ADD COLUMN `title` VARCHAR(120) NULL,
    ADD COLUMN `description` TEXT NULL,
    ADD COLUMN `capacity` INTEGER NULL;

-- AlterTable
ALTER TABLE `ride_log_entry` MODIFY `type` ENUM('scheduled', 'rescheduled', 'edited', 'cancelled', 'trishawsChanged', 'pilotAssigned', 'pilotUnassigned', 'riderBooked', 'riderRemoved', 'rosterReordered', 'note') NOT NULL;

-- AlterTable
ALTER TABLE `stored_file` MODIFY `kind` ENUM('typePhoto', 'typeManual', 'trishawPhoto', 'entrancePhoto', 'damagePhoto', 'ridePhoto') NOT NULL;

-- CreateTable
CREATE TABLE `ride_photo` (
    `id` VARCHAR(191) NOT NULL,
    `rideId` VARCHAR(191) NOT NULL,
    `fileId` VARCHAR(191) NOT NULL,
    `position` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ride_photo_rideId_position_idx`(`rideId`, `position`),
    INDEX `ride_photo_fileId_idx`(`fileId`),
    UNIQUE INDEX `ride_photo_rideId_fileId_key`(`rideId`, `fileId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ride_photo` ADD CONSTRAINT `ride_photo_rideId_fkey` FOREIGN KEY (`rideId`) REFERENCES `ride`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ride_photo` ADD CONSTRAINT `ride_photo_fileId_fkey` FOREIGN KEY (`fileId`) REFERENCES `stored_file`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
