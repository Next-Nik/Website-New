-- sql/add_beta_group.sql
-- Adds beta_group column to users table for coupon-based group tracking.
-- Groups: beta_tester | beta_core | nextus_core | early_bird

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS beta_group TEXT
    CHECK (beta_group IN ('beta_tester','beta_core','nextus_core','early_bird'));

COMMENT ON COLUMN users.beta_group IS
  'Assigned at checkout based on promo code used. Drives Kit mailing list segmentation.';
