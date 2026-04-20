-- sql/add_referral.sql
-- Adds referral_code and referred_by columns to users table.
-- referral_code: unique short code generated for each user on first login
-- referred_by:   referral_code of the user who invited them (set at checkout)

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by   TEXT;

COMMENT ON COLUMN users.referral_code IS
  'Unique invite code for this user. Auto-generated on first login. Used to track referrals.';

COMMENT ON COLUMN users.referred_by IS
  'referral_code of the user who invited this person. Set at checkout via ?ref= param.';

-- Index for fast lookup when a new user checks in with a ref code
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users (referral_code);
