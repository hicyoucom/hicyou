-- Custom SQL migration file, put your code below! --
-- Keep the public change feed current even when a write path does not set
-- bookmarks.updated_at explicitly. Operational-only bookmark fields are
-- intentionally excluded so internal maintenance does not create sync noise.
CREATE OR REPLACE FUNCTION hicyou_set_bookmark_public_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF ROW(
    NEW.url,
    NEW.title,
    NEW.slug,
    NEW.description,
    NEW.category_id,
    NEW.favicon,
    NEW.screenshot,
    NEW.overview,
    NEW.og_image,
    NEW.pricing_type,
    NEW.status,
    NEW.published_at,
    NEW.deleted_at,
    NEW.is_archived,
    NEW.is_dofollow,
    NEW.alternatives,
    NEW.why_startups,
    NEW.key_features::jsonb,
    NEW.use_cases::jsonb,
    NEW.faqs::jsonb
  ) IS DISTINCT FROM ROW(
    OLD.url,
    OLD.title,
    OLD.slug,
    OLD.description,
    OLD.category_id,
    OLD.favicon,
    OLD.screenshot,
    OLD.overview,
    OLD.og_image,
    OLD.pricing_type,
    OLD.status,
    OLD.published_at,
    OLD.deleted_at,
    OLD.is_archived,
    OLD.is_dofollow,
    OLD.alternatives,
    OLD.why_startups,
    OLD.key_features::jsonb,
    OLD.use_cases::jsonb,
    OLD.faqs::jsonb
  ) THEN
    NEW.updated_at := clock_timestamp();
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER bookmarks_public_updated_at
BEFORE UPDATE ON bookmarks
FOR EACH ROW
EXECUTE FUNCTION hicyou_set_bookmark_public_updated_at();
--> statement-breakpoint

-- Transition tables let a batch write update each affected parent once.
CREATE OR REPLACE FUNCTION hicyou_touch_bookmarks_from_new_rows()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE bookmarks AS b
  SET updated_at = clock_timestamp()
  WHERE b.id IN (SELECT DISTINCT bookmark_id FROM new_rows);
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION hicyou_touch_bookmarks_from_old_rows()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE bookmarks AS b
  SET updated_at = clock_timestamp()
  WHERE b.id IN (SELECT DISTINCT bookmark_id FROM old_rows);
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION hicyou_touch_bookmarks_from_changed_rows()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE bookmarks AS b
  SET updated_at = clock_timestamp()
  WHERE b.id IN (
    SELECT bookmark_id FROM old_rows
    UNION
    SELECT bookmark_id FROM new_rows
  );
  RETURN NULL;
END;
$$;
--> statement-breakpoint

CREATE TRIGGER bookmark_categories_touch_after_insert
AFTER INSERT ON bookmark_categories
REFERENCING NEW TABLE AS new_rows
FOR EACH STATEMENT
EXECUTE FUNCTION hicyou_touch_bookmarks_from_new_rows();
--> statement-breakpoint
CREATE TRIGGER bookmark_categories_touch_after_update
AFTER UPDATE ON bookmark_categories
REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows
FOR EACH STATEMENT
EXECUTE FUNCTION hicyou_touch_bookmarks_from_changed_rows();
--> statement-breakpoint
CREATE TRIGGER bookmark_categories_touch_after_delete
AFTER DELETE ON bookmark_categories
REFERENCING OLD TABLE AS old_rows
FOR EACH STATEMENT
EXECUTE FUNCTION hicyou_touch_bookmarks_from_old_rows();
--> statement-breakpoint

CREATE TRIGGER bookmark_tags_touch_after_insert
AFTER INSERT ON bookmark_tags
REFERENCING NEW TABLE AS new_rows
FOR EACH STATEMENT
EXECUTE FUNCTION hicyou_touch_bookmarks_from_new_rows();
--> statement-breakpoint
CREATE TRIGGER bookmark_tags_touch_after_update
AFTER UPDATE ON bookmark_tags
REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows
FOR EACH STATEMENT
EXECUTE FUNCTION hicyou_touch_bookmarks_from_changed_rows();
--> statement-breakpoint
CREATE TRIGGER bookmark_tags_touch_after_delete
AFTER DELETE ON bookmark_tags
REFERENCING OLD TABLE AS old_rows
FOR EACH STATEMENT
EXECUTE FUNCTION hicyou_touch_bookmarks_from_old_rows();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION hicyou_touch_bookmarks_from_translation_new_rows()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE bookmarks AS b
  SET updated_at = clock_timestamp()
  WHERE b.id IN (
    SELECT DISTINCT entity_id
    FROM new_rows
    WHERE entity_type = 'bookmark'
  );
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION hicyou_touch_bookmarks_from_translation_old_rows()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE bookmarks AS b
  SET updated_at = clock_timestamp()
  WHERE b.id IN (
    SELECT DISTINCT entity_id
    FROM old_rows
    WHERE entity_type = 'bookmark'
  );
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION hicyou_touch_bookmarks_from_translation_changed_rows()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE bookmarks AS b
  SET updated_at = clock_timestamp()
  WHERE b.id IN (
    SELECT entity_id FROM old_rows WHERE entity_type = 'bookmark'
    UNION
    SELECT entity_id FROM new_rows WHERE entity_type = 'bookmark'
  );
  RETURN NULL;
END;
$$;
--> statement-breakpoint

CREATE TRIGGER translations_touch_bookmarks_after_insert
AFTER INSERT ON translations
REFERENCING NEW TABLE AS new_rows
FOR EACH STATEMENT
EXECUTE FUNCTION hicyou_touch_bookmarks_from_translation_new_rows();
--> statement-breakpoint
CREATE TRIGGER translations_touch_bookmarks_after_update
AFTER UPDATE ON translations
REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows
FOR EACH STATEMENT
EXECUTE FUNCTION hicyou_touch_bookmarks_from_translation_changed_rows();
--> statement-breakpoint
CREATE TRIGGER translations_touch_bookmarks_after_delete
AFTER DELETE ON translations
REFERENCING OLD TABLE AS old_rows
FOR EACH STATEMENT
EXECUTE FUNCTION hicyou_touch_bookmarks_from_translation_old_rows();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION hicyou_touch_bookmarks_from_category_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF ROW(NEW.name, NEW.slug, NEW.status) IS DISTINCT FROM ROW(OLD.name, OLD.slug, OLD.status) THEN
    UPDATE bookmarks AS b
    SET updated_at = clock_timestamp()
    WHERE b.category_id = NEW.id
       OR EXISTS (
         SELECT 1
         FROM bookmark_categories AS bc
         WHERE bc.bookmark_id = b.id AND bc.category_id = NEW.id
       );
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER categories_touch_bookmarks_after_update
AFTER UPDATE ON categories
FOR EACH ROW
EXECUTE FUNCTION hicyou_touch_bookmarks_from_category_update();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION hicyou_touch_bookmarks_from_tag_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.slug IS DISTINCT FROM OLD.slug THEN
    UPDATE bookmarks AS b
    SET updated_at = clock_timestamp()
    WHERE EXISTS (
      SELECT 1
      FROM bookmark_tags AS bt
      WHERE bt.bookmark_id = b.id AND bt.tag_id = NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER tags_touch_bookmarks_after_update
AFTER UPDATE ON tags
FOR EACH ROW
EXECUTE FUNCTION hicyou_touch_bookmarks_from_tag_update();
