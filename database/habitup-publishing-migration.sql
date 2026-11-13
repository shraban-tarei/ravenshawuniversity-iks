-- Run once in the same TiDB database used by Ravenshaw IKS.
-- Adds PDF and text as supported HabitUp content types.
ALTER TABLE habitup_activities
MODIFY COLUMN media_type ENUM('image','video','pdf','text','none')
NOT NULL DEFAULT 'none';
