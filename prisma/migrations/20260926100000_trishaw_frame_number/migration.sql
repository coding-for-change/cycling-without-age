-- AlterTable
ALTER TABLE `trishaw` ADD COLUMN `frameNumber` VARCHAR(64) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `trishaw_frameNumber_key` ON `trishaw`(`frameNumber`);

