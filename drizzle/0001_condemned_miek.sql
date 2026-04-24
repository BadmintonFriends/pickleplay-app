CREATE TABLE `players` (
	`id` int AUTO_INCREMENT NOT NULL,
	`registrationId` int NOT NULL,
	`playerOrder` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`birthDate` varchar(10) NOT NULL,
	`phone` varchar(20) NOT NULL,
	`giftSize` varchar(20),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `players_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `registrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tournamentId` int NOT NULL,
	`tournamentEventId` int NOT NULL,
	`userId` int NOT NULL,
	`ageGroupId` int,
	`isSelfParticipant` boolean NOT NULL DEFAULT true,
	`status` enum('pending','confirmed','cancelled') NOT NULL DEFAULT 'pending',
	`paymentStatus` enum('unpaid','paid','refunded') NOT NULL DEFAULT 'unpaid',
	`paymentAmount` int NOT NULL DEFAULT 0,
	`registrationNumber` varchar(20),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `registrations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tournament_age_groups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tournamentId` int NOT NULL,
	`code` varchar(20) NOT NULL,
	`label` varchar(50) NOT NULL,
	`minAge` int NOT NULL,
	`maxAge` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tournament_age_groups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tournament_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tournamentId` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`fileUrl` varchar(1000) NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`fileSize` int NOT NULL DEFAULT 0,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tournament_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tournament_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tournamentId` int NOT NULL,
	`eventType` enum('남복','여복','혼복','남단','여단') NOT NULL,
	`skillLevel` varchar(50) NOT NULL,
	`maxTeams` int NOT NULL DEFAULT 40,
	`dayLabel` varchar(50),
	`currentTeams` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tournament_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tournament_posters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tournamentId` int NOT NULL,
	`imageUrl` varchar(1000) NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tournament_posters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tournaments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`startDate` varchar(10) NOT NULL,
	`endDate` varchar(10) NOT NULL,
	`venue` varchar(200) NOT NULL,
	`address` varchar(500) NOT NULL,
	`organizerInfo` text,
	`registrationStart` timestamp,
	`registrationEnd` timestamp,
	`feePerTeam` int NOT NULL DEFAULT 0,
	`giftDescription` varchar(500),
	`sizeType` enum('numeric','alpha') NOT NULL DEFAULT 'numeric',
	`sizeOptions` varchar(500),
	`hasAgeGroup` boolean NOT NULL DEFAULT false,
	`hasSingles` boolean NOT NULL DEFAULT false,
	`bankName` varchar(100),
	`accountNumber` varchar(100),
	`accountHolder` varchar(100),
	`paymentNote` text,
	`status` enum('draft','open','closed','cancelled') NOT NULL DEFAULT 'draft',
	`organizerId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tournaments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','organizer','admin','super_admin') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(20);