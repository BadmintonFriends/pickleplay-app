ALTER TABLE `users` ADD `gender` enum('male','female');--> statement-breakpoint
ALTER TABLE `users` ADD `birthDate` varchar(10);--> statement-breakpoint
ALTER TABLE `users` ADD `termsAcceptedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `privacyAcceptedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_phone_unique` UNIQUE(`phone`);