-- CreateTable
CREATE TABLE `trishaw_type_photo` (
    `id` VARCHAR(191) NOT NULL,
    `typeId` VARCHAR(191) NOT NULL,
    `fileId` VARCHAR(191) NOT NULL,
    `position` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `trishaw_type_photo_fileId_key`(`fileId`),
    INDEX `trishaw_type_photo_typeId_position_idx`(`typeId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trishaw_photo` (
    `id` VARCHAR(191) NOT NULL,
    `trishawId` VARCHAR(191) NOT NULL,
    `fileId` VARCHAR(191) NOT NULL,
    `position` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `trishaw_photo_fileId_key`(`fileId`),
    INDEX `trishaw_photo_trishawId_position_idx`(`trishawId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `trishaw_type_photo` ADD CONSTRAINT `trishaw_type_photo_typeId_fkey` FOREIGN KEY (`typeId`) REFERENCES `trishaw_type`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trishaw_type_photo` ADD CONSTRAINT `trishaw_type_photo_fileId_fkey` FOREIGN KEY (`fileId`) REFERENCES `stored_file`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trishaw_photo` ADD CONSTRAINT `trishaw_photo_trishawId_fkey` FOREIGN KEY (`trishawId`) REFERENCES `trishaw`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trishaw_photo` ADD CONSTRAINT `trishaw_photo_fileId_fkey` FOREIGN KEY (`fileId`) REFERENCES `stored_file`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


-- Backfill: an existing single photo becomes the first photo of its gallery.
INSERT INTO `trishaw_type_photo` (`id`, `typeId`, `fileId`, `position`, `createdAt`)
SELECT CONCAT('tp', `id`), `id`, `photoFileId`, 0, NOW(3)
  FROM `trishaw_type` WHERE `photoFileId` IS NOT NULL;

INSERT INTO `trishaw_photo` (`id`, `trishawId`, `fileId`, `position`, `createdAt`)
SELECT CONCAT('tp', `id`), `id`, `photoFileId`, 0, NOW(3)
  FROM `trishaw` WHERE `photoFileId` IS NOT NULL;
