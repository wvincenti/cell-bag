DELETE FROM cell_values 
WHERE 
    sheet_id = ?
    AND row_index = ?
    AND col_index = ?