-- Shared effective date for every student's recurring class schedule.
INSERT INTO public.announcements (
  id,
  title,
  description,
  priority,
  publish_date,
  start_date
)
VALUES (
  '4',
  'Official Start of Classes',
  '1st Semester AY 2026-2027',
  'high',
  '2026-08-17',
  '2026-08-17'
)
ON CONFLICT (id) DO UPDATE
SET
  publish_date = EXCLUDED.publish_date,
  start_date = EXCLUDED.start_date;
