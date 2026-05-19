SELECT 
    c.sheet_id
	,c.row_index
	,c.col_index
	,c.display_val
    ,cv.data_type
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