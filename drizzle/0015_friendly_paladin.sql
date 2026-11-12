CREATE TABLE `promotionItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`promotionId` int NOT NULL,
	`productId` int NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	CONSTRAINT `promotionItems_id` PRIMARY KEY(`id`),
	CONSTRAINT `promotion_items_product_unique` UNIQUE(`promotionId`,`productId`)
);
--> statement-breakpoint
CREATE TABLE `promotions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`branchId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`type` enum('discount','bundle') NOT NULL,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`discountType` enum('percentage','fixed'),
	`discountValue` decimal(12,2),
	`bundlePrice` decimal(12,2),
	`startsAt` timestamp NOT NULL,
	`endsAt` timestamp NOT NULL,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `promotions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `salesTransactionItems` ADD `discountAmount` decimal(12,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `salesTransactions` ADD `discountTotal` decimal(12,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `salesTransactions` ADD `promotionSummary` varchar(500);--> statement-breakpoint
CREATE INDEX `promotion_items_promotion_idx` ON `promotionItems` (`promotionId`);--> statement-breakpoint
CREATE INDEX `promotions_tenant_branch_idx` ON `promotions` (`tenantId`,`branchId`);--> statement-breakpoint
CREATE INDEX `promotions_active_period_idx` ON `promotions` (`status`,`startsAt`,`endsAt`);