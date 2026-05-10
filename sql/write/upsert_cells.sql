INSERT INTO cells (sheet_id, row_index, col_index, display_val)
-- SELECT ?, ?, ?, ?
-- FROM dual
-- WHERE EXISTS (
--     SELECT 1 
--     FROM users_sheets us
--     WHERE 
--         us.user_id = ? 
--         AND us.sheet_id = ? 
--         AND us.permission IN ('admin', 'write')

-- )
VALUES (?, ?, ?, ?) ON DUPLICATE KEY
UPDATE 
    sheet_id = VALUES(sheet_id)
    ,row_index = VALUES(row_index)
    ,col_index = VALUES(col_index)
    ,display_val = VALUES(display_val)
    ,updated_at = CURRENT_TIMESTAMP()    
;
