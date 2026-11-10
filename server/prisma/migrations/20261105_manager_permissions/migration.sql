-- Add per-manager permission grants without changing existing user roles.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "managerPermissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
