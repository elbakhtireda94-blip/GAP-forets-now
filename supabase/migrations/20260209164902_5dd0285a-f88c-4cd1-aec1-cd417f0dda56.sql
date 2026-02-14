
-- Create access_codes table
CREATE TABLE public.access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  code_hash text NOT NULL,
  scope text NOT NULL,
  dranef_id text,
  dpanef_id text,
  max_uses integer NOT NULL DEFAULT 1,
  uses integer NOT NULL DEFAULT 0,
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

-- Only ADMIN can do everything
CREATE POLICY "access_codes_admin_all"
ON public.access_codes
FOR ALL
USING (has_role(auth.uid(), 'ADMIN'::app_role));
