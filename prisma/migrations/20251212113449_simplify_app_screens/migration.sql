/*
  Warnings:

  - You are about to drop the column `description` on the `app_screens` table. All the data in the column will be lost.
  - You are about to drop the column `form_id` on the `app_screens` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `app_screens` table. All the data in the column will be lost.
  - You are about to drop the column `is_protected` on the `app_screens` table. All the data in the column will be lost.
  - You are about to drop the column `layout` on the `app_screens` table. All the data in the column will be lost.
  - You are about to drop the column `permissions` on the `app_screens` table. All the data in the column will be lost.
  - You are about to drop the column `route` on the `app_screens` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[context,name]` on the table `app_screens` will be added. If there are existing duplicate values, this will fail.
  - Made the column `icon` on table `app_screens` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "app_screens_context_route_key";

-- DropIndex
DROP INDEX "app_screens_is_active_idx";

-- AlterTable
ALTER TABLE "app_screens" DROP COLUMN "description",
DROP COLUMN "form_id",
DROP COLUMN "is_active",
DROP COLUMN "is_protected",
DROP COLUMN "layout",
DROP COLUMN "permissions",
DROP COLUMN "route",
ALTER COLUMN "icon" SET NOT NULL;

-- CreateIndex
CREATE INDEX "app_screens_order_idx" ON "app_screens"("order");

-- CreateIndex
CREATE UNIQUE INDEX "app_screens_context_name_key" ON "app_screens"("context", "name");
