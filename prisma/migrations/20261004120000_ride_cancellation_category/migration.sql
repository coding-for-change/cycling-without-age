-- AlterTable
ALTER TABLE `ride` ADD COLUMN `cancellationCategory` ENUM('weather', 'rider', 'facility', 'cwa', 'other') NULL;
