-- Google sign-in: the stable Google account id (OIDC `sub`) linked to a User.
-- Additive and nullable: no existing row is read, changed or locked beyond the
-- catalog update, and email/password users simply keep NULL.

-- AlterTable
ALTER TABLE "User" ADD COLUMN "googleId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
