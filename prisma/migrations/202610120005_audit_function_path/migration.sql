-- Audit immutability uses only PL/pgSQL RAISE. Do not inherit a caller search_path.
ALTER FUNCTION public.reject_audit_mutation() SET search_path = pg_catalog;
