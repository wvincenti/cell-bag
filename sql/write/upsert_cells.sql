INSERT INTO cells (sheet_id, row_index, col_id, display_val, data_type)
VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY
UPDATE 
    sheet_id = VALUES(sheet_id)
    ,row_index = VALUES(row_index)
    ,col_id = VALUES(col_id)
    ,display_val = VALUES(display_val)
    ,data_type = VALUES(data_type)
    ,updated_at = CURRENT_TIMESTAMP()    
;
