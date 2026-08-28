CREATE TABLE `card_favorites` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`state_json` text NOT NULL,
	`preview_image` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_card_favorites_user_updated` ON `card_favorites` (`user_id`,`updated_at`);
--> statement-breakpoint
PRAGMA optimize;
