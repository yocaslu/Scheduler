-- DropIndex
DROP INDEX `agenda_slot` ON `agendamento_slots`;

-- CreateIndex
CREATE UNIQUE INDEX `uk_slot_data_horario` ON `agendamento_slots`(`data`, `horario_inicio`);
