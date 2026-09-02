CREATE TABLE `generation_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`template` text NOT NULL,
	`access_type` text NOT NULL,
	`status` text NOT NULL,
	`plan` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_generation_events_user_access_status` ON `generation_events` (`user_id`,`access_type`,`status`);--> statement-breakpoint
CREATE INDEX `idx_generation_events_created` ON `generation_events` (`created_at`);
--> statement-breakpoint
PRAGMA optimize;
