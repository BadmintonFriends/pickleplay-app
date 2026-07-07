CREATE TABLE `user_blocks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`blockerId` int NOT NULL,
	`blockedUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_blocks_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_blocks_blockerId_blockedUserId_unique` UNIQUE(`blockerId`,`blockedUserId`)
);
