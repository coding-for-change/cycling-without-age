-- DeleteDuplicates
DELETE `later` FROM `ride_photo` AS `later`
    INNER JOIN `ride_photo` AS `earlier`
    ON `later`.`fileId` = `earlier`.`fileId` AND `later`.`id` > `earlier`.`id`;

-- CreateIndex
CREATE UNIQUE INDEX `ride_photo_fileId_key` ON `ride_photo`(`fileId`);

-- DropIndex
DROP INDEX `ride_photo_fileId_idx` ON `ride_photo`;

-- DropIndex
DROP INDEX `ride_photo_rideId_fileId_key` ON `ride_photo`;
