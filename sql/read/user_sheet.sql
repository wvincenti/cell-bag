SELECT
    sheets.id as sheet_id
    ,sheets.name as sheet_name
    ,sheets.visibility
    ,sheets.updated_at
    ,cols.name as column_name
    ,cols.index as column_index
    ,cols.data_type
    ,us.permission
FROM sheets
    INNER JOIN sheet_cols cols ON cols.sheet_id = sheets.id
    INNER JOIN users_sheets us ON us.sheet_id = sheets.id
WHERE 
    sheets.id = ?
ORDER BY
    sheet_id    
    ,column_index