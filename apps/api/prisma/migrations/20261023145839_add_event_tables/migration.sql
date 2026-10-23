-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "notes" TEXT,
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6) NOT NULL,
    "meet_at" TIMESTAMPTZ(6),
    "venue_id" UUID,
    "location_text" TEXT,
    "opponent" TEXT,
    "home_away" TEXT,
    "competition" TEXT,
    "rsvp_deadline_at" TIMESTAMPTZ(6) NOT NULL,
    "rsvp_locked" BOOLEAN NOT NULL DEFAULT false,
    "reminders_enabled" BOOLEAN NOT NULL DEFAULT true,
    "share_token" TEXT NOT NULL,
    "cancelled_at" TIMESTAMPTZ(6),
    "cancelled_by" UUID,
    "cancel_message" TEXT,
    "is_backfill" BOOLEAN NOT NULL DEFAULT false,
    "roll_call_completed_at" TIMESTAMPTZ(6),
    "roll_call_completed_by" UUID,
    "overridden_fields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_categories" (
    "event_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_categories_pkey" PRIMARY KEY ("event_id","category_id")
);

-- CreateTable
CREATE TABLE "event_invitees" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "club_membership_id" UUID NOT NULL,
    "source" TEXT NOT NULL,
    "rsvp_status" TEXT NOT NULL DEFAULT 'pending',
    "rsvp_reason" TEXT,
    "rsvp_note" TEXT,
    "arriving_late" BOOLEAN NOT NULL DEFAULT false,
    "first_responded_at" TIMESTAMPTZ(6),
    "responded_at" TIMESTAMPTZ(6),
    "rsvp_is_late" BOOLEAN NOT NULL DEFAULT false,
    "rsvp_set_by" UUID,
    "attendance_status" TEXT,
    "absence_justified" BOOLEAN,
    "attendance_recorded_by" UUID,
    "attendance_recorded_at" TIMESTAMPTZ(6),
    "removed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_invitees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rsvp_changes" (
    "id" UUID NOT NULL,
    "event_invitee_id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "from_status" TEXT NOT NULL,
    "to_status" TEXT NOT NULL,
    "reason" TEXT,
    "arriving_late" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL,
    "changed_by" UUID,
    "changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "after_deadline" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rsvp_changes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "events_share_token_key" ON "events"("share_token");

-- CreateIndex
CREATE INDEX "events_club_id_starts_at_idx" ON "events"("club_id", "starts_at");

-- CreateIndex
CREATE INDEX "events_venue_id_idx" ON "events"("venue_id");

-- CreateIndex
CREATE UNIQUE INDEX "events_id_club_id_key" ON "events"("id", "club_id");

-- CreateIndex
CREATE INDEX "event_categories_category_id_event_id_idx" ON "event_categories"("category_id", "event_id");

-- CreateIndex
CREATE INDEX "event_categories_club_id_idx" ON "event_categories"("club_id");

-- CreateIndex
CREATE INDEX "event_invitees_club_membership_id_event_id_idx" ON "event_invitees"("club_membership_id", "event_id");

-- CreateIndex
CREATE INDEX "event_invitees_event_id_rsvp_status_idx" ON "event_invitees"("event_id", "rsvp_status");

-- CreateIndex
CREATE INDEX "event_invitees_rsvp_set_by_idx" ON "event_invitees"("rsvp_set_by") WHERE (rsvp_set_by IS NOT NULL);

-- CreateIndex
CREATE INDEX "event_invitees_club_id_idx" ON "event_invitees"("club_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_invitees_id_club_id_key" ON "event_invitees"("id", "club_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_invitees_event_id_club_membership_id_key" ON "event_invitees"("event_id", "club_membership_id");

-- CreateIndex
CREATE INDEX "rsvp_changes_event_invitee_id_changed_at_idx" ON "rsvp_changes"("event_invitee_id", "changed_at");

-- CreateIndex
CREATE INDEX "rsvp_changes_club_id_idx" ON "rsvp_changes"("club_id");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_venue_id_club_id_fkey" FOREIGN KEY ("venue_id", "club_id") REFERENCES "venues"("id", "club_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_categories" ADD CONSTRAINT "event_categories_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_categories" ADD CONSTRAINT "event_categories_event_id_club_id_fkey" FOREIGN KEY ("event_id", "club_id") REFERENCES "events"("id", "club_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_categories" ADD CONSTRAINT "event_categories_category_id_club_id_fkey" FOREIGN KEY ("category_id", "club_id") REFERENCES "categories"("id", "club_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_invitees" ADD CONSTRAINT "event_invitees_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_invitees" ADD CONSTRAINT "event_invitees_event_id_club_id_fkey" FOREIGN KEY ("event_id", "club_id") REFERENCES "events"("id", "club_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_invitees" ADD CONSTRAINT "event_invitees_club_membership_id_club_id_fkey" FOREIGN KEY ("club_membership_id", "club_id") REFERENCES "club_memberships"("id", "club_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_invitees" ADD CONSTRAINT "event_invitees_rsvp_set_by_club_id_fkey" FOREIGN KEY ("rsvp_set_by", "club_id") REFERENCES "club_memberships"("id", "club_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rsvp_changes" ADD CONSTRAINT "rsvp_changes_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rsvp_changes" ADD CONSTRAINT "rsvp_changes_event_invitee_id_club_id_fkey" FOREIGN KEY ("event_invitee_id", "club_id") REFERENCES "event_invitees"("id", "club_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Hand-written: what schema.prisma can't express

ALTER TABLE "events"
  ADD CONSTRAINT "events_type_check" CHECK ("type" IN ('practice', 'match', 'other')),
  ADD CONSTRAINT "events_home_away_check" CHECK ("home_away" IN ('home', 'away', 'neutral')),
  ADD CONSTRAINT "events_ends_after_start_check" CHECK ("ends_at" > "starts_at"),
  ADD CONSTRAINT "events_match_fields_check"
    CHECK ("type" = 'match' OR ("opponent" IS NULL AND "home_away" IS NULL AND "competition" IS NULL));

ALTER TABLE "event_invitees"
  ADD CONSTRAINT "event_invitees_source_check" CHECK ("source" IN ('category', 'call_up', 'walk_in')),
  ADD CONSTRAINT "event_invitees_rsvp_status_check" CHECK ("rsvp_status" IN ('pending', 'going', 'not_going')),
  ADD CONSTRAINT "event_invitees_rsvp_reason_check"
    CHECK ("rsvp_reason" IN ('injury_illness', 'work_study', 'personal', 'travel', 'other')),
  ADD CONSTRAINT "event_invitees_not_going_requires_reason_check"
    CHECK ("rsvp_status" <> 'not_going' OR "rsvp_reason" IS NOT NULL),
  ADD CONSTRAINT "event_invitees_attendance_status_check" CHECK ("attendance_status" IN ('present', 'late', 'absent'));

ALTER TABLE "rsvp_changes"
  ADD CONSTRAINT "rsvp_changes_from_status_check" CHECK ("from_status" IN ('pending', 'going', 'not_going')),
  ADD CONSTRAINT "rsvp_changes_to_status_check" CHECK ("to_status" IN ('pending', 'going', 'not_going')),
  ADD CONSTRAINT "rsvp_changes_reason_check"
    CHECK ("reason" IN ('injury_illness', 'work_study', 'personal', 'travel', 'other')),
  ADD CONSTRAINT "rsvp_changes_source_check"
    CHECK ("source" IN ('app', 'push_action', 'web_link', 'weekly_agenda', 'proxy', 'system_reset'));
