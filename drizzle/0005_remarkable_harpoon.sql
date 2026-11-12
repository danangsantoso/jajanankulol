CREATE TABLE `tenantInvitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`branchId` int NOT NULL,
	`role` enum('cashier') NOT NULL DEFAULT 'cashier',
	`status` enum('pending','claimed','revoked') NOT NULL DEFAULT 'pending',
	`invitedBy` int NOT NULL,
	`invitedAt` timestamp NOT NULL DEFAULT (now()),
	`claimedAt` timestamp,
	CONSTRAINT `tenantInvitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenant_invitations_tenant_email_unique` UNIQUE(`tenantId`,`email`)
);
--> statement-breakpoint
CREATE INDEX `tenant_invitations_tenant_idx` ON `tenantInvitations` (`tenantId`);--> statement-breakpoint
CREATE INDEX `tenant_invitations_branch_idx` ON `tenantInvitations` (`branchId`);