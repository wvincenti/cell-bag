DELETE sc FROM sheet_cols sc
WHERE 
    sc.sheet_id = ?
    AND NOT EXISTS (
        SELECT 1
        FROM cells c
        WHERE sc.index = c.col_index
    );