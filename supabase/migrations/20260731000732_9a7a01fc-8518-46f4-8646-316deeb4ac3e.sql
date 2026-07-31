CREATE OR REPLACE FUNCTION public.__mig_exec(sql text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE sql;
  RETURN 'ok';
END;
$$;

REVOKE ALL ON FUNCTION public.__mig_exec(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.__mig_exec(text) FROM anon;
REVOKE ALL ON FUNCTION public.__mig_exec(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.__mig_exec(text) TO service_role;