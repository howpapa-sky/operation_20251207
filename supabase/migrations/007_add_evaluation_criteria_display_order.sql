-- 평가 항목에 표시 순서(display_order) 컬럼 추가
-- Add display_order column to evaluation_criteria table

ALTER TABLE evaluation_criteria
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- 기존 데이터에 대해 순서 초기화 (id 순으로 순번 부여)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at, id) AS row_num
  FROM evaluation_criteria
)
UPDATE evaluation_criteria
SET display_order = numbered.row_num
FROM numbered
WHERE evaluation_criteria.id = numbered.id;
