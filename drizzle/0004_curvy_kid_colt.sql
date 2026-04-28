CREATE TABLE `kpr_ratings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`rating` int NOT NULL DEFAULT 1000,
	`totalMatches` int NOT NULL DEFAULT 0,
	`wins` int NOT NULL DEFAULT 0,
	`losses` int NOT NULL DEFAULT 0,
	`winStreak` int NOT NULL DEFAULT 0,
	`bestRating` int NOT NULL DEFAULT 1000,
	`tier` enum('Bronze','Silver','Gold','Platinum','Diamond','Master','Champion') NOT NULL DEFAULT 'Bronze',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kpr_ratings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `match_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tournamentId` int,
	`tournamentEventId` int,
	`winner1Id` int NOT NULL,
	`winner2Id` int,
	`loser1Id` int NOT NULL,
	`loser2Id` int,
	`winnerScore` int NOT NULL,
	`loserScore` int NOT NULL,
	`ratingChange` int NOT NULL DEFAULT 0,
	`matchDate` varchar(10) NOT NULL,
	`matchType` enum('singles','doubles') NOT NULL DEFAULT 'doubles',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `match_results_id` PRIMARY KEY(`id`)
);
