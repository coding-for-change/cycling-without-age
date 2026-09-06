-- AlterTable
ALTER TABLE `activity_event` MODIFY `type` ENUM('applicationSubmitted', 'applicationApproved', 'applicationRejected', 'roleGranted', 'roleRevoked', 'memberRemoved', 'emailSent', 'countryAdminAppointed', 'countryAdminRemoved', 'accountCreated', 'invited', 'accountClaimed', 'chapterCreated', 'chapterUpdated', 'chapterDeleted', 'countryDeleted') NOT NULL;
