-- Personal Notes Table
CREATE TABLE IF NOT EXISTS public.personal_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    is_pinned BOOLEAN DEFAULT FALSE,
    color TEXT DEFAULT '#ffffff',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on personal_notes
ALTER TABLE public.personal_notes ENABLE ROW LEVEL SECURITY;

-- Personal notes are private to each user
CREATE POLICY "Users can manage their own notes" ON public.personal_notes
    FOR ALL USING (auth.uid() = user_id);

-- Status Updates Table
CREATE TABLE IF NOT EXISTS public.status_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    project_title TEXT,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'general' CHECK (type IN ('progress', 'blocker', 'completed', 'general')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on status_updates
ALTER TABLE public.status_updates ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view status updates (team visibility)
CREATE POLICY "Authenticated users can view all status updates" ON public.status_updates
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Users can only insert their own status updates
CREATE POLICY "Users can insert their own status updates" ON public.status_updates
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own status updates
CREATE POLICY "Users can delete their own status updates" ON public.status_updates
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_personal_notes_user_id ON public.personal_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_notes_is_pinned ON public.personal_notes(is_pinned);
CREATE INDEX IF NOT EXISTS idx_status_updates_user_id ON public.status_updates(user_id);
CREATE INDEX IF NOT EXISTS idx_status_updates_created_at ON public.status_updates(created_at);
CREATE INDEX IF NOT EXISTS idx_status_updates_project_id ON public.status_updates(project_id);
