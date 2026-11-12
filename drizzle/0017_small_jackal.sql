ALTER TABLE `users` ADD CONSTRAINT `users_email_unique` UNIQUE(`email`);
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
