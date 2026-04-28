ALTER TABLE `kpr_ratings` MODIFY COLUMN `rating` decimal(4,2) NOT NULL DEFAULT '3.00';--> statement-breakpoint
ALTER TABLE `kpr_ratings` MODIFY COLUMN `bestRating` decimal(4,2) NOT NULL DEFAULT '3.00';--> statement-breakpoint
ALTER TABLE `kpr_ratings` ADD `ratingDelta` decimal(4,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `kpr_ratings` ADD `weeklyRankDelta` int DEFAULT 0 NOT NULL;