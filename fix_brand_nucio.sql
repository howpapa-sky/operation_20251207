DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname, conrelid::regclass::text AS tbl
    FROM pg_constraint
    WHERE contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%brand%'
      AND conrelid::regclass::text IN (
        'product_guides',
        'seeding_projects',
        'outreach_templates',
        'sku_master',
        'group_purchase_rounds'
      )
  LOOP
    EXECUTE 'ALTER TABLE ' || r.tbl || ' DROP CONSTRAINT ' || r.conname;
  END LOOP;
END $$;

UPDATE brands SET code = 'nucio' WHERE code = 'nuccio';
UPDATE brands SET display_name = 'NUCIO' WHERE display_name = 'NUCCIO';
UPDATE product_guides SET brand = 'nucio' WHERE brand = 'nuccio';
UPDATE seeding_projects SET brand = 'nucio' WHERE brand = 'nuccio';
UPDATE outreach_templates SET brand = 'nucio' WHERE brand = 'nuccio';
UPDATE sku_master SET brand = 'nucio' WHERE brand = 'nuccio';
UPDATE daily_channel_stats SET brand = 'nucio' WHERE brand = 'nuccio';
UPDATE group_purchase_rounds SET brand = 'nucio' WHERE brand = 'nuccio';
UPDATE dev_requests SET brand = 'nucio' WHERE brand = 'nuccio';
UPDATE products SET brand = 'nucio' WHERE brand = 'nuccio';

UPDATE project_field_settings
SET field_options = REPLACE(field_options::text, '"nuccio"', '"nucio"')::jsonb
WHERE field_key = 'brand'
  AND field_options::text LIKE '%nuccio%';

ALTER TABLE product_guides
  ADD CONSTRAINT pg_brand_ck
  CHECK (brand IN ('howpapa', 'nucio'));

ALTER TABLE seeding_projects
  ADD CONSTRAINT sp_brand_ck
  CHECK (brand IN ('howpapa', 'nucio'));

ALTER TABLE outreach_templates
  ADD CONSTRAINT ot_brand_ck
  CHECK (brand IN ('howpapa', 'nucio', 'all'));

ALTER TABLE sku_master
  ADD CONSTRAINT sm_brand_ck
  CHECK (brand IN ('howpapa', 'nucio'));

ALTER TABLE group_purchase_rounds
  ADD CONSTRAINT gpr_brand_ck
  CHECK (brand IN ('howpapa', 'nucio'));
