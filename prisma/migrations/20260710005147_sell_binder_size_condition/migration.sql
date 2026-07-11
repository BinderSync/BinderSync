-- AlterTable
ALTER TABLE "SellBinder" ADD COLUMN     "size" INTEGER NOT NULL DEFAULT 9;

-- AlterTable
ALTER TABLE "SellBinderCard" ADD COLUMN     "condition" TEXT NOT NULL DEFAULT 'NM';
