CREATE TABLE `tenantReceiptSettings` (
	`tenantId` int NOT NULL,
	`template` enum('simple','standard','complete') NOT NULL DEFAULT 'standard',
	`paperWidth` enum('58','80') NOT NULL DEFAULT '58',
	`autoPrint` enum('yes','no') NOT NULL DEFAULT 'no',
	`receiptFooter` varchar(255) NOT NULL DEFAULT 'Terima kasih sudah berbelanja.',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenantReceiptSettings_tenantId` PRIMARY KEY(`tenantId`)
);
