-- ============================================================
-- DMS (Document Management System) - Supabase Migration
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================

-- ============================================================
-- 1. ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'editor', 'viewer');
CREATE TYPE document_status AS ENUM ('processing', 'verification', 'released', 'archived');
CREATE TYPE audit_action AS ENUM (
  'upload', 'view', 'download', 'edit_metadata', 
  'verify', 'release', 'archive', 'revision_upload',
  'status_change', 'user_created', 'user_updated'
);

-- ============================================================
-- 2. TABLES
-- ============================================================

-- 2.1 User profiles (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'viewer',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.2 Document categories (admin-configurable)
CREATE TABLE public.document_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.3 Drawing groups (admin-configurable, only for Drawing/Specification category)
CREATE TABLE public.drawing_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.4 Documents (main table)
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_number TEXT NOT NULL UNIQUE,  -- Auto-generated: DOC-2026-0001
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID NOT NULL REFERENCES public.document_categories(id),
  drawing_group_id UUID REFERENCES public.drawing_groups(id),  -- nullable, only when category = Drawing/Specification
  project TEXT,
  current_revision TEXT,  -- null = original, "A", "B", "C"...
  status document_status NOT NULL DEFAULT 'processing',
  
  -- File info (current version)
  file_path TEXT NOT NULL,       -- path in Supabase Storage
  file_name TEXT NOT NULL,       -- original file name
  file_size BIGINT NOT NULL,     -- bytes
  file_type TEXT NOT NULL,       -- extension e.g. "pdf", "dwg", "xlsx"
  
  -- Workflow tracking
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  verified_by UUID REFERENCES public.profiles(id),
  verified_at TIMESTAMPTZ,
  released_by UUID REFERENCES public.profiles(id),
  released_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- 4-eyes rule: released_by must differ from verified_by
  CONSTRAINT four_eyes_rule CHECK (
    released_by IS NULL OR verified_by IS NULL OR released_by != verified_by
  )
);

-- 2.5 Document revisions (history of all versions)
CREATE TABLE public.document_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  revision TEXT,  -- null = original, "A", "B"...
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  change_description TEXT,  -- required for revisions, null for original
  status document_status NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  verified_by UUID REFERENCES public.profiles(id),
  released_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.6 Document ↔ Part Number (many-to-many junction)
CREATE TABLE public.document_part_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  part_number TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Prevent duplicate part number per document
  UNIQUE(document_id, part_number)
);

-- 2.7 Audit log
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  action audit_action NOT NULL,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  details JSONB,  -- flexible storage for change details
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. INDEXES (for search performance)
-- ============================================================

-- Part number search
CREATE INDEX idx_doc_part_numbers_part ON public.document_part_numbers(part_number);
CREATE INDEX idx_doc_part_numbers_doc ON public.document_part_numbers(document_id);

-- Document search
CREATE INDEX idx_documents_category ON public.documents(category_id);
CREATE INDEX idx_documents_project ON public.documents(project);
CREATE INDEX idx_documents_status ON public.documents(status);
CREATE INDEX idx_documents_number ON public.documents(document_number);

-- Full-text search index on title + description
CREATE INDEX idx_documents_fts ON public.documents 
  USING GIN (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));

-- Audit log
CREATE INDEX idx_audit_log_user ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_document ON public.audit_log(document_id);
CREATE INDEX idx_audit_log_created ON public.audit_log(created_at DESC);

-- Revision history
CREATE INDEX idx_revisions_document ON public.document_revisions(document_id);

-- ============================================================
-- 4. AUTO-GENERATE DOCUMENT NUMBER
-- ============================================================

-- Sequence for document numbering per year
CREATE SEQUENCE IF NOT EXISTS doc_number_seq START 1;

-- Function to generate document number: DOC-YYYY-NNNN
CREATE OR REPLACE FUNCTION generate_document_number()
RETURNS TRIGGER AS $$
DECLARE
  current_year TEXT;
  seq_val INT;
BEGIN
  current_year := to_char(now(), 'YYYY');
  seq_val := nextval('doc_number_seq');
  NEW.document_number := 'DOC-' || current_year || '-' || lpad(seq_val::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_doc_number
  BEFORE INSERT ON public.documents
  FOR EACH ROW
  WHEN (NEW.document_number IS NULL)
  EXECUTE FUNCTION generate_document_number();

-- ============================================================
-- 5. AUTO-UPDATE updated_at TIMESTAMP
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 6. AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================

-- When a new user signs up via Supabase Auth, auto-create profile
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'viewer'  -- default role, admin upgrades manually
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_part_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drawing_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: check if current user is editor or admin
CREATE OR REPLACE FUNCTION is_editor_or_admin()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() IN ('editor', 'admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() = 'admin';
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- --- PROFILES ---
-- Everyone can read active profiles (to see names)
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (true);
-- Only admin can update profiles (role changes)
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (is_admin());

-- --- DOCUMENTS ---
-- All authenticated users can read documents
CREATE POLICY "documents_select" ON public.documents
  FOR SELECT USING (auth.uid() IS NOT NULL);
-- Editor/Admin can insert
CREATE POLICY "documents_insert" ON public.documents
  FOR INSERT WITH CHECK (is_editor_or_admin());
-- Editor/Admin can update (metadata, status changes)
CREATE POLICY "documents_update" ON public.documents
  FOR UPDATE USING (is_editor_or_admin());

-- --- DOCUMENT REVISIONS ---
CREATE POLICY "revisions_select" ON public.document_revisions
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "revisions_insert" ON public.document_revisions
  FOR INSERT WITH CHECK (is_editor_or_admin());

-- --- DOCUMENT PART NUMBERS ---
CREATE POLICY "part_numbers_select" ON public.document_part_numbers
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "part_numbers_insert" ON public.document_part_numbers
  FOR INSERT WITH CHECK (is_editor_or_admin());
CREATE POLICY "part_numbers_update" ON public.document_part_numbers
  FOR UPDATE USING (is_editor_or_admin());
CREATE POLICY "part_numbers_delete" ON public.document_part_numbers
  FOR DELETE USING (is_editor_or_admin());

-- --- CATEGORIES & DRAWING GROUPS ---
CREATE POLICY "categories_select" ON public.document_categories
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "categories_insert" ON public.document_categories
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "categories_update" ON public.document_categories
  FOR UPDATE USING (is_admin());

CREATE POLICY "drawing_groups_select" ON public.drawing_groups
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "drawing_groups_insert" ON public.drawing_groups
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "drawing_groups_update" ON public.drawing_groups
  FOR UPDATE USING (is_admin());

-- --- AUDIT LOG ---
-- Editor/Admin can insert audit entries
CREATE POLICY "audit_insert" ON public.audit_log
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
-- Only admin can read full audit log
CREATE POLICY "audit_select" ON public.audit_log
  FOR SELECT USING (is_admin());

-- ============================================================
-- 8. STORAGE BUCKET
-- ============================================================

-- Run this separately or via Supabase Dashboard:
-- Create a bucket named 'documents' with:
--   - Public: false (private, requires auth)
--   - File size limit: 50MB
--   - Allowed MIME types: * (all)

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('documents', 'documents', false, 52428800)  -- 50MB
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "storage_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "storage_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents' 
    AND auth.uid() IS NOT NULL
    AND is_editor_or_admin()
  );

CREATE POLICY "storage_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'documents' 
    AND is_editor_or_admin()
  );

-- ============================================================
-- 9. SEED DATA - Default categories & drawing groups
-- ============================================================

INSERT INTO public.document_categories (name) VALUES
  ('Datasheet'),
  ('Drawing/Specification'),
  ('MR/PCR'),
  ('Firmware'),
  ('Approval Documents')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.drawing_groups (name) VALUES
  ('Specification complete product'),
  ('Mains lead'),
  ('Output lead'),
  ('Housing'),
  ('Miscellaneous'),
  ('PCB circuit diagram'),
  ('PCB Compon. bottom side'),
  ('PCB Compon. top side'),
  ('PCB drilling plan'),
  ('PCB ICT'),
  ('PCB panel board'),
  ('PCB Placement')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- DONE. Next steps:
-- 1. Run this SQL in Supabase Dashboard → SQL Editor
-- 2. Go to Authentication → Providers → Enable Email
-- 3. Set up email restriction to @unominda.com in Auth settings
-- 4. Create admin user manually, then update role:
--    UPDATE public.profiles SET role = 'admin' WHERE email = 'your.email@unominda.com';
-- ============================================================
