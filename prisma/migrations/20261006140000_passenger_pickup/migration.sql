-- AlterTable
ALTER TABLE `passenger` ADD COLUMN `residence` ENUM('careHome', 'home') NULL,
    ADD COLUMN `address` TEXT NULL,
    ADD COLUMN `latitude` DOUBLE NULL,
    ADD COLUMN `longitude` DOUBLE NULL;
