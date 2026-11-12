CREATE TABLE `productLifecycleEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`productName` varchar(160) NOT NULL,
	`productQrCode` varchar(96) NOT NULL,
	`action` enum('archived','restored','deleted') NOT NULL,
	`stockAtAction` int NOT NULL,
	`tenantId` int NOT NULL,
	`branchId` int NOT NULL,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `productLifecycleEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `product_lifecycle_tenant_branch_idx` ON `productLifecycleEvents` (`tenantId`,`branchId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `product_lifecycle_product_idx` ON `productLifecycleEvents` (`productId`);