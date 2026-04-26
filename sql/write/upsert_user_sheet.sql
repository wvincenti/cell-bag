INSERT INTO user_sheets (user_id, sheet_id, permission)
VALUES(?,?,?) ON DUPLICATE KEY
UPDATE
    permission = VALUES(permission);