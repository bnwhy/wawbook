ALTER TABLE "books" ADD COLUMN "product_page" jsonb;--> statement-breakpoint
ALTER TABLE "menus" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "menus" ADD COLUMN "visible" boolean DEFAULT true NOT NULL;