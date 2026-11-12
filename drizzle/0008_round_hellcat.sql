ALTER TABLE `tenants` ADD `ownerName` varchar(160);--> statement-breakpoint
ALTER TABLE `tenants` ADD `whatsappNumber` varchar(24);--> statement-breakpoint
ALTER TABLE `tenants` ADD `businessAddress` varchar(255);--> statement-breakpoint
ALTER TABLE `tenants` ADD `businessDescription` text;--> statement-breakpoint
ALTER TABLE `tenants` ADD `onboardingStatus` enum('pending','complete') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `tenants` ADD `onboardingCompletedAt` timestamp;