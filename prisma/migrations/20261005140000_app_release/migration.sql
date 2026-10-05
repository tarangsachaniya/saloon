-- CreateTable
CREATE TABLE "AppRelease" (
    "id" TEXT NOT NULL,
    "versionCode" INTEGER NOT NULL,
    "versionName" TEXT NOT NULL,
    "apkKey" TEXT NOT NULL,
    "apkUrl" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "notes" TEXT,
    "mandatory" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppRelease_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppRelease_versionCode_key" ON "AppRelease"("versionCode");

-- CreateIndex
CREATE INDEX "AppRelease_isActive_versionCode_idx" ON "AppRelease"("isActive", "versionCode");
