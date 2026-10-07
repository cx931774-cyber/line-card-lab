CREATE TABLE `uploaded_images` (
  `key` text PRIMARY KEY NOT NULL,
  `content_type` text NOT NULL,
  `byte_size` integer NOT NULL,
  `chunk_count` integer NOT NULL,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `uploaded_image_chunks` (
  `image_key` text NOT NULL,
  `chunk_index` integer NOT NULL,
  `data` text NOT NULL,
  PRIMARY KEY (`image_key`, `chunk_index`),
  FOREIGN KEY (`image_key`) REFERENCES `uploaded_images`(`key`) ON UPDATE no action ON DELETE cascade
);
