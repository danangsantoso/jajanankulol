CREATE TABLE `branches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`code` varchar(48) NOT NULL,
	`address` varchar(255),
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `branches_id` PRIMARY KEY(`id`),
	CONSTRAINT `branches_tenant_code_unique` UNIQUE(`tenantId`,`code`)
);
--> statement-breakpoint
CREATE TABLE `platformSettings` (
	`id` int NOT NULL,
	`whatsappNumber` varchar(24),
	`whatsappMessage` varchar(500) DEFAULT 'Halo Jajananku, saya ingin mengetahui solusi POS untuk usaha saya.',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platformSettings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenantMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`userId` int NOT NULL,
	`branchId` int,
	`role` enum('tenant_admin','cashier') NOT NULL DEFAULT 'cashier',
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenantMembers_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenant_members_tenant_user_unique` UNIQUE(`tenantId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`slug` varchar(120) NOT NULL,
	`status` enum('active','suspended') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenants_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenants_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('cashier','admin','superadmin') NOT NULL DEFAULT 'cashier';--> statement-breakpoint
ALTER TABLE `products` ADD `tenantId` int;--> statement-breakpoint
ALTER TABLE `products` ADD `branchId` int;--> statement-breakpoint
ALTER TABLE `salesTransactions` ADD `tenantId` int;--> statement-breakpoint
ALTER TABLE `salesTransactions` ADD `branchId` int;--> statement-breakpoint
ALTER TABLE `stockMovements` ADD `tenantId` int;--> statement-breakpoint
ALTER TABLE `stockMovements` ADD `branchId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `activeBranchId` int;--> statement-breakpoint
CREATE INDEX `branches_tenant_idx` ON `branches` (`tenantId`);--> statement-breakpoint
CREATE INDEX `tenant_members_tenant_idx` ON `tenantMembers` (`tenantId`);--> statement-breakpoint
CREATE INDEX `tenant_members_user_idx` ON `tenantMembers` (`userId`);--> statement-breakpoint
CREATE INDEX `tenant_members_branch_idx` ON `tenantMembers` (`branchId`);--> statement-breakpoint
CREATE INDEX `tenants_status_idx` ON `tenants` (`status`);--> statement-breakpoint
CREATE INDEX `products_tenant_branch_idx` ON `products` (`tenantId`,`branchId`);--> statement-breakpoint
CREATE INDEX `transactions_tenant_branch_paid_idx` ON `salesTransactions` (`tenantId`,`branchId`,`paidAt`);--> statement-breakpoint
CREATE INDEX `stock_movements_tenant_branch_idx` ON `stockMovements` (`tenantId`,`branchId`);