-- Draft weekly reports may contain partially completed rows. Submission-time
-- validation still guarantees these values are present before approval starts.
ALTER TABLE weekly_report_summaries
  MODIFY COLUMN planned_date DATE NULL,
  MODIFY COLUMN completion_status ENUM('completed','in_progress','not_completed','added') NULL;

ALTER TABLE weekly_report_plans
  MODIFY COLUMN planned_date DATE NULL;
