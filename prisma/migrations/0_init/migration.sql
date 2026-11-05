-- CreateTable
CREATE TABLE `agendamento_participantes` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `agendamento_id` INTEGER UNSIGNED NOT NULL,
    `nome` VARCHAR(150) NOT NULL,
    `telefone` VARCHAR(30) NULL,
    `principal` BOOLEAN NOT NULL DEFAULT false,

    INDEX `idx_participante_agendamento`(`agendamento_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `agendamento_slots` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `agendamento_id` INTEGER UNSIGNED NOT NULL,
    `data` DATE NOT NULL,
    `horario_inicio` TIME(0) NOT NULL,

    INDEX `agenda_slot`(`data`, `horario_inicio`),
    INDEX `idx_slot_agendamento`(`agendamento_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `agendamentos` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `cidadao_id` INTEGER UNSIGNED NULL,
    `nome` VARCHAR(150) NOT NULL,
    `motivo` TEXT NULL,
    `tratativa` TEXT NULL,
    `data` DATE NOT NULL,
    `horario` TIME(0) NOT NULL,
    `atendimento` ENUM('no_paco', 'marcado') NOT NULL DEFAULT 'marcado',
    `tipo_atendimento` ENUM('unico', 'grupo') NOT NULL DEFAULT 'unico',
    `blocos_json` JSON NULL,
    `email` VARCHAR(255) NULL,
    `telefone` VARCHAR(30) NULL,
    `cep` VARCHAR(20) NULL,
    `endereco` VARCHAR(255) NULL,
    `data_registro` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `status` ENUM('cancelado', 'pedido_nao_atendido', 'pedido_atendido', 'pedido_pendente') NOT NULL DEFAULT 'pedido_pendente',

    INDEX `idx_agendamento_cidadao`(`cidadao_id`),
    INDEX `idx_agendamento_data`(`data`),
    INDEX `idx_agendamento_nome`(`nome`),
    INDEX `idx_agendamento_status`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cidadaos` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(150) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `telefone` VARCHAR(30) NULL,
    `senha_hash` VARCHAR(255) NOT NULL,
    `cep` VARCHAR(20) NULL,
    `endereco` VARCHAR(255) NULL,
    `criado_em` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `usuario` VARCHAR(50) NULL,

    UNIQUE INDEX `uk_cidadao_email`(`email`),
    UNIQUE INDEX `uk_usuario_admin_email`(`usuario`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuarios_admin` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(150) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `senha_hash` VARCHAR(255) NOT NULL,
    `papel` ENUM('admin', 'visualizador') NOT NULL DEFAULT 'visualizador',
    `criado_em` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `usuario` VARCHAR(50) NULL,

    UNIQUE INDEX `uk_usuario_admin_email`(`email`),
    UNIQUE INDEX `uk_usuario_admin_usuario`(`usuario`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `agendamento_participantes` ADD CONSTRAINT `fk_participante_agendamento` FOREIGN KEY (`agendamento_id`) REFERENCES `agendamentos`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `agendamento_slots` ADD CONSTRAINT `fk_slot_agendamento` FOREIGN KEY (`agendamento_id`) REFERENCES `agendamentos`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `agendamentos` ADD CONSTRAINT `fk_agendamento_cidadao` FOREIGN KEY (`cidadao_id`) REFERENCES `cidadaos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
