-- CreateTable
CREATE TABLE `trishaw_type` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `trishaw_type_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Backfill: every distinct free-text value becomes a catalogue row, so no
-- chapter loses what it had typed. Trimmed and grouped, because the whole
-- reason for this table is that "VeloPlus" and "VeloPlus " were two types.
INSERT INTO `trishaw_type` (`id`, `name`, `createdAt`, `updatedAt`)
SELECT UUID(), TRIM(`type`), NOW(3), NOW(3)
  FROM `trishaw`
 WHERE `type` IS NOT NULL AND TRIM(`type`) <> ''
 GROUP BY TRIM(`type`);

-- AlterTable
ALTER TABLE `trishaw` ADD COLUMN `typeId` VARCHAR(191) NULL;

-- Point each bike at its catalogue row before the text column goes.
UPDATE `trishaw` t
  JOIN `trishaw_type` tt ON tt.`name` = TRIM(t.`type`)
   SET t.`typeId` = tt.`id`;

-- AlterTable
ALTER TABLE `trishaw` DROP COLUMN `type`;

-- CreateIndex
CREATE INDEX `trishaw_typeId_idx` ON `trishaw`(`typeId`);

-- AddForeignKey
ALTER TABLE `trishaw` ADD CONSTRAINT `trishaw_typeId_fkey` FOREIGN KEY (`typeId`) REFERENCES `trishaw_type`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
