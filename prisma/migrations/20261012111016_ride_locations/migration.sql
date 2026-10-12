-- AlterTable
ALTER TABLE `chapter_settings` ADD COLUMN `bookingHorizonDays` INTEGER NOT NULL DEFAULT 60,
    ADD COLUMN `bookingLeadTimeHours` INTEGER NOT NULL DEFAULT 48,
    ADD COLUMN `defaultRideMinutes` INTEGER NOT NULL DEFAULT 60,
    ADD COLUMN `defaultStayMinutes` INTEGER NOT NULL DEFAULT 60;

-- AlterTable
ALTER TABLE `passenger` ADD COLUMN `needsWheelchairBike` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `note` TEXT NULL,
    ADD COLUMN `rideLocationId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `ride` ADD COLUMN `rideLocationId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `chapter_operating_window` (
    `id` VARCHAR(191) NOT NULL,
    `chapterId` VARCHAR(191) NOT NULL,
    `weekday` INTEGER NOT NULL,
    `startMinute` INTEGER NOT NULL,
    `endMinute` INTEGER NOT NULL,

    UNIQUE INDEX `chapter_operating_window_chapterId_weekday_startMinute_key`(`chapterId`, `weekday`, `startMinute`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chapter_closure` (
    `id` VARCHAR(191) NOT NULL,
    `chapterId` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `reason` VARCHAR(200) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `chapter_closure_chapterId_date_key`(`chapterId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ride_location` (
    `id` VARCHAR(191) NOT NULL,
    `chapterId` VARCHAR(191) NOT NULL,
    `kind` ENUM('careCenter', 'residence', 'publicPlace', 'other') NOT NULL DEFAULT 'careCenter',
    `name` VARCHAR(160) NOT NULL,
    `address` TEXT NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `contactName` VARCHAR(120) NULL,
    `contactPhone` VARCHAR(40) NULL,
    `contactEmail` VARCHAR(254) NULL,
    `notes` TEXT NULL,
    `typicalRideKm` DECIMAL(6, 1) NULL,
    `defaultTrishawCount` INTEGER NOT NULL DEFAULT 1,
    `defaultPilotCount` INTEGER NOT NULL DEFAULT 1,
    `defaultMinutes` INTEGER NULL,
    `storageLocationId` VARCHAR(191) NULL,
    `archivedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ride_location_chapterId_archivedAt_idx`(`chapterId`, `archivedAt`),
    INDEX `ride_location_storageLocationId_idx`(`storageLocationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `passenger_rideLocationId_idx` ON `passenger`(`rideLocationId`);

-- CreateIndex
CREATE INDEX `ride_rideLocationId_startsAt_idx` ON `ride`(`rideLocationId`, `startsAt`);

-- AddForeignKey
ALTER TABLE `chapter_operating_window` ADD CONSTRAINT `chapter_operating_window_chapterId_fkey` FOREIGN KEY (`chapterId`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chapter_closure` ADD CONSTRAINT `chapter_closure_chapterId_fkey` FOREIGN KEY (`chapterId`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `passenger` ADD CONSTRAINT `passenger_rideLocationId_fkey` FOREIGN KEY (`rideLocationId`) REFERENCES `ride_location`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ride` ADD CONSTRAINT `ride_rideLocationId_fkey` FOREIGN KEY (`rideLocationId`) REFERENCES `ride_location`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ride_location` ADD CONSTRAINT `ride_location_chapterId_fkey` FOREIGN KEY (`chapterId`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ride_location` ADD CONSTRAINT `ride_location_storageLocationId_fkey` FOREIGN KEY (`storageLocationId`) REFERENCES `storage_location`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
