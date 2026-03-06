-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CLIENT', 'ENTREPRISE');

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "UserAuth" (
    "id" SERIAL NOT NULL,
    "role" "Role" NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAuth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" SERIAL NOT NULL,
    "pseudo" TEXT NOT NULL,
    "nomInGame" TEXT NOT NULL,
    "prenomInGame" TEXT NOT NULL,
    "userAuthId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entreprise" (
    "id" SERIAL NOT NULL,
    "nomEntreprise" TEXT NOT NULL,
    "userAuthId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Entreprise_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Client_pseudo_key" ON "Client"("pseudo");

-- CreateIndex
CREATE UNIQUE INDEX "Client_userAuthId_key" ON "Client"("userAuthId");

-- CreateIndex
CREATE UNIQUE INDEX "Entreprise_nomEntreprise_key" ON "Entreprise"("nomEntreprise");

-- CreateIndex
CREATE UNIQUE INDEX "Entreprise_userAuthId_key" ON "Entreprise"("userAuthId");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_userAuthId_fkey" FOREIGN KEY ("userAuthId") REFERENCES "UserAuth"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entreprise" ADD CONSTRAINT "Entreprise_userAuthId_fkey" FOREIGN KEY ("userAuthId") REFERENCES "UserAuth"("id") ON DELETE CASCADE ON UPDATE CASCADE;

