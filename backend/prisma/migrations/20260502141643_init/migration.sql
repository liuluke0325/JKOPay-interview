-- CreateEnum
CREATE TYPE "Category" AS ENUM ('ORG', 'CAMPAIGN', 'MERCHANDISE');

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "subCategory" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "logoUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amountRaised" INTEGER,
    "amountGoal" INTEGER,
    "deadline" TIMESTAMP(3),
    "price" INTEGER,
    "stock" INTEGER,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Item_category_subCategory_createdAt_idx" ON "Item"("category", "subCategory", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Item_title_idx" ON "Item"("title");
