-- CreateTable
CREATE TABLE "app_config" (
    "platform" TEXT NOT NULL,
    "minimum_version" TEXT,
    "store_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_config_pkey" PRIMARY KEY ("platform")
);

-- Hand-written
ALTER TABLE app_config
  ADD CONSTRAINT app_config_platform_check
    CHECK (platform IN ('ios', 'android', 'web')),
  ADD CONSTRAINT app_config_minimum_version_check
    CHECK (minimum_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'),
  ADD CONSTRAINT app_config_store_url_check
    CHECK (store_url ~ '^https://');

INSERT INTO app_config (platform) VALUES ('ios'), ('android'), ('web');
