-- AlterTable
ALTER TABLE `user` ADD COLUMN `avatarSeed` VARCHAR(64) NULL,
    ADD COLUMN `reduceMotion` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `textSize` ENUM('normal', 'large', 'xLarge') NOT NULL DEFAULT 'normal';
