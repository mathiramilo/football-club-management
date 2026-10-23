-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" CITEXT NOT NULL,
    "email_verified_at" TIMESTAMPTZ(6),
    "first_name" TEXT,
    "last_name" TEXT,
    "nickname" TEXT,
    "birthdate" DATE,
    "photo_key" TEXT,
    "phone" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'es',
    "deletion_requested_at" TIMESTAMPTZ(6),
    "purge_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clubs" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT,
    "crest_key" TEXT,
    "primary_color" TEXT,
    "secondary_color" TEXT,
    "country_code" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "default_locale" TEXT NOT NULL DEFAULT 'es',
    "quiet_hours_start" TIME(6) NOT NULL DEFAULT '22:00:00'::time without time zone,
    "quiet_hours_end" TIME(6) NOT NULL DEFAULT '08:00:00'::time without time zone,
    "ai_enabled" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMPTZ(6),
    "purge_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'f11',
    "gender" TEXT,
    "age_group" TEXT,
    "color" TEXT,
    "min_players_practice" SMALLINT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_memberships" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "user_id" UUID,
    "is_owner" BOOLEAN NOT NULL DEFAULT false,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "managed_first_name" TEXT,
    "managed_last_name" TEXT,
    "managed_nickname" TEXT,
    "managed_birthdate" DATE,
    "contact_email" CITEXT,
    "contact_phone" TEXT,
    "primary_position" TEXT,
    "secondary_positions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "jersey_number" SMALLINT,
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_memberships" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "club_membership_id" UUID NOT NULL,
    "staff_role" TEXT,
    "staff_title" TEXT,
    "is_player" BOOLEAN NOT NULL DEFAULT false,
    "starts_on" DATE NOT NULL,
    "ends_on" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "category_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venues" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "maps_url" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "notes" TEXT,
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "venues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "categories_club_id_idx" ON "categories"("club_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_id_club_id_key" ON "categories"("id", "club_id");

-- CreateIndex
CREATE INDEX "club_memberships_user_id_idx" ON "club_memberships"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "club_memberships_id_club_id_key" ON "club_memberships"("id", "club_id");

-- CreateIndex
CREATE UNIQUE INDEX "club_memberships_club_id_user_id_key" ON "club_memberships"("club_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "club_memberships_one_owner_per_club" ON "club_memberships"("club_id") WHERE (is_owner);

-- CreateIndex
CREATE INDEX "category_memberships_category_id_ends_on_idx" ON "category_memberships"("category_id", "ends_on");

-- CreateIndex
CREATE INDEX "category_memberships_club_membership_id_idx" ON "category_memberships"("club_membership_id");

-- CreateIndex
CREATE INDEX "category_memberships_club_id_idx" ON "category_memberships"("club_id");

-- CreateIndex
CREATE UNIQUE INDEX "category_memberships_one_open_per_person" ON "category_memberships"("category_id", "club_membership_id") WHERE ("ends_on" IS NULL);

-- CreateIndex
CREATE INDEX "venues_club_id_idx" ON "venues"("club_id");

-- CreateIndex
CREATE UNIQUE INDEX "venues_id_club_id_key" ON "venues"("id", "club_id");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_memberships" ADD CONSTRAINT "club_memberships_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_memberships" ADD CONSTRAINT "club_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_memberships" ADD CONSTRAINT "category_memberships_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_memberships" ADD CONSTRAINT "category_memberships_category_id_club_id_fkey" FOREIGN KEY ("category_id", "club_id") REFERENCES "categories"("id", "club_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_memberships" ADD CONSTRAINT "category_memberships_club_membership_id_club_id_fkey" FOREIGN KEY ("club_membership_id", "club_id") REFERENCES "club_memberships"("id", "club_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venues" ADD CONSTRAINT "venues_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Hand-written: what schema.prisma can't express

-- unaccent() is only STABLE; pinning the dictionary makes it safe to use in an index.
CREATE FUNCTION immutable_unaccent(text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  RETURN public.unaccent('public.unaccent'::regdictionary, $1);

-- BR-CLUB-02: category names are unique per club, ignoring case and accents, among non-archived categories.
CREATE UNIQUE INDEX "categories_club_id_name_active_key"
  ON "categories" ("club_id", lower(immutable_unaccent("name")))
  WHERE "archived_at" IS NULL;

ALTER TABLE "categories"
  ADD CONSTRAINT "categories_format_check" CHECK ("format" IN ('f11', 'f9', 'f8', 'f7', 'f5', 'futsal')),
  ADD CONSTRAINT "categories_gender_check" CHECK ("gender" IN ('men', 'women', 'mixed'));

ALTER TABLE "club_memberships"
  ADD CONSTRAINT "club_memberships_status_check" CHECK ("status" IN ('active', 'removed')),
  ADD CONSTRAINT "club_memberships_managed_profile_name_check"
    CHECK ("user_id" IS NOT NULL OR ("managed_first_name" IS NOT NULL AND "managed_last_name" IS NOT NULL)),
  ADD CONSTRAINT "club_memberships_primary_position_check" CHECK ("primary_position" IN (
    'gk', 'cb', 'rb', 'lb', 'rwb', 'lwb', 'dm', 'cm', 'am', 'rm', 'lm', 'rw', 'lw', 'st', 'fx', 'ala', 'piv')),
  ADD CONSTRAINT "club_memberships_secondary_positions_check" CHECK (
    cardinality("secondary_positions") <= 2
    AND "secondary_positions" <@ ARRAY[
      'gk', 'cb', 'rb', 'lb', 'rwb', 'lwb', 'dm', 'cm', 'am', 'rm', 'lm', 'rw', 'lw', 'st', 'fx', 'ala', 'piv']),
  ADD CONSTRAINT "club_memberships_jersey_number_check" CHECK ("jersey_number" BETWEEN 1 AND 99);

ALTER TABLE "category_memberships"
  ADD CONSTRAINT "category_memberships_staff_role_check" CHECK ("staff_role" IN ('dt', 'coach')),
  ADD CONSTRAINT "category_memberships_staff_or_player_check" CHECK ("staff_role" IS NOT NULL OR "is_player");
