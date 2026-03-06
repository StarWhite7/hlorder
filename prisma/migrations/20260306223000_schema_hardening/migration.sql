-- Add auth/account lifecycle columns
ALTER TABLE "UserAuth"
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "deletedAt" TIMESTAMP(3);

ALTER TABLE "Client"
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Entreprise"
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Add useful lifecycle indexes
CREATE INDEX "UserAuth_isActive_idx" ON "UserAuth"("isActive");
CREATE INDEX "UserAuth_deletedAt_idx" ON "UserAuth"("deletedAt");
CREATE INDEX "Client_isActive_idx" ON "Client"("isActive");
CREATE INDEX "Client_deletedAt_idx" ON "Client"("deletedAt");
CREATE INDEX "Entreprise_isActive_idx" ON "Entreprise"("isActive");
CREATE INDEX "Entreprise_deletedAt_idx" ON "Entreprise"("deletedAt");

-- Harden monetary and quantity values
ALTER TABLE "Product"
ADD CONSTRAINT "Product_priceWithDelivery_non_negative_chk"
CHECK ("priceWithDelivery" >= 0),
ADD CONSTRAINT "Product_priceWithoutDelivery_non_negative_chk"
CHECK ("priceWithoutDelivery" >= 0);

ALTER TABLE "Menu"
ADD CONSTRAINT "Menu_priceWithDelivery_non_negative_chk"
CHECK ("priceWithDelivery" >= 0),
ADD CONSTRAINT "Menu_priceWithoutDelivery_non_negative_chk"
CHECK ("priceWithoutDelivery" >= 0);

ALTER TABLE "MenuProduct"
ADD CONSTRAINT "MenuProduct_quantity_positive_chk"
CHECK ("quantity" > 0);

ALTER TABLE "OrderItem"
ADD CONSTRAINT "OrderItem_quantity_positive_chk"
CHECK ("quantity" > 0),
ADD CONSTRAINT "OrderItem_unitPrice_non_negative_chk"
CHECK ("unitPrice" >= 0),
ADD CONSTRAINT "OrderItem_totalPrice_non_negative_chk"
CHECK ("totalPrice" >= 0);
