-- Allow 'skip' as a valid score value in routine_logs
ALTER TABLE routine_logs DROP CONSTRAINT IF EXISTS routine_logs_score_check;
ALTER TABLE routine_logs ADD CONSTRAINT routine_logs_score_check
  CHECK (score IN ('good', 'ok', 'bad', 'skip'));
