SELECT 1
FROM users_sheets
WHERE
    sheet_id = ?
    AND user_id = ?
    AND permission IN ('admin', 'write', 'read');