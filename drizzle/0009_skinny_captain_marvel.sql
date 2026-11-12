ALTER TABLE `tenantInvitations` MODIFY COLUMN `role` enum('tenant_admin','branch_admin','cashier') NOT NULL DEFAULT 'cashier';--> statement-breakpoint
ALTER TABLE `tenantMembers` MODIFY COLUMN `role` enum('tenant_admin','branch_admin','cashier') NOT NULL DEFAULT 'cashier';--> statement-breakpoint
ALTER TABLE `subscriptionPlans` ADD `tier` enum('bronze','silver','gold','platinum') DEFAULT 'bronze' NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptionPlans` ADD `branchLimit` int DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptionPlans` ADD `cashierLimit` int DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptionPlans` ADD `availability` enum('available','coming_soon','archived') DEFAULT 'available' NOT NULL;--> statement-breakpoint
ALTER TABLE `tenantSubscriptions` ADD `branchLimit` int DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE `tenantSubscriptions` ADD `cashierLimit` int DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE `tenants` ADD `activePlanId` int;