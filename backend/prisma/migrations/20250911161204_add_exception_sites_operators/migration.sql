-- CreateTable
CREATE TABLE "public"."shift_exception_sites" (
    "id" TEXT NOT NULL,
    "shiftExceptionId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shift_exception_sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."shift_exception_operators" (
    "id" TEXT NOT NULL,
    "shiftExceptionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shift_exception_operators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shift_exception_sites_shiftExceptionId_siteId_key" ON "public"."shift_exception_sites"("shiftExceptionId", "siteId");

-- CreateIndex
CREATE UNIQUE INDEX "shift_exception_operators_shiftExceptionId_userId_key" ON "public"."shift_exception_operators"("shiftExceptionId", "userId");

-- CreateIndex
CREATE INDEX "shift_exceptions_date_idx" ON "public"."shift_exceptions"("date");

-- CreateIndex
CREATE INDEX "shifts_tenantId_date_idx" ON "public"."shifts"("tenantId", "date");

-- CreateIndex
CREATE INDEX "shifts_tenantId_createdAt_idx" ON "public"."shifts"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."shift_exception_sites" ADD CONSTRAINT "shift_exception_sites_shiftExceptionId_fkey" FOREIGN KEY ("shiftExceptionId") REFERENCES "public"."shift_exceptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shift_exception_sites" ADD CONSTRAINT "shift_exception_sites_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "public"."sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shift_exception_operators" ADD CONSTRAINT "shift_exception_operators_shiftExceptionId_fkey" FOREIGN KEY ("shiftExceptionId") REFERENCES "public"."shift_exceptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shift_exception_operators" ADD CONSTRAINT "shift_exception_operators_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
