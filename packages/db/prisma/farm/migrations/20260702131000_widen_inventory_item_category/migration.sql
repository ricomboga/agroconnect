-- AlterTable
-- inventory_items.category widened from the InputType enum to free text, since
-- inventory items (e.g. animal feed, vaccines) cover categories the farm Input
-- model's enum doesn't include.
ALTER TABLE "inventory_items" ALTER COLUMN "category" TYPE TEXT;
