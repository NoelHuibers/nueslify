CREATE TABLE `audio_object` (
	`key` text PRIMARY KEY NOT NULL,
	`content_type` text NOT NULL,
	`data` blob NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `feed_state` (
	`key` text PRIMARY KEY NOT NULL,
	`etag` text,
	`last_modified` text,
	`fetched_at` integer,
	`failures` integer DEFAULT 0 NOT NULL,
	`retry_at` integer,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `preferences` ADD `news_sources` text DEFAULT '["tagesschau"]' NOT NULL;--> statement-breakpoint
ALTER TABLE `story` ADD `source_id` text DEFAULT 'tagesschau' NOT NULL;--> statement-breakpoint
ALTER TABLE `story` ADD `cluster_id` text DEFAULT '' NOT NULL;--> statement-breakpoint
-- Every existing (tagesschau) story starts as its own cluster.
UPDATE `story` SET `cluster_id` = `id`;--> statement-breakpoint
CREATE INDEX `story_source_published_idx` ON `story` (`source_id`,`published_at`);--> statement-breakpoint
CREATE INDEX `story_cluster_idx` ON `story` (`cluster_id`);