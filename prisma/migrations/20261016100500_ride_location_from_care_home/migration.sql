INSERT INTO `ride_location` (`id`, `chapterId`, `kind`, `name`, `address`, `latitude`, `longitude`, `createdAt`, `updatedAt`)
SELECT REPLACE(UUID(), '-', ''), o.`id`, 'careCenter', LEFT(TRIM(o.`careHomeName`), 160), LEFT(o.`address`, 240), o.`latitude`, o.`longitude`, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `organization` o
WHERE TRIM(COALESCE(o.`careHomeName`, '')) <> ''
  AND NOT EXISTS (SELECT 1 FROM `ride_location` l WHERE l.`chapterId` = o.`id`);
