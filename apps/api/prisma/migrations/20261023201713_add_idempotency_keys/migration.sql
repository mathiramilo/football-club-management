-- CreateTable
CREATE TABLE "idempotency_keys" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "key" UUID NOT NULL,
    "request_hash" TEXT NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL,
    "response_status" INTEGER,
    "response_body" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_keys_user_id_key_key" ON "idempotency_keys"("user_id", "key");

-- AddForeignKey
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Hand-written
ALTER TABLE idempotency_keys
  ADD CONSTRAINT idempotency_keys_response_status_check
    CHECK (response_status BETWEEN 200 AND 499),
  ADD CONSTRAINT idempotency_keys_response_body_needs_status_check
    CHECK (response_status IS NOT NULL OR response_body IS NULL);
