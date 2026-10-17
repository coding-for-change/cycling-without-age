-- AlterTable
ALTER TABLE `chapter_settings` ADD COLUMN `pilotsMaySelfAssign` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `requiredPilotsDefault` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `staffingCheckLeadHours` INTEGER NOT NULL DEFAULT 48;

-- AlterTable
ALTER TABLE `conversation` ADD COLUMN `rideId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `ride` ADD COLUMN `announced` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `staffingCheckedAt` DATETIME(3) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `conversation_rideId_key` ON `conversation`(`rideId`);

-- AddForeignKey
ALTER TABLE `conversation` ADD CONSTRAINT `conversation_rideId_fkey` FOREIGN KEY (`rideId`) REFERENCES `ride`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

