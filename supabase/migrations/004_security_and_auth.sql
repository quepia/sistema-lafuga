-- ============================================================================
-- SISTEMA LA FUGA - Migration 004: Security and Auth Whitelist
-- ============================================================================
-- Features:
-- 1. Authorized Users Table (Whitelist)
-- 2. RLS Policies for all tables
-- 3. Gatekeeper Logic functions
-- ============================================================================

-- ============================================================================
-- PART 1: AUTHORIZED_USERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS authorized_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'vendedor', 'supervisor', 'gerente')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    added_by UUID -- Reference to admin who added this user (optional)
);

-- Seed Super Admin
INSERT INTO authorized_users (email, role)
VALUES ('lautarolopezlabrin@gmail.com', 'admin')
ON CONFLICT (email) DO UPDATE SET role = 'admin'; -- Ensure admin role

-- Enable RLS
ALTER TABLE authorized_users ENABLE ROW LEVEL SECURITY;

-- Helper Functions
CREATE OR REPLACE FUNCTION is_authorized() RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM authorized_users WHERE email = auth.email()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM authorized_users WHERE email = auth.email() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for authorized_users
-- Admins can do everything
CREATE POLICY "Admins can manage authorized_users" ON authorized_users
    USING (is_admin())
    WITH CHECK (is_admin());

-- Users can read their own record (to check role)
CREATE POLICY "Users can view own authorization" ON authorized_users
    FOR SELECT USING (email = auth.email());

-- ============================================================================
-- PART 2: EXISTING TABLES RLS
-- ============================================================================

-- PRODUCTOS
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized users can view products" ON productos
    FOR SELECT USING (is_authorized());

CREATE POLICY "Authorized users can modify products" ON productos
    USING (is_authorized())
    WITH CHECK (is_authorized()); 
    -- Note: Cleaner would be restricting modify to 'admin'/'editor' but user generic 'authorized' currently. 
    -- We can refine roles later if needed, but 'authorized' implies whitelist.

-- VENTAS
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized users can view ventas" ON ventas
    FOR SELECT USING (is_authorized());

CREATE POLICY "Authorized users can insert ventas" ON ventas
    FOR INSERT WITH CHECK (is_authorized());
    
CREATE POLICY "Authorized users can update ventas" ON ventas
    FOR UPDATE USING (is_authorized());
    
CREATE POLICY "Authorized users can delete ventas" ON ventas
    FOR DELETE USING (is_authorized());

-- HISTORIAL_PRODUCTOS
ALTER TABLE historial_productos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized users can view history" ON historial_productos
    FOR SELECT USING (is_authorized());

CREATE POLICY "Authorized users can insert history" ON historial_productos
    FOR INSERT WITH CHECK (is_authorized());

-- ============================================================================
-- VERIFICATION
-- ============================================================================
/*
SELECT * FROM authorized_users;
SELECT is_authorized(); -- Should be false if anon, true if logged in as lautarolopezlabrin@gmail.com
*/
