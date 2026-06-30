-- Run this in Supabase SQL Editor
-- Adds a 'weekly' value to the existing report_type enum so weekly auto-reports
-- can be stored in the existing `reports` table alongside executive/department reports.

ALTER TYPE report_type ADD VALUE IF NOT EXISTS 'weekly';
