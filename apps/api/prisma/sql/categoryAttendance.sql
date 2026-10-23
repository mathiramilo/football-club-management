-- @param {String} $1:clubId
-- @param {String} $2:categoryId
-- @param {DateTime} $3:from
-- @param {DateTime} $4:to
WITH eligible AS (
  SELECT e.id, (e.starts_at AT TIME ZONE c.timezone)::date AS local_date
  FROM event_categories ec
  JOIN events e ON e.id = ec.event_id AND e.club_id = ec.club_id
  JOIN clubs c ON c.id = e.club_id
  WHERE ec.club_id = $1::uuid
    AND ec.category_id = $2::uuid
    AND e.cancelled_at IS NULL
    AND e.roll_call_completed_at IS NOT NULL
    AND e.starts_at >= $3
    AND e.starts_at < $4
)
SELECT
  i.club_membership_id AS "clubMembershipId",
  count(*)::int AS "invited",
  count(*) FILTER (WHERE i.attendance_status IN ('present', 'late'))::int AS "attended",
  count(*) FILTER (WHERE i.attendance_status = 'late')::int AS "late",
  count(*) FILTER (WHERE i.attendance_status = 'absent' AND i.absence_justified)::int AS "justifiedAbsences",
  count(*) FILTER (WHERE i.attendance_status = 'absent' AND i.absence_justified IS NOT TRUE)::int AS "unjustifiedAbsences",
  count(*) FILTER (WHERE i.attendance_status = 'absent' AND i.rsvp_status = 'going')::int AS "noShows"
FROM eligible ev
JOIN event_invitees i ON i.event_id = ev.id AND i.club_id = $1::uuid
WHERE i.source <> 'category'
   OR EXISTS (
     SELECT 1
     FROM category_memberships cm
     WHERE cm.club_id = $1::uuid
       AND cm.category_id = $2::uuid
       AND cm.club_membership_id = i.club_membership_id
       AND cm.is_player
       AND cm.starts_on <= ev.local_date
       AND (cm.ends_on IS NULL OR cm.ends_on >= ev.local_date)
   )
GROUP BY i.club_membership_id
ORDER BY "attended" DESC
