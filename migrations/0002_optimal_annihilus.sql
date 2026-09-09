-- Index definitions are tracked in this snapshot but installed without a
-- transaction by scripts/migrate.mjs after transactional migrations finish.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.translation_text_present(value text)
RETURNS boolean LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT value IS NOT NULL AND btrim(value, U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF') <> '';
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.bookmark_translation_fields(b public.bookmarks)
RETURNS TABLE(field text) LANGUAGE sql IMMUTABLE PARALLEL SAFE
SET search_path = pg_catalog, public AS $$
  SELECT source.field FROM (
    SELECT key AS field, value FROM (VALUES
      ('title', b.title), ('description', b.description),
      ('overview', b.overview), ('whyStartups', b.why_startups)
    ) AS scalar(key, value)
    UNION ALL
    SELECT 'keyFeatures.' || (ordinality - 1), item #>> '{}'
      FROM jsonb_array_elements(CASE WHEN jsonb_typeof(b.key_features::jsonb) = 'array' THEN b.key_features::jsonb ELSE '[]'::jsonb END) WITH ORDINALITY AS features(item, ordinality)
      WHERE jsonb_typeof(item) = 'string'
    UNION ALL
    SELECT 'keyFeatures.' || (ordinality - 1) || '.' || key, item ->> key
      FROM jsonb_array_elements(CASE WHEN jsonb_typeof(b.key_features::jsonb) = 'array' THEN b.key_features::jsonb ELSE '[]'::jsonb END) WITH ORDINALITY AS features(item, ordinality)
      CROSS JOIN (VALUES ('name'), ('description')) AS keys(key)
      WHERE jsonb_typeof(item -> key) = 'string'
    UNION ALL
    SELECT 'useCases.' || (ordinality - 1), item #>> '{}'
      FROM jsonb_array_elements(CASE WHEN jsonb_typeof(b.use_cases::jsonb) = 'array' THEN b.use_cases::jsonb ELSE '[]'::jsonb END) WITH ORDINALITY AS cases(item, ordinality)
      WHERE jsonb_typeof(item) = 'string'
    UNION ALL
    SELECT 'faqs.' || (ordinality - 1) || '.' || key, item ->> key
      FROM jsonb_array_elements(CASE WHEN jsonb_typeof(b.faqs::jsonb) = 'array' THEN b.faqs::jsonb ELSE '[]'::jsonb END) WITH ORDINALITY AS faqs(item, ordinality)
      CROSS JOIN (VALUES ('question'), ('answer')) AS keys(key)
      WHERE jsonb_typeof(item -> key) = 'string'
  ) source WHERE public.translation_text_present(source.value);
$$;
