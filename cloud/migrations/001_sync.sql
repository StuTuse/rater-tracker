BEGIN;
CREATE TABLE IF NOT EXISTS public.rater_accounts (
  owner text PRIMARY KEY, version bigint NOT NULL DEFAULT 0,
  state jsonb, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.rater_receipts (
  owner text NOT NULL, request_id uuid NOT NULL, version bigint NOT NULL,
  PRIMARY KEY(owner, request_id)
);
ALTER TABLE public.rater_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rater_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rater_accounts, public.rater_receipts FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.rater_sync(p_type text, p_base_version bigint DEFAULT 0, p_request_id uuid DEFAULT NULL, p_state jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_uid text := auth.uid()::text;
  v_role text := auth.role()::text;
  v_row public.rater_accounts%ROWTYPE;
  v_receipt bigint;
BEGIN
  -- CloudBase gateway may expose all RPC endpoints regardless of GRANT.
  -- Never accept an owner from request parameters.
  IF v_role <> 'authenticated' OR v_role IS NULL OR v_uid IS NULL OR v_uid = '' THEN
    RAISE EXCEPTION 'Account login required' USING ERRCODE = '42501';
  END IF;
  IF p_type = 'pull' THEN
    SELECT * INTO v_row FROM public.rater_accounts WHERE owner = v_uid;
    RETURN jsonb_build_object('version', COALESCE(v_row.version,0), 'state', v_row.state);
  END IF;
  IF p_type <> 'push' OR p_type IS NULL OR p_request_id IS NULL OR p_base_version IS NULL OR p_base_version < 0 THEN
    RAISE EXCEPTION 'Invalid sync request';
  END IF;
  IF p_state IS NULL OR octet_length(p_state::text) > 4194304
     OR p_state->>'format' IS DISTINCT FROM '1' OR p_state->>'rule' IS DISTINCT FROM '1.3'
     OR jsonb_typeof(p_state->'ledger') IS DISTINCT FROM 'array'
     OR jsonb_typeof(p_state->'ratings') IS DISTINCT FROM 'object'
     OR jsonb_typeof(p_state->'tasks') IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Invalid snapshot or sync capacity exceeded (4 MiB)';
  END IF;
  INSERT INTO public.rater_accounts(owner) VALUES(v_uid) ON CONFLICT DO NOTHING;
  SELECT * INTO v_row FROM public.rater_accounts WHERE owner=v_uid FOR UPDATE;
  SELECT version INTO v_receipt FROM public.rater_receipts WHERE owner=v_uid AND request_id=p_request_id;
  IF FOUND THEN RETURN jsonb_build_object('accepted', true, 'version', v_receipt); END IF;
  IF v_row.version <> p_base_version THEN RETURN jsonb_build_object('conflict', true, 'version',v_row.version); END IF;
  UPDATE public.rater_accounts SET state=p_state, version=version+1, updated_at=now() WHERE owner=v_uid RETURNING * INTO v_row;
  INSERT INTO public.rater_receipts VALUES(v_uid,p_request_id,v_row.version);
  RETURN jsonb_build_object('accepted',true,'version',v_row.version);
END;
$$;
REVOKE ALL ON FUNCTION public.rater_sync(text,bigint,uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rater_sync(text,bigint,uuid,jsonb) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
