-- AlterTable
ALTER TABLE "Storage" ADD COLUMN "id" TEXT;

UPDATE "Storage" SET "id" = gen_random_uuid()::text WHERE "id" IS NULL;

ALTER TABLE "Storage" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "Storage" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

ALTER TABLE "Storage" DROP CONSTRAINT "Storage_pkey";
ALTER TABLE "Storage" ADD CONSTRAINT "Storage_pkey" PRIMARY KEY ("id");

CREATE UNIQUE INDEX "Storage_key_key" ON "Storage"("key");
