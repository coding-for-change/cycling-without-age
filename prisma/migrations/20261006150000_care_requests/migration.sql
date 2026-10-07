-- CreateTable
CREATE TABLE `care_request` (
    `id` VARCHAR(191) NOT NULL,
    `chapterId` VARCHAR(191) NOT NULL,
    `caretakerUserId` VARCHAR(191) NOT NULL,
    `requestedByUserId` VARCHAR(191) NULL,
    `status` ENUM('pending', 'accepted', 'declined') NOT NULL DEFAULT 'pending',
    `firstName` TEXT NOT NULL,
    `lastName` TEXT NOT NULL,
    `birthDate` DATE NOT NULL,
    `gender` ENUM('female', 'male', 'other') NOT NULL,
    `residence` ENUM('careHome', 'home') NULL,
    `address` TEXT NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `relationship` VARCHAR(40) NULL,
    `passengerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `decidedAt` DATETIME(3) NULL,

    INDEX `care_request_caretakerUserId_status_idx`(`caretakerUserId`, `status`),
    INDEX `care_request_chapterId_status_idx`(`chapterId`, `status`),
    INDEX `care_request_requestedByUserId_idx`(`requestedByUserId`),
    INDEX `care_request_passengerId_idx`(`passengerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `care_request` ADD CONSTRAINT `care_request_chapterId_fkey` FOREIGN KEY (`chapterId`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `care_request` ADD CONSTRAINT `care_request_caretakerUserId_fkey` FOREIGN KEY (`caretakerUserId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `care_request` ADD CONSTRAINT `care_request_requestedByUserId_fkey` FOREIGN KEY (`requestedByUserId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `care_request` ADD CONSTRAINT `care_request_passengerId_fkey` FOREIGN KEY (`passengerId`) REFERENCES `passenger`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
