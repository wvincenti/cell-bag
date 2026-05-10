DELETE sr FROM sheet_rows sr
WHERE 
    sr.sheet_id = ?
    AND NOT EXISTS (
        SELECT 1
        FROM cells c
        WHERE 
            sr.index = c.row_index
    );