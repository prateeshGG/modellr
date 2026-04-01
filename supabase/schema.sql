-- SchemaForge Phase 3 Database Setup
-- Run this entire script in your Supabase SQL Editor!

-- 1. Create extended users table (optional profile data)
CREATE TABLE public.users (
  id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  display_name text,
  avatar_url text,
  tier text DEFAULT 'free'::text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create the main schemas table (holds our Yjs blobs and Canvas states)
CREATE TABLE public.schemas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL DEFAULT 'Untitled Schema',
  canvas_state jsonb DEFAULT '{}'::jsonb,
  yjs_state bytea,
  thumbnail_svg text,
  is_public boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  deleted_at timestamp with time zone
);

-- 3. Create snapshots table (History versions)
CREATE TABLE public.snapshots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  schema_id uuid REFERENCES public.schemas(id) ON DELETE CASCADE NOT NULL,
  label text NOT NULL DEFAULT 'Snapshot',
  canvas_state jsonb NOT NULL,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Enable Row Level Security (RLS) so users only see their own schemas
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snapshots ENABLE ROW LEVEL SECURITY;

-- 3.5. Create API Keys table (for Phase 5 MCP)
CREATE TABLE public.api_keys (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  label text NOT NULL DEFAULT 'Secret Key',
  key_hash text NOT NULL,
  key_prefix text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_used_at timestamp with time zone
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
CREATE POLICY "Users can view their own profile." ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile." ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Anyone can view public schemas." ON public.schemas
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view their own schemas." ON public.schemas
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own schemas." ON public.schemas
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own schemas." ON public.schemas
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own schemas." ON public.schemas
  FOR DELETE USING (auth.uid() = owner_id);

CREATE POLICY "Users can view their schema snapshots." ON public.snapshots
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.schemas s WHERE s.id = schema_id AND s.owner_id = auth.uid())
  );

CREATE POLICY "Users can insert snapshots for their schemas." ON public.snapshots
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.schemas s WHERE s.id = schema_id AND s.owner_id = auth.uid())
  );

CREATE POLICY "Users can manage their own API keys." ON public.api_keys
  FOR ALL USING (auth.uid() = user_id);

-- 6. Setup auto-create user trigger (when someone signs up, create a row in public.users)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, display_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
