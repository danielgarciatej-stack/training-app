alter table profiles
  add column if not exists strava_athlete_id bigint,
  add column if not exists strava_access_token text,
  add column if not exists strava_refresh_token text,
  add column if not exists strava_expires_at bigint;

alter table plan_sessions
  add column if not exists actual_distance numeric,
  add column if not exists actual_duration integer,
  add column if not exists actual_pace text,
  add column if not exists strava_activity_id bigint,
  add column if not exists completed_at timestamptz;
