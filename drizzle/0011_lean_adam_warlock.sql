CREATE TABLE `tournament_organizers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tournamentId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','manager') NOT NULL DEFAULT 'manager',
	`assignedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tournament_organizers_id` PRIMARY KEY(`id`),
	CONSTRAINT `tournament_organizers_tournamentId_userId_unique` UNIQUE(`tournamentId`,`userId`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','super_admin') NOT NULL DEFAULT 'user';