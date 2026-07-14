-- CreateTable
CREATE TABLE "BinderVisit" (
    "id" TEXT NOT NULL,
    "sellBinderId" TEXT NOT NULL,
    "fromQr" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BinderVisit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BinderVisit_sellBinderId_createdAt_idx" ON "BinderVisit"("sellBinderId", "createdAt");

-- AddForeignKey
ALTER TABLE "BinderVisit" ADD CONSTRAINT "BinderVisit_sellBinderId_fkey" FOREIGN KEY ("sellBinderId") REFERENCES "SellBinder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
