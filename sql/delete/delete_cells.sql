DELETE FROM cells
WHERE 
    sheet_id = ?
    AND row_index = ?
    AND col_index = ?