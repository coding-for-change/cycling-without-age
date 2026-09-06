-- AlterTable
ALTER TABLE `organization` ADD COLUMN `serviceRadiusKm` INTEGER NOT NULL DEFAULT 10;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `address` TEXT NULL,
    ADD COLUMN `birthDate` DATE NULL,
    ADD COLUMN `consentDataAt` DATETIME(3) NULL,
    ADD COLUMN `consentSafetyAt` DATETIME(3) NULL,
    ADD COLUMN `gender` ENUM('female', 'male', 'other') NULL,
    ADD COLUMN `latitude` DOUBLE NULL,
    ADD COLUMN `locale` VARCHAR(5) NULL,
    ADD COLUMN `longitude` DOUBLE NULL,
    ADD COLUMN `managesOthers` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `notifyEmail` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `notifyPush` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `passkeyPromptedAt` DATETIME(3) NULL,
    ADD COLUMN `pilotNextStepsSeenAt` DATETIME(3) NULL,
    ADD COLUMN `residence` ENUM('careHome', 'home') NULL;

-- CreateTable
CREATE TABLE `passenger` (
    `id` VARCHAR(191) NOT NULL,
    `chapterId` VARCHAR(191) NOT NULL,
    `managedByUserId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `firstName` TEXT NOT NULL,
    `lastName` TEXT NOT NULL,
    `birthDate` DATE NOT NULL,
    `gender` ENUM('female', 'male', 'other') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `passenger_userId_key`(`userId`),
    INDEX `passenger_chapterId_idx`(`chapterId`),
    INDEX `passenger_managedByUserId_idx`(`managedByUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `passenger` ADD CONSTRAINT `passenger_chapterId_fkey` FOREIGN KEY (`chapterId`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `passenger` ADD CONSTRAINT `passenger_managedByUserId_fkey` FOREIGN KEY (`managedByUserId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `passenger` ADD CONSTRAINT `passenger_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
