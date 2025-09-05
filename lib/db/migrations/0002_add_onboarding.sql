-- Update users table for onboarding
ALTER TABLE users 
DROP COLUMN IF EXISTS current_onboarding_step,
ADD COLUMN onboarding_data JSON,
ADD COLUMN onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN onboarding_completed_at TIMESTAMP,
ADD COLUMN is_active BOOLEAN DEFAULT true;

-- Add soft delete fields to workspaces table
ALTER TABLE workspaces
ADD COLUMN deleted_at TIMESTAMP,
ADD COLUMN deleted_by UUID REFERENCES users(id);

-- Create indexes
CREATE INDEX idx_users_onboarding_completed ON users(onboarding_completed);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_workspaces_deleted_at ON workspaces(deleted_at);