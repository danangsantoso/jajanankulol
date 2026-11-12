CREATE TABLE `storeSettings` (
	`id` int NOT NULL,
	`storeName` varchar(120) NOT NULL DEFAULT 'Jajananku',
	`qrisReference` varchar(160),
	`receiptFooter` varchar(255) DEFAULT 'Terima kasih sudah berbelanja.',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `storeSettings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('cashier','admin') NOT NULL DEFAULT 'cashier';