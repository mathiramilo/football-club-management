-- CreateTable
CREATE TABLE "join_requests" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "invite_link_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "requested_positions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "possible_duplicate_of" UUID,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "decided_by" UUID,
    "decided_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "join_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "join_requests_category_id_status_created_at_idx" ON "join_requests"("category_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "join_requests_club_id_status_idx" ON "join_requests"("club_id", "status");

-- CreateIndex
CREATE INDEX "join_requests_invite_link_id_idx" ON "join_requests"("invite_link_id");

-- CreateIndex
CREATE INDEX "join_requests_user_id_idx" ON "join_requests"("user_id");

-- CreateIndex
CREATE INDEX "join_requests_possible_duplicate_of_idx" ON "join_requests"("possible_duplicate_of") WHERE (possible_duplicate_of IS NOT NULL);

-- CreateIndex
CREATE UNIQUE INDEX "join_requests_one_pending_per_category" ON "join_requests"("category_id", "user_id") WHERE (status = 'pending');

-- AddForeignKey
ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_category_id_club_id_fkey" FOREIGN KEY ("category_id", "club_id") REFERENCES "categories"("id", "club_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_invite_link_id_club_id_fkey" FOREIGN KEY ("invite_link_id", "club_id") REFERENCES "invite_links"("id", "club_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_possible_duplicate_of_club_id_fkey" FOREIGN KEY ("possible_duplicate_of", "club_id") REFERENCES "club_memberships"("id", "club_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Hand-written: what schema.prisma can't express

CREATE TRIGGER join_requests_club_id_immutable BEFORE UPDATE OF club_id ON "join_requests"
  FOR EACH ROW EXECUTE FUNCTION forbid_club_id_change();

ALTER TABLE "join_requests"
  ADD CONSTRAINT "join_requests_status_check"
    CHECK ("status" IN ('pending', 'approved', 'rejected', 'expired', 'cancelled')),
  ADD CONSTRAINT "join_requests_decision_check"
    CHECK (("status" IN ('approved', 'rejected')) = ("decided_at" IS NOT NULL));
