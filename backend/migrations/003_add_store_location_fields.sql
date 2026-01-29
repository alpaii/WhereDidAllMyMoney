-- Migration: Add location and naver place fields to stores table
-- Run this SQL against your PostgreSQL database

-- Add address fields
ALTER TABLE stores ADD COLUMN IF NOT EXISTS address VARCHAR(500);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS road_address VARCHAR(500);

-- Add coordinates
ALTER TABLE stores ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Add naver place info
ALTER TABLE stores ADD COLUMN IF NOT EXISTS naver_place_id VARCHAR(100);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS category VARCHAR(200);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
