-- CreateTable
CREATE TABLE "Reporters" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reporters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Losts" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "lastSeenLocation" TEXT NOT NULL,
    "lastSeenDate" TIMESTAMP(3) NOT NULL,
    "age" INTEGER,
    "gender" TEXT NOT NULL,
    "contactInfo" TEXT,
    "disease" TEXT,
    "mentalHealth" TEXT,
    "photo" TEXT,
    "photoMimeType" TEXT,
    "found" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reporterId" INTEGER NOT NULL,

    CONSTRAINT "Losts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Founds" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "foundLocation" TEXT NOT NULL,
    "foundDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "age" INTEGER,
    "gender" TEXT NOT NULL,
    "contactInfo" TEXT,
    "photo" TEXT,
    "photoMimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lostId" INTEGER,
    "reporterId" INTEGER NOT NULL,

    CONSTRAINT "Founds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Reporters_email_key" ON "Reporters"("email");

-- AddForeignKey
ALTER TABLE "Losts" ADD CONSTRAINT "Losts_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "Reporters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Founds" ADD CONSTRAINT "Founds_lostId_fkey" FOREIGN KEY ("lostId") REFERENCES "Losts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Founds" ADD CONSTRAINT "Founds_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "Reporters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
