-- Migration 005: Add title (job title) column to contacts table
ALTER TABLE contacts ADD COLUMN title TEXT;
