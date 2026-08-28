CREATE TABLE `payment_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`plan` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`transaction_hash` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_submissions_transaction_hash_unique` ON `payment_submissions` (`transaction_hash`);--> statement-breakpoint
CREATE INDEX `idx_payment_submissions_user_created` ON `payment_submissions` (`user_id`,`created_at`);--> statement-breakpoint
PRAGMA optimize;
