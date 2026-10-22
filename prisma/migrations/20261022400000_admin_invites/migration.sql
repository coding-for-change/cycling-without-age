-- AlterTable
ALTER TABLE `session` ADD COLUMN `passkeyVerifiedAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `admin_invite` (
    `id` VARCHAR(191) NOT NULL,
    `kind` ENUM('superadmin', 'countryAdmin') NOT NULL,
    `countryId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NOT NULL,
    `invitedByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,
    `acceptedAt` DATETIME(3) NULL,
    `revokedAt` DATETIME(3) NULL,

    INDEX `admin_invite_userId_idx`(`userId`),
    INDEX `admin_invite_countryId_idx`(`countryId`),
    INDEX `admin_invite_invitedByUserId_idx`(`invitedByUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `admin_invite` ADD CONSTRAINT `admin_invite_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admin_invite` ADD CONSTRAINT `admin_invite_invitedByUserId_fkey` FOREIGN KEY (`invitedByUserId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admin_invite` ADD CONSTRAINT `admin_invite_countryId_fkey` FOREIGN KEY (`countryId`) REFERENCES `country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
