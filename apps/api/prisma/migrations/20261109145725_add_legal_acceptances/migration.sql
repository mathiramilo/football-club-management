-- CreateTable
CREATE TABLE "legal_acceptances" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "document" TEXT NOT NULL,
    "version" DATE NOT NULL,
    "accepted_at" TIMESTAMPTZ(6) NOT NULL,
    "platform" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legal_acceptances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "legal_acceptances_user_id_document_version_key" ON "legal_acceptances"("user_id", "document", "version");

-- AddForeignKey
ALTER TABLE "legal_acceptances" ADD CONSTRAINT "legal_acceptances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Hand-written
ALTER TABLE legal_acceptances
  ADD CONSTRAINT legal_acceptances_document_check
    CHECK (document IN ('terms', 'privacy')),
  ADD CONSTRAINT legal_acceptances_platform_check
    CHECK (platform IN ('ios', 'android', 'web'));
