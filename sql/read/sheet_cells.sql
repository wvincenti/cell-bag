SELECT 
   c.sheet_id
	,c.row_index 
    ,c.col_index
	,c.display_val as cell_value
    ,c.display_val as old_value
    ,cv.data_type
    ,FALSE as isDirty
FROM cells c
    INNER JOIN cell_values cv 
        ON cv.sheet_id = c.sheet_id 
        AND cv.col_index = c.col_index
        AND cv.row_index = c.row_index
WHERE 
	c.sheet_id = ?
ORDER BY
    c.sheet_id
	,c.row_index
	,c.col_index