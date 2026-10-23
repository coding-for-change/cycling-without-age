ALTER TABLE `user` RENAME COLUMN `consentDataAt` TO `privacyReadAt`,
    ADD COLUMN `privacyVersion` VARCHAR(16) NULL;
