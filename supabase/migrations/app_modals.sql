-- App Modals: promotional/announcement modals shown in the Mishka app
-- Only one modal should be active at a time (enforced in the admin UI)

CREATE TABLE IF NOT EXISTS public.app_modals (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active            boolean     NOT NULL DEFAULT false,

  -- Content
  headline             text        NOT NULL DEFAULT '',
  headline_size        integer     NOT NULL DEFAULT 38,
  headline_color       text        NOT NULL DEFAULT '#ffffff',

  sub_headline         text        NOT NULL DEFAULT '',
  sub_headline_size    integer     NOT NULL DEFAULT 18,
  sub_headline_color   text        NOT NULL DEFAULT '#ffffff',

  description          text        NOT NULL DEFAULT '',
  description_size     integer     NOT NULL DEFAULT 14,
  description_color    text        NOT NULL DEFAULT '#ffffff',

  cta_label            text        NOT NULL DEFAULT 'Start Exploring',
  cta_url              text,

  background_image_url text,

  -- Scheduling
  -- Values: always | once_per_day | once_per_session | once_per_login | once_ever | every_n_days | n_times_total
  show_rule            text        NOT NULL DEFAULT 'once_per_day',
  rule_value           integer,    -- N for every_n_days / n_times_total
  expires_at           timestamptz,

  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- Allow public (anon) reads so the app can fetch without auth
ALTER TABLE public.app_modals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_modals_public_read"
  ON public.app_modals FOR SELECT
  USING (true);
