-- AlterTable
-- Narrows `RideRole` to the one role the app can actually staff. Every existing
-- row is already 'pilot': CWA's ambassadors and transporters are real, but
-- `ChapterRole` is admin/pilot/passenger, so nobody could ever be assigned as
-- one. Widening this again is a plain ENUM add when membership can express them.
ALTER TABLE `ride_assignment` MODIFY `role` ENUM('pilot') NOT NULL DEFAULT 'pilot';
