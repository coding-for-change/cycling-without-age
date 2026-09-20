-- CreateTable
CREATE TABLE `storage_location` (
    `id` VARCHAR(191) NOT NULL,
    `name` TEXT NOT NULL,
    `address` TEXT NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `storage_location_chapter` (
    `id` VARCHAR(191) NOT NULL,
    `storageLocationId` VARCHAR(191) NOT NULL,
    `chapterId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `storage_location_chapter_chapterId_idx`(`chapterId`),
    UNIQUE INDEX `storage_location_chapter_storageLocationId_chapterId_key`(`storageLocationId`, `chapterId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `trishaw` ADD COLUMN `storageLocationId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `trishaw_storageLocationId_idx` ON `trishaw`(`storageLocationId`);

-- AddForeignKey
ALTER TABLE `trishaw` ADD CONSTRAINT `trishaw_storageLocationId_fkey` FOREIGN KEY (`storageLocationId`) REFERENCES `storage_location`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `storage_location_chapter` ADD CONSTRAINT `storage_location_chapter_storageLocationId_fkey` FOREIGN KEY (`storageLocationId`) REFERENCES `storage_location`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `storage_location_chapter` ADD CONSTRAINT `storage_location_chapter_chapterId_fkey` FOREIGN KEY (`chapterId`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
