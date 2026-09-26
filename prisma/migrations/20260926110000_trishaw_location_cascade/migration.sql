-- DropForeignKey
ALTER TABLE `trishaw` DROP FOREIGN KEY `trishaw_storageLocationId_fkey`;

-- AddForeignKey
ALTER TABLE `trishaw` ADD CONSTRAINT `trishaw_storageLocationId_fkey` FOREIGN KEY (`storageLocationId`) REFERENCES `storage_location`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
