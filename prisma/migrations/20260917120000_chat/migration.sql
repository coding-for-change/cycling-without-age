-- AlterTable
ALTER TABLE `user` ADD COLUMN `notifyChatEmail` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `notifyChatPush` BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE `conversation` (
    `id` VARCHAR(191) NOT NULL,
    `kind` ENUM('direct', 'group') NOT NULL,
    `origin` ENUM('manual', 'ride') NOT NULL DEFAULT 'manual',
    `title` VARCHAR(120) NULL,
    `chapterId` VARCHAR(191) NULL,
    `createdByUserId` VARCHAR(191) NULL,
    `directKey` VARCHAR(191) NULL,
    `dek` VARBINARY(80) NOT NULL,
    `keyVersion` INTEGER NOT NULL DEFAULT 1,
    `announcementOnly` BOOLEAN NOT NULL DEFAULT false,
    `lastSeq` INTEGER NOT NULL DEFAULT 0,
    `lastMessageId` VARCHAR(191) NULL,
    `lastMessageAt` DATETIME(3) NULL,
    `frozenAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `conversation_directKey_key`(`directKey`),
    INDEX `conversation_chapterId_lastMessageAt_idx`(`chapterId`, `lastMessageAt`),
    INDEX `conversation_createdByUserId_idx`(`createdByUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conversation_member` (
    `conversationId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` ENUM('owner', 'member') NOT NULL DEFAULT 'member',
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastReadSeq` INTEGER NOT NULL DEFAULT 0,
    `lastReadAt` DATETIME(3) NULL,
    `mutedUntil` DATETIME(3) NULL,

    INDEX `conversation_member_userId_idx`(`userId`),
    PRIMARY KEY (`conversationId`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chat_message` (
    `id` VARCHAR(191) NOT NULL,
    `conversationId` VARCHAR(191) NOT NULL,
    `seq` INTEGER NOT NULL,
    `senderId` VARCHAR(191) NULL,
    `kind` ENUM('text', 'system') NOT NULL DEFAULT 'text',
    `body` BLOB NOT NULL,
    `meta` JSON NULL,
    `replyToId` VARCHAR(191) NULL,
    `clientId` VARCHAR(64) NULL,
    `editedAt` DATETIME(3) NULL,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `chat_message_createdAt_idx`(`createdAt`),
    INDEX `chat_message_senderId_idx`(`senderId`),
    INDEX `chat_message_replyToId_idx`(`replyToId`),
    UNIQUE INDEX `chat_message_conversationId_seq_key`(`conversationId`, `seq`),
    UNIQUE INDEX `chat_message_conversationId_senderId_clientId_key`(`conversationId`, `senderId`, `clientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chat_reaction` (
    `messageId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `emoji` VARCHAR(32) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `chat_reaction_userId_idx`(`userId`),
    PRIMARY KEY (`messageId`, `userId`, `emoji`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `conversation` ADD CONSTRAINT `conversation_chapterId_fkey` FOREIGN KEY (`chapterId`) REFERENCES `organization`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversation` ADD CONSTRAINT `conversation_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversation_member` ADD CONSTRAINT `conversation_member_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `conversation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversation_member` ADD CONSTRAINT `conversation_member_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_message` ADD CONSTRAINT `chat_message_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `conversation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_message` ADD CONSTRAINT `chat_message_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_message` ADD CONSTRAINT `chat_message_replyToId_fkey` FOREIGN KEY (`replyToId`) REFERENCES `chat_message`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_reaction` ADD CONSTRAINT `chat_reaction_messageId_fkey` FOREIGN KEY (`messageId`) REFERENCES `chat_message`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_reaction` ADD CONSTRAINT `chat_reaction_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
