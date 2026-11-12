CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`qrCode` varchar(96) NOT NULL,
	`salePrice` decimal(12,2) NOT NULL,
	`costPrice` decimal(12,2) NOT NULL,
	`stock` int NOT NULL DEFAULT 0,
	`lowStockThreshold` int NOT NULL DEFAULT 5,
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_qrCode_unique` UNIQUE(`qrCode`)
);
--> statement-breakpoint
CREATE TABLE `salesTransactionItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`transactionId` int NOT NULL,
	`productId` int NOT NULL,
	`productName` varchar(160) NOT NULL,
	`quantity` int NOT NULL,
	`unitPrice` decimal(12,2) NOT NULL,
	`unitCost` decimal(12,2) NOT NULL,
	`lineTotal` decimal(12,2) NOT NULL,
	`lineProfit` decimal(12,2) NOT NULL,
	CONSTRAINT `salesTransactionItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `salesTransactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`receiptNo` varchar(40) NOT NULL,
	`cashierId` int NOT NULL,
	`paymentMethod` enum('cash','qris') NOT NULL,
	`status` enum('paid') NOT NULL DEFAULT 'paid',
	`subtotal` decimal(12,2) NOT NULL,
	`total` decimal(12,2) NOT NULL,
	`amountReceived` decimal(12,2),
	`changeAmount` decimal(12,2) NOT NULL DEFAULT '0',
	`paidAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `salesTransactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `salesTransactions_receiptNo_unique` UNIQUE(`receiptNo`)
);
--> statement-breakpoint
CREATE TABLE `stockMovements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`transactionId` int,
	`type` enum('initial','sale','adjustment','restock') NOT NULL,
	`quantity` int NOT NULL,
	`previousStock` int NOT NULL,
	`resultingStock` int NOT NULL,
	`note` varchar(255),
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stockMovements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `products_status_idx` ON `products` (`status`);--> statement-breakpoint
CREATE INDEX `products_qr_idx` ON `products` (`qrCode`);--> statement-breakpoint
CREATE INDEX `transaction_items_transaction_idx` ON `salesTransactionItems` (`transactionId`);--> statement-breakpoint
CREATE INDEX `transaction_items_product_idx` ON `salesTransactionItems` (`productId`);--> statement-breakpoint
CREATE INDEX `transactions_paid_at_idx` ON `salesTransactions` (`paidAt`);--> statement-breakpoint
CREATE INDEX `transactions_cashier_idx` ON `salesTransactions` (`cashierId`);--> statement-breakpoint
CREATE INDEX `transactions_payment_idx` ON `salesTransactions` (`paymentMethod`);--> statement-breakpoint
CREATE INDEX `stock_movements_product_idx` ON `stockMovements` (`productId`);--> statement-breakpoint
CREATE INDEX `stock_movements_created_at_idx` ON `stockMovements` (`createdAt`);