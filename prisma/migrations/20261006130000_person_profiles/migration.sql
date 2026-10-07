-- AlterTable
ALTER TABLE `stored_file` MODIFY `kind` ENUM('typePhoto', 'typeManual', 'trishawPhoto', 'entrancePhoto', 'damagePhoto', 'ridePhoto', 'profilePhoto') NOT NULL;

-- CreateTable
CREATE TABLE `person_profile` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `passengerId` VARCHAR(191) NULL,
    `photoFileId` VARCHAR(191) NULL,
    `photoAgreedByUserId` VARCHAR(191) NULL,
    `photoAgreedAt` DATETIME(3) NULL,
    `bio` VARCHAR(200) NULL,
    `interests` JSON NULL,
    `customInterests` JSON NULL,
    `prompts` JSON NULL,
    `hideAge` BOOLEAN NOT NULL DEFAULT false,
    `accessibilityTags` JSON NULL,
    `accessibilityNone` BOOLEAN NOT NULL DEFAULT false,
    `healthConsentAt` DATETIME(3) NULL,
    `healthConsentByUserId` VARCHAR(191) NULL,
    `setupDismissedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `person_profile_userId_key`(`userId`),
    UNIQUE INDEX `person_profile_passengerId_key`(`passengerId`),
    UNIQUE INDEX `person_profile_photoFileId_key`(`photoFileId`),
    INDEX `person_profile_photoAgreedByUserId_idx`(`photoAgreedByUserId`),
    INDEX `person_profile_healthConsentByUserId_idx`(`healthConsentByUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pilot_step_tick` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `step` ENUM('trainingVideos', 'workshop') NOT NULL,
    `tickedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `confirmedByUserId` VARCHAR(191) NULL,
    `confirmedAt` DATETIME(3) NULL,

    UNIQUE INDEX `pilot_step_tick_userId_step_key`(`userId`, `step`),
    INDEX `pilot_step_tick_confirmedByUserId_idx`(`confirmedByUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `person_profile` ADD CONSTRAINT `person_profile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person_profile` ADD CONSTRAINT `person_profile_passengerId_fkey` FOREIGN KEY (`passengerId`) REFERENCES `passenger`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person_profile` ADD CONSTRAINT `person_profile_photoFileId_fkey` FOREIGN KEY (`photoFileId`) REFERENCES `stored_file`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person_profile` ADD CONSTRAINT `person_profile_photoAgreedByUserId_fkey` FOREIGN KEY (`photoAgreedByUserId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person_profile` ADD CONSTRAINT `person_profile_healthConsentByUserId_fkey` FOREIGN KEY (`healthConsentByUserId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pilot_step_tick` ADD CONSTRAINT `pilot_step_tick_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pilot_step_tick` ADD CONSTRAINT `pilot_step_tick_confirmedByUserId_fkey` FOREIGN KEY (`confirmedByUserId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
