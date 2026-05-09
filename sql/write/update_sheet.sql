UPDATE sheets sheet
    INNER JOIN users_sheets us ON us.sheet_id = sheet.id
SET 
    sheet.name = ?
    ,sheet.visibility = ?
WHERE 
    us.sheet_id = ?
    AND us.user_id = ?
    AND us.permission IN ('admin', 'write');