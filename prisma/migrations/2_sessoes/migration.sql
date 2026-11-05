-- CreateTable
CREATE TABLE `sessoes` (
    `id` VARCHAR(128) NOT NULL,
    `dados` TEXT NOT NULL,
    `expira_em` DATETIME(0) NOT NULL,

    INDEX `idx_sessao_expira_em`(`expira_em`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
