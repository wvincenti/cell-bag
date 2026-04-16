SELECT
    sheets.id as sheet_id,
    sheets.name as sheet_name,
    cols.name as column_name,
    cols.id as column_id
FROM sheets
    INNER JOIN cols ON cols.sheet_id = sheets.id