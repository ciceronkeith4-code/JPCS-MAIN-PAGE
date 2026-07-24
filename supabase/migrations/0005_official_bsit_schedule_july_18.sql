-- Official BSIT schedule revised July 18.
-- The source spreadsheet is authoritative. Only schedule_days, schedule_time,
-- and room are changed; curriculum identity and academic fields are untouched.

ALTER TABLE public.curriculum
  ADD COLUMN IF NOT EXISTS schedule_days TEXT,
  ADD COLUMN IF NOT EXISTS schedule_time TEXT,
  ADD COLUMN IF NOT EXISTS room TEXT;

UPDATE public.curriculum
SET
  schedule_days = NULL,
  schedule_time = NULL,
  room = NULL
WHERE course = 'BSIT';

WITH official_schedule(subject_code, schedule_days, schedule_time, room) AS (
  VALUES
    ('RF1',        'MONDAY',  '10:30 - 12:30',             'Smart Class'),
    ('GEC101',     'M-TH',    '7:30-9:00',                 'C403'),
    ('ITE101',     'M-TH',    '1:00 - 2:30',               'Smart Class'),
    ('THEO 101',   'M-TH',    '2:30 - 4:00',               'Smart Class'),
    ('ITE102',     'M/TH/S',  '8:30 - 10:30',              'CLAB 1/OL'),
    ('ITP 111',    'T/W/F',   '10:30 - 12:30',             'NETLAB'),
    ('GEC105',     'M-TH',    '1:00-2:30',                 'C401'),
    ('PHE101',     'M-TH',    '2:30-3:30',                 'C403'),
    ('CWTS1',      'M-TH',    '4:00-5:30',                 'Smart Class'),
    ('GEC 102',    'M-T-W',   '7:30-9:00',                 'SmartClass'),
    ('ITE 104',    'M & TH',  '9:00 - 12:00',              'CLAB3'),
    ('ITP 121',    'M-W-TH',  '1:00 - 2:30',               'NETLAB'),
    ('PE 103',     'M-TH',    '2:30-3:30',                 'C402'),
    ('ITE 108',    'M/TH',    '3:30 - 5:30',               'C407'),
    ('THEO 103',   'M-TH',    '7:30 - 9:00',               'C403'),
    ('RF 104',     'TUESDAY', '10:30-12:00',               'SmartClass'),
    ('IT TRACK1',  'M-TH',    '1:00 - 2:30',               '510'),
    ('ITP 117',    'M/TH/S',  '3:00 - 5:00',               'CLAB1'),
    ('ITP128',     'F',       '2:00 - 3:00',               'online'),
    ('IPE3',       'Saturday','9:00 - 12:00',              'online'),
    ('IPE 2',      'Saturday','3:00 - 6:00',               'online'),
    ('GEC104',     'M-TH',    '7:30-9:00',                 'C406'),
    ('GEC110',     'M-TH',    '9:00-10:30',                'C403'),
    ('REL301',     'M-TH',    '10:30-12:00',               'c406'),
    ('ITP113',     'M-TH',    '1:00 - 2:30',               '510'),
    ('IT TRACK 2', 'T/W/F',   '2:30 - 4:30',               'NETLAB'),
    ('ITP130',     'Friday',  '1:00 - 3:00',               'consultation'),
    ('ITP129',     'T/W/TH',  '1:00 - 2:00/ Consultation','510'),
    ('ITP131',     'F',       'Consultation',              'ONLINE'),
    ('ITP123',     'M-F',     '9:00 - 10:30',              'NETLAB'),
    ('IT Track 4', 'M/TH/S',  '10:30-12:30',               'CLAB3'),
    ('IT Track 5', 'M/TH/S',  '1:00 - 3:00',               'C407')
)
UPDATE public.curriculum AS curriculum
SET
  schedule_days = official_schedule.schedule_days,
  schedule_time = official_schedule.schedule_time,
  room = official_schedule.room
FROM official_schedule
WHERE curriculum.course = 'BSIT'
  AND curriculum.subject_code = official_schedule.subject_code;
