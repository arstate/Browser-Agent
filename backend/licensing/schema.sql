-- ==========================================================
-- BROWSER AGENT - LICENSING & SUBSCRIPTION DATABASE SCHEMA
-- Compatible with PostgreSQL / Supabase
-- ==========================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Table: licenses
-- Stores user license keys, active tiers, validity period, and device bindings.
CREATE TABLE IF NOT EXISTS licenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    license_key VARCHAR(64) UNIQUE NOT NULL,
    customer_name VARCHAR(150),
    customer_email VARCHAR(255) NOT NULL,
    customer_whatsapp VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'suspended', 'trial')),
    tier VARCHAR(30) DEFAULT 'pro' CHECK (tier IN ('trial', 'starter', 'pro', 'agency', 'lifetime')),
    max_devices INT DEFAULT 1,
    device_ids JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    activated_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Index for instant key lookups
CREATE INDEX IF NOT EXISTS idx_licenses_key ON licenses (license_key);
CREATE INDEX IF NOT EXISTS idx_licenses_email ON licenses (customer_email);
CREATE INDEX IF NOT EXISTS idx_licenses_status_expires ON licenses (status, expires_at);

-- 2. Table: topup_orders
-- Records all top-up / extension transactions from payment gateways (Mayar, Midtrans, Lynk, Stripe).
CREATE TABLE IF NOT EXISTS topup_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id VARCHAR(100) UNIQUE NOT NULL,
    license_key VARCHAR(64) NOT NULL REFERENCES licenses(license_key) ON DELETE CASCADE,
    payment_gateway VARCHAR(50) DEFAULT 'mayar', -- 'mayar', 'midtrans', 'lynk', 'manual'
    payment_method VARCHAR(50),                   -- 'qris', 'bca_va', 'mandiri_va', 'gopay', etc.
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'IDR',
    duration_days INT NOT NULL DEFAULT 30,
    status VARCHAR(20) DEFAULT 'paid' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
    gateway_payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paid_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_topup_order_id ON topup_orders (order_id);
CREATE INDEX IF NOT EXISTS idx_topup_license_key ON topup_orders (license_key);

-- 3. Table: activation_logs
-- Audit log of validation & activation requests (for fraud & sharing detection)
CREATE TABLE IF NOT EXISTS activation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    license_key VARCHAR(64) NOT NULL,
    device_id VARCHAR(64) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    action VARCHAR(30) NOT NULL, -- 'activate', 'heartbeat_check', 'rejected_device_limit', 'rejected_expired'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activation_logs_key ON activation_logs (license_key);

-- Helper function to extend license expiry upon top-up
CREATE OR REPLACE FUNCTION process_topup_success(
    p_order_id VARCHAR,
    p_license_key VARCHAR,
    p_duration_days INT,
    p_amount NUMERIC,
    p_gateway VARCHAR,
    p_method VARCHAR
) RETURNS JSONB AS $$
DECLARE
    v_cur_expires TIMESTAMP WITH TIME ZONE;
    v_new_expires TIMESTAMP WITH TIME ZONE;
    v_res JSONB;
BEGIN
    -- Get current expiry
    SELECT expires_at INTO v_cur_expires FROM licenses WHERE license_key = p_license_key;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'License key not found');
    END IF;

    -- If already expired, new expiry is NOW + duration_days; otherwise, add to existing expiry
    IF v_cur_expires < NOW() THEN
        v_new_expires := NOW() + (p_duration_days || ' days')::INTERVAL;
    ELSE
        v_new_expires := v_cur_expires + (p_duration_days || ' days')::INTERVAL;
    END IF;

    -- Update license
    UPDATE licenses
    SET expires_at = v_new_expires,
        status = 'active',
        updated_at = NOW()
    WHERE license_key = p_license_key;

    -- Insert order record
    INSERT INTO topup_orders (order_id, license_key, payment_gateway, payment_method, amount, duration_days, status, paid_at)
    VALUES (p_order_id, p_license_key, p_gateway, p_method, p_amount, p_duration_days, 'paid', NOW())
    ON CONFLICT (order_id) DO NOTHING;

    RETURN jsonb_build_object(
        'success', true,
        'license_key', p_license_key,
        'previous_expires_at', v_cur_expires,
        'new_expires_at', v_new_expires,
        'status', 'active'
    );
END;
$$ LANGUAGE plpgsql;
