-- CreateTable
CREATE TABLE "email_code_requests" (
    "id" UUID NOT NULL,
    "email_hash" TEXT NOT NULL,
    "requested_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_code_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_code_requests_email_hash_requested_at_idx" ON "email_code_requests"("email_hash", "requested_at");
