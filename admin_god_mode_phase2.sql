-- Phase 2 God-Mode Admin Features

-- 1. Create announcements table
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('info', 'warning', 'emergency')),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Allow public read access to active announcements
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active announcements"
    ON public.announcements FOR SELECT
    USING (active = true);

-- Admins can manage announcements
CREATE POLICY "Admins can manage announcements"
    ON public.announcements FOR ALL
    USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'));

-- 2. Add last_seen to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Create verify_user_by_admin RPC
CREATE OR REPLACE FUNCTION verify_user_by_admin(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only allow admins to run this function
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can force verify users';
    END IF;

    -- Update the user's email_confirmed_at in the auth.users table
    UPDATE auth.users
    SET email_confirmed_at = NOW()
    WHERE id = target_user_id;
END;
$$;
