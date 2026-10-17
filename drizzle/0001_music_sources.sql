CREATE TABLE `music_connection` (
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	PRIMARY KEY(`user_id`, `provider`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `preferences` ADD `music_source` text DEFAULT 'auto' NOT NULL;--> statement-breakpoint
ALTER TABLE `preferences` ADD `genres` text DEFAULT '[]' NOT NULL;