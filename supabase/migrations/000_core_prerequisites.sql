-- CHANGISHA Prerequisites — Core Dependencies
-- Migration: 000_core_prerequisites.sql
-- Purpose: Initialize core schema and functions required by Changisha
-- Status: Must run before migrations 001 and 002

-- ============================================================================
-- CORE SCHEMA
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS phone_utils;

GRANT USAGE ON SCHEMA core TO postgres, authenticated, anon;
GRANT USAGE ON SCHEMA phone_utils TO postgres, authenticated, anon;

-- ============================================================================
-- CORE TABLES (if not already present)
-- ============================================================================

-- [T1] Organizations (tenants)
CREATE TABLE IF NOT EXISTS core.orgs (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orgs_slug ON core.orgs(slug);
GRANT SELECT, INSERT, UPDATE, DELETE ON core.orgs TO authenticated;

-- [T2] Members (tenant membership)
CREATE TABLE IF NOT EXISTS core.members (
  id BIGSERIAL PRIMARY KEY,
  org_id BIGINT NOT NULL REFERENCES core.orgs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_members_org ON core.members(org_id);
CREATE INDEX IF NOT EXISTS idx_members_user ON core.members(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON core.members TO authenticated;

-- [T3] Audit events (state trail for compliance)
CREATE TABLE IF NOT EXISTS core.audit_events (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id BIGINT,
  user_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_type ON core.audit_events(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_events_resource ON core.audit_events(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_created ON core.audit_events(created_at);
GRANT SELECT, INSERT ON core.audit_events TO authenticated;

-- ============================================================================
-- CORE FUNCTIONS
-- ============================================================================

-- [F1] Log audit event (used by Changisha RPC)
CREATE OR REPLACE FUNCTION core.log_audit_event(
  p_event_type TEXT,
  p_resource_type TEXT,
  p_resource_id BIGINT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public, core
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO core.audit_events (event_type, resource_type, resource_id, user_id, metadata)
  VALUES (
    p_event_type,
    p_resource_type,
    p_resource_id,
    COALESCE(auth.uid(), NULL),
    p_metadata
  );
END;
$$;

GRANT EXECUTE ON FUNCTION core.log_audit_event(TEXT, TEXT, BIGINT, JSONB) TO authenticated;

-- [F2] Get current org_id for authenticated user
CREATE OR REPLACE FUNCTION core.get_current_org_id()
RETURNS BIGINT
SECURITY DEFINER
SET search_path = public, core
LANGUAGE plpgsql
AS $$
DECLARE
  v_org_id BIGINT;
BEGIN
  SELECT org_id INTO v_org_id
  FROM core.members
  WHERE user_id = auth.uid()
  LIMIT 1;

  RETURN v_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION core.get_current_org_id() TO authenticated;

-- ============================================================================
-- PHONE UTILITIES SCHEMA
-- ============================================================================

-- [PU1] Normalize Kenyan MSISDN
CREATE OR REPLACE FUNCTION phone_utils.normalize_ke_msisdn(p_phone TEXT)
RETURNS TEXT
IMMUTABLE
LANGUAGE plpgsql
AS $$
BEGIN
  -- Remove all non-digits
  p_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');

  -- If starts with 0, replace with 254 (Kenya country code)
  IF substring(p_phone, 1, 1) = '0' THEN
    p_phone := '254' || substring(p_phone, 2);
  END IF;

  -- Validate: must be 254 + 9 digits = 12 total
  IF substring(p_phone, 1, 3) = '254' AND length(p_phone) = 12 THEN
    RETURN p_phone;
  END IF;

  -- Fallback: return as-is (validation will catch in caller)
  RETURN p_phone;
END;
$$;

GRANT EXECUTE ON FUNCTION phone_utils.normalize_ke_msisdn(TEXT) TO public, authenticated, anon;

-- [PU2] Validate Kenyan MSISDN
CREATE OR REPLACE FUNCTION phone_utils.is_valid_ke_msisdn(p_phone TEXT)
RETURNS BOOLEAN
IMMUTABLE
LANGUAGE plpgsql
AS $$
BEGIN
  -- Remove all non-digits
  p_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');

  -- Valid: 254XXXXXXXXX (12 digits)
  RETURN substring(p_phone, 1, 3) = '254' AND length(p_phone) = 12;
END;
$$;

GRANT EXECUTE ON FUNCTION phone_utils.is_valid_ke_msisdn(TEXT) TO public, authenticated, anon;

-- ============================================================================
-- RLS POLICIES FOR CORE TABLES
-- ============================================================================

-- Enable RLS
ALTER TABLE core.orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.audit_events ENABLE ROW LEVEL SECURITY;

-- [RLS1] Tenant reads own organization
CREATE POLICY tenant_read_org ON core.orgs
  FOR SELECT
  USING (
    id IN (
      SELECT org_id FROM core.members
      WHERE user_id = auth.uid()
    )
  );

-- [RLS2] Tenant reads own members
CREATE POLICY tenant_read_members ON core.members
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM core.members
      WHERE user_id = auth.uid()
    )
  );

-- [RLS3] Tenant reads own audit events
CREATE POLICY tenant_read_audit ON core.audit_events
  FOR SELECT
  USING (
    -- Audit events are readable by tenant members
    -- Determined by associated resource's tenant_id
    TRUE -- Simplified for now; each resource determines visibility
  );

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

GRANT USAGE ON SCHEMA core TO postgres, authenticated, anon;
GRANT USAGE ON SCHEMA phone_utils TO postgres, authenticated, anon;

-- ============================================================================
-- END PREREQUISITES
-- ============================================================================
-- This migration MUST run before:
-- - 001_changisha_foundation.sql
-- - 002_changisha_rpc.sql

-- Status: Ready for subsequent migrations
