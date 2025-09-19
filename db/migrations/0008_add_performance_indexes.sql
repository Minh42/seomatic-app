-- Add performance indexes for frequently queried columns
-- These indexes will significantly improve query performance

-- Team members indexes
CREATE INDEX IF NOT EXISTS idx_team_members_org_status 
  ON team_members(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_team_members_org_member 
  ON team_members(organization_id, member_user_id);

CREATE INDEX IF NOT EXISTS idx_team_members_member_status 
  ON team_members(member_user_id, status);

-- Workspaces indexes
CREATE INDEX IF NOT EXISTS idx_workspaces_org 
  ON workspaces(organization_id);

CREATE INDEX IF NOT EXISTS idx_workspaces_owner 
  ON workspaces(owner_id);

-- Organizations indexes
CREATE INDEX IF NOT EXISTS idx_organizations_owner 
  ON organizations(owner_id);

-- Team invitations indexes
CREATE INDEX IF NOT EXISTS idx_team_invitations_email 
  ON team_invitations(email);

CREATE INDEX IF NOT EXISTS idx_team_invitations_token 
  ON team_invitations(token);

CREATE INDEX IF NOT EXISTS idx_team_invitations_member 
  ON team_invitations(team_member_id);

-- Connections indexes (for workspace connections)
CREATE INDEX IF NOT EXISTS idx_connections_workspace 
  ON connections(workspace_id);

-- Users indexes (email already has unique constraint, so index exists)
-- Skip creating index on users.email as it's already unique

-- Subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_owner 
  ON subscriptions(owner_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_status 
  ON subscriptions(status);

-- Plans indexes (for subscription lookups)
CREATE INDEX IF NOT EXISTS idx_plans_level 
  ON plans(level);