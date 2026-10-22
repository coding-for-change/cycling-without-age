UPDATE `passenger` p
INNER JOIN `ride_location` l ON l.`id` = p.`rideLocationId`
SET p.`residence` = 'careHome'
WHERE l.`kind` = 'careCenter';

-- DropForeignKey
ALTER TABLE `passenger` DROP FOREIGN KEY `passenger_rideLocationId_fkey`;

-- DropForeignKey
ALTER TABLE `ride` DROP FOREIGN KEY `ride_rideLocationId_fkey`;

-- DropForeignKey
ALTER TABLE `ride_request` DROP FOREIGN KEY `ride_request_rideLocationId_fkey`;

-- DropForeignKey
ALTER TABLE `ride_location` DROP FOREIGN KEY `ride_location_chapterId_fkey`;

-- DropIndex
DROP INDEX `passenger_rideLocationId_idx` ON `passenger`;

-- DropIndex
DROP INDEX `ride_rideLocationId_startsAt_idx` ON `ride`;

-- DropIndex
DROP INDEX `ride_request_rideLocationId_idx` ON `ride_request`;

-- AlterTable
ALTER TABLE `passenger` DROP COLUMN `rideLocationId`;

-- AlterTable
ALTER TABLE `ride` DROP COLUMN `rideLocationId`;

-- AlterTable
ALTER TABLE `ride_request` DROP COLUMN `rideLocationId`;

-- DropTable
DROP TABLE `ride_location`;
