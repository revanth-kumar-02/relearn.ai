-- ─────────────────────────────────────────────────────────────────
-- Relearn.ai — Project Workspaces & Eclipse Theia Persistence Layer
-- Migration: 20261123_project_workspaces.sql
-- ─────────────────────────────────────────────────────────────────

-- 1. Project Workspaces Table
CREATE TABLE IF NOT EXISTS public.project_workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    "planId" UUID REFERENCES public.plans(id) ON DELETE SET NULL,
    "projectId" TEXT NOT NULL,
    title TEXT NOT NULL,
    technology TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    files JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    "storagePath" TEXT,
    "lastSyncedAt" TIMESTAMPTZ DEFAULT now(),
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_user_project UNIQUE ("userId", "projectId")
);

-- 2. Project Milestone Progress Table
CREATE TABLE IF NOT EXISTS public.project_milestone_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "workspaceId" UUID NOT NULL REFERENCES public.project_workspaces(id) ON DELETE CASCADE,
    "milestoneId" TEXT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT false,
    "completedCriteria" JSONB NOT NULL DEFAULT '{}'::jsonb,
    score INTEGER DEFAULT 0,
    "verifiedAt" TIMESTAMPTZ,
    "updatedAt" TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_workspace_milestone UNIQUE ("workspaceId", "milestoneId")
);

-- 3. Row Level Security (RLS)
ALTER TABLE public.project_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_milestone_progress ENABLE ROW LEVEL SECURITY;

-- Project Workspaces RLS Policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'project_workspaces' AND policyname = 'Users own their project workspaces'
    ) THEN
        CREATE POLICY "Users own their project workspaces" 
            ON public.project_workspaces
            FOR ALL 
            USING (auth.uid() = "userId")
            WITH CHECK (auth.uid() = "userId");
    END IF;
END $$;

-- Milestone Progress RLS Policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'project_milestone_progress' AND policyname = 'Users own their milestone progress'
    ) THEN
        CREATE POLICY "Users own their milestone progress" 
            ON public.project_milestone_progress
            FOR ALL 
            USING ("workspaceId" IN (SELECT id FROM public.project_workspaces WHERE "userId" = auth.uid()))
            WITH CHECK ("workspaceId" IN (SELECT id FROM public.project_workspaces WHERE "userId" = auth.uid()));
    END IF;
END $$;

-- 4. Storage Bucket Setup: student-workspaces
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'student-workspaces', 
    'student-workspaces', 
    false, 
    52428800,
    ARRAY['application/gzip', 'application/x-tar', 'application/zip', 'application/json']
)
ON CONFLICT (id) DO UPDATE SET 
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage Bucket RLS Policies for student-workspaces
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Students can access own workspace storage'
    ) THEN
        CREATE POLICY "Students can access own workspace storage"
            ON storage.objects
            FOR ALL
            USING (bucket_id = 'student-workspaces' AND (storage.foldername(name))[1] = auth.uid()::text)
            WITH CHECK (bucket_id = 'student-workspaces' AND (storage.foldername(name))[1] = auth.uid()::text);
    END IF;
END $$;
