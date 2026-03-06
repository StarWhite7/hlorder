-- Create enum for catalog segmentation
CREATE TYPE "CatalogType" AS ENUM ('CLIENT', 'ENTREPRISE');

-- Split products and menus into dedicated catalogs
ALTER TABLE "Product"
ADD COLUMN "catalogType" "CatalogType" NOT NULL DEFAULT 'CLIENT';

ALTER TABLE "Menu"
ADD COLUMN "catalogType" "CatalogType" NOT NULL DEFAULT 'CLIENT';

-- Add indexes for role-based catalog reads
CREATE INDEX "Product_catalogType_idx" ON "Product"("catalogType");
CREATE INDEX "Product_catalogType_isActive_idx" ON "Product"("catalogType", "isActive");
CREATE INDEX "Menu_catalogType_idx" ON "Menu"("catalogType");
CREATE INDEX "Menu_catalogType_isActive_idx" ON "Menu"("catalogType", "isActive");
