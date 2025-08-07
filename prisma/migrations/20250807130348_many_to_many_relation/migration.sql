/*
  Warnings:

  - You are about to drop the column `lostId` on the `Founds` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Founds" DROP CONSTRAINT "Founds_lostId_fkey";

-- AlterTable
ALTER TABLE "public"."Founds" DROP COLUMN "lostId";

-- CreateTable
CREATE TABLE "public"."_LostsToFounds" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_LostsToFounds_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_LostsToFounds_B_index" ON "public"."_LostsToFounds"("B");

-- AddForeignKey
ALTER TABLE "public"."_LostsToFounds" ADD CONSTRAINT "_LostsToFounds_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Founds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_LostsToFounds" ADD CONSTRAINT "_LostsToFounds_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Losts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
