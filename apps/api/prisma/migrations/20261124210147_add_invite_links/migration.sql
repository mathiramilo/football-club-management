-- CreateTable
CREATE TABLE "invite_links" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "token_hash" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "requires_approval" BOOLEAN NOT NULL,
    "expires_at" TIMESTAMPTZ(6),
    "max_uses" INTEGER,
    "uses_count" INTEGER NOT NULL DEFAULT 0,
    "revoked_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invite_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invite_links_token_hash_key" ON "invite_links"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "invite_links_code_key" ON "invite_links"("code");

-- CreateIndex
CREATE INDEX "invite_links_club_id_idx" ON "invite_links"("club_id");

-- CreateIndex
CREATE INDEX "invite_links_category_id_created_at_idx" ON "invite_links"("category_id", "created_at") WHERE (revoked_at IS NULL);

-- CreateIndex
CREATE UNIQUE INDEX "invite_links_id_club_id_key" ON "invite_links"("id", "club_id");

-- CreateIndex
CREATE UNIQUE INDEX "invite_links_one_default_per_category" ON "invite_links"("category_id") WHERE (is_default AND revoked_at IS NULL);

-- AddForeignKey
ALTER TABLE "invite_links" ADD CONSTRAINT "invite_links_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invite_links" ADD CONSTRAINT "invite_links_category_id_club_id_fkey" FOREIGN KEY ("category_id", "club_id") REFERENCES "categories"("id", "club_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Hand-written: what schema.prisma can't express

CREATE TRIGGER invite_links_club_id_immutable BEFORE UPDATE OF club_id ON "invite_links"
  FOR EACH ROW EXECUTE FUNCTION forbid_club_id_change();

ALTER TABLE "invite_links"
  ADD CONSTRAINT "invite_links_role_check" CHECK ("role" IN ('player', 'coach', 'dt')),
  ADD CONSTRAINT "invite_links_code_check" CHECK ("code" ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$'),
  ADD CONSTRAINT "invite_links_max_uses_check" CHECK ("max_uses" >= 1),
  ADD CONSTRAINT "invite_links_uses_count_check" CHECK ("uses_count" >= 0),
  -- BR-CLUB-08: staff links always require approval.
  ADD CONSTRAINT "invite_links_staff_requires_approval_check"
    CHECK ("role" = 'player' OR "requires_approval"),
  -- CLUB-05: the default link is a player link that never expires and has no use limit.
  ADD CONSTRAINT "invite_links_default_check"
    CHECK (NOT "is_default" OR ("role" = 'player' AND "expires_at" IS NULL AND "max_uses" IS NULL));
