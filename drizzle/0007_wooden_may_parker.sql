ALTER TABLE `kpr_ratings` MODIFY COLUMN `rating` int NOT NULL DEFAULT 1000;--> statement-breakpoint
ALTER TABLE `kpr_ratings` MODIFY COLUMN `ratingDelta` int NOT NULL;--> statement-breakpoint
ALTER TABLE `kpr_ratings` MODIFY COLUMN `ratingDelta` int NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `kpr_ratings` MODIFY COLUMN `bestRating` int NOT NULL DEFAULT 1000;--> statement-breakpoint
ALTER TABLE `kpr_ratings` DROP COLUMN `tier`;