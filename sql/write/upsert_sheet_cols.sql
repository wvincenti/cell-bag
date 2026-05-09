INSERT INTO sheet_cols (sheet_id, `index`, name, data_type)
VALUES (?, ?, ?, ?)
ON DUPLICATE KEY UPDATE
    `index` = VALUES(`index`),
    name = VALUES(name),
    data_type = VALUES(data_type);