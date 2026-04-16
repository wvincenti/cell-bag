INSERT INTO cells (sheet_id, row_id, col_id, display_val, data_type)
VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY
UPDATE display_val =
VALUES(display_val),
    data_type =
VALUES(data_type),
    updated_at = CURRENT_TIMESTAMP()    
;
