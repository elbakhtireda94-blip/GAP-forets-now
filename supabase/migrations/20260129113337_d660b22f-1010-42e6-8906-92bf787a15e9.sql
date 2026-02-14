-- =============================================
-- PHASE 1: Authentication & RBAC Foundation
-- =============================================

-- 1. Create role enum for RBAC
CREATE TYPE public.app_role AS ENUM ('ADMIN', 'NATIONAL', 'REGIONAL', 'PROVINCIAL', 'LOCAL');

-- 2. Create profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role_label TEXT, -- e.g., 'DG', 'DRANEF', 'DPANEF', 'ADP'
  phone TEXT,
  avatar_url TEXT,
  -- Territorial assignment
  dranef_id TEXT,
  dpanef_id TEXT,
  commune_ids TEXT[] DEFAULT '{}',
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);

-- 4. Enable RLS on both tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 5. Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 6. Function to get user's scope level
CREATE OR REPLACE FUNCTION public.get_user_scope(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role 
      WHEN 'ADMIN' THEN 1 
      WHEN 'NATIONAL' THEN 2 
      WHEN 'REGIONAL' THEN 3 
      WHEN 'PROVINCIAL' THEN 4 
      WHEN 'LOCAL' THEN 5 
    END
  LIMIT 1
$$;

-- 7. Function to get user's profile with territorial info
CREATE OR REPLACE FUNCTION public.get_user_profile(_user_id UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  role_label TEXT,
  scope_level app_role,
  dranef_id TEXT,
  dpanef_id TEXT,
  commune_ids TEXT[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role_label,
    public.get_user_scope(_user_id),
    p.dranef_id,
    p.dpanef_id,
    p.commune_ids
  FROM public.profiles p
  WHERE p.user_id = _user_id
$$;

-- 8. RLS Policies for profiles
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'));

-- Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins can manage all profiles
CREATE POLICY "Admins can manage profiles"
ON public.profiles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'));

-- 9. RLS Policies for user_roles (admin only)
CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'));

-- Users can view their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 10. Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  
  -- Assign default LOCAL role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'LOCAL');
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 11. Updated_at trigger for profiles
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 12. Add indexes for performance
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_dranef_id ON public.profiles(dranef_id);
CREATE INDEX idx_profiles_dpanef_id ON public.profiles(dpanef_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);