UPDATE `ride_roster_entry` SET `attendance` = 'booked' WHERE `attendance` = 'confirmed';

ALTER TABLE `ride_roster_entry` MODIFY `attendance` ENUM('booked', 'checkedIn', 'completed', 'noShow', 'cancelled') NOT NULL DEFAULT 'booked';

ALTER TABLE `ride_roster_entry` DROP COLUMN `confirmedAt`;
