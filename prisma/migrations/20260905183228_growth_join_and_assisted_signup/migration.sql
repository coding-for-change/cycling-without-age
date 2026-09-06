-- AlterTable
ALTER TABLE `activity_event` MODIFY `type` ENUM('applicationSubmitted', 'applicationApproved', 'applicationRejected', 'roleGranted', 'roleRevoked', 'memberRemoved', 'emailSent', 'countryAdminAppointed', 'countryAdminRemoved', 'accountCreated', 'invited', 'accountClaimed') NOT NULL;

-- AlterTable
ALTER TABLE `organization` ADD COLUMN `description` TEXT NULL;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `claimedAt` DATETIME(3) NULL,
    ADD COLUMN `createdByUserId` VARCHAR(191) NULL,
    ADD COLUMN `helperContact` TEXT NULL,
    ADD COLUMN `helperName` TEXT NULL,
    ADD COLUMN `helperRelationship` TEXT NULL;

-- CreateIndex
CREATE INDEX `user_createdByUserId_idx` ON `user`(`createdByUserId`);

-- AddForeignKey
ALTER TABLE `user` ADD CONSTRAINT `user_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
