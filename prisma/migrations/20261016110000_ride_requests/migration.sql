-- DropForeignKey
ALTER TABLE `passenger` DROP FOREIGN KEY `passenger_managedByUserId_fkey`;

-- AlterTable
ALTER TABLE `activity_event` MODIFY `type` ENUM('applicationSubmitted', 'applicationApproved', 'applicationRejected', 'roleGranted', 'roleRevoked', 'memberRemoved', 'emailSent', 'countryAdminAppointed', 'countryAdminRemoved', 'accountCreated', 'invited', 'accountClaimed', 'chapterCreated', 'chapterUpdated', 'chapterDeleted', 'countryDeleted', 'riderHandedOver') NOT NULL;

-- AlterTable
ALTER TABLE `chapter_settings` ADD COLUMN `requestAlertPush` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `schedulingMethod` ENUM('scheduler', 'auto') NOT NULL DEFAULT 'scheduler';

-- CreateTable
CREATE TABLE `ride_request` (
    `id` VARCHAR(191) NOT NULL,
    `chapterId` VARCHAR(191) NOT NULL,
    `status` ENUM('pending', 'scheduled', 'declined', 'withdrawn') NOT NULL DEFAULT 'pending',
    `model` ENUM('event', 'pleasure', 'functional') NOT NULL,
    `requesterUserId` VARCHAR(191) NULL,
    `contactName` VARCHAR(120) NULL,
    `contactPhone` VARCHAR(40) NULL,
    `contactEmail` VARCHAR(254) NULL,
    `rideLocationId` VARCHAR(191) NULL,
    `pickupName` VARCHAR(160) NULL,
    `pickupAddress` TEXT NULL,
    `pickupLatitude` DOUBLE NULL,
    `pickupLongitude` DOUBLE NULL,
    `destinationName` VARCHAR(160) NULL,
    `destinationAddress` TEXT NULL,
    `destinationLatitude` DOUBLE NULL,
    `destinationLongitude` DOUBLE NULL,
    `roundTrip` BOOLEAN NOT NULL DEFAULT true,
    `requestedStartsAt` DATETIME(3) NOT NULL,
    `requestedEndsAt` DATETIME(3) NOT NULL,
    `trishawTypeId` VARCHAR(191) NULL,
    `note` TEXT NULL,
    `decidedByUserId` VARCHAR(191) NULL,
    `decidedAt` DATETIME(3) NULL,
    `decisionNote` TEXT NULL,
    `rideId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ride_request_rideId_key`(`rideId`),
    INDEX `ride_request_chapterId_status_requestedStartsAt_idx`(`chapterId`, `status`, `requestedStartsAt`),
    INDEX `ride_request_requesterUserId_createdAt_idx`(`requesterUserId`, `createdAt`),
    INDEX `ride_request_rideLocationId_idx`(`rideLocationId`),
    INDEX `ride_request_trishawTypeId_idx`(`trishawTypeId`),
    INDEX `ride_request_decidedByUserId_idx`(`decidedByUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ride_request_passenger` (
    `requestId` VARCHAR(191) NOT NULL,
    `passengerId` VARCHAR(191) NOT NULL,
    `position` INTEGER NOT NULL DEFAULT 0,

    INDEX `ride_request_passenger_passengerId_idx`(`passengerId`),
    PRIMARY KEY (`requestId`, `passengerId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `passenger` ADD CONSTRAINT `passenger_managedByUserId_fkey` FOREIGN KEY (`managedByUserId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ride_request` ADD CONSTRAINT `ride_request_chapterId_fkey` FOREIGN KEY (`chapterId`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ride_request` ADD CONSTRAINT `ride_request_requesterUserId_fkey` FOREIGN KEY (`requesterUserId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ride_request` ADD CONSTRAINT `ride_request_rideLocationId_fkey` FOREIGN KEY (`rideLocationId`) REFERENCES `ride_location`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ride_request` ADD CONSTRAINT `ride_request_trishawTypeId_fkey` FOREIGN KEY (`trishawTypeId`) REFERENCES `trishaw_type`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ride_request` ADD CONSTRAINT `ride_request_decidedByUserId_fkey` FOREIGN KEY (`decidedByUserId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ride_request` ADD CONSTRAINT `ride_request_rideId_fkey` FOREIGN KEY (`rideId`) REFERENCES `ride`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ride_request_passenger` ADD CONSTRAINT `ride_request_passenger_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `ride_request`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ride_request_passenger` ADD CONSTRAINT `ride_request_passenger_passengerId_fkey` FOREIGN KEY (`passengerId`) REFERENCES `passenger`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE `activity_event` ADD COLUMN `passengerId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `activity_event_passengerId_createdAt_idx` ON `activity_event`(`passengerId`, `createdAt`);

-- AddForeignKey
ALTER TABLE `activity_event` ADD CONSTRAINT `activity_event_passengerId_fkey` FOREIGN KEY (`passengerId`) REFERENCES `passenger`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
