SELECT
    sheets.id as sheet_id,
    sheets.name as sheet_name,
    cols.name as column_name,
    cols.index as column_index
FROM sheets
    INNER JOIN cols ON cols.sheet_id = sheets.id