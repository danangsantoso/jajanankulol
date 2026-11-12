CREATE TABLE `subscriptionPlans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`durationDays` int NOT NULL,
	`regularPrice` decimal(12,2) NOT NULL DEFAULT '0',
	`salePrice` decimal(12,2),
	`isActive` enum('yes','no') NOT NULL DEFAULT 'yes',
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptionPlans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenantSubscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`planId` int,
	`status` enum('trial','active','expired','cancelled') NOT NULL DEFAULT 'trial',
	`startsAt` timestamp NOT NULL,
	`endsAt` timestamp NOT NULL,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenantSubscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `tenants` ADD `subscriptionStatus` enum('trial','active','expired','suspended') DEFAULT 'trial' NOT NULL;--> statement-breakpoint
ALTER TABLE `tenants` ADD `trialEndsAt` timestamp;--> statement-breakpoint
ALTER TABLE `tenants` ADD `subscriptionStartsAt` timestamp;--> statement-breakpoint
ALTER TABLE `tenants` ADD `subscriptionEndsAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `googleSubject` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `passwordUpdatedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `status` enum('active','inactive') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_googleSubject_unique` UNIQUE(`googleSubject`);--> statement-breakpoint
CREATE INDEX `subscription_plans_active_idx` ON `subscriptionPlans` (`isActive`,`sortOrder`);--> statement-breakpoint
CREATE INDEX `tenant_subscriptions_tenant_idx` ON `tenantSubscriptions` (`tenantId`);--> statement-breakpoint
CREATE INDEX `tenant_subscriptions_ends_idx` ON `tenantSubscriptions` (`endsAt`);