INSERT INTO cell_values (
    row_index, col_id, data_type, 
    val_string, val_numeric, val_datetime, val_bool, val_currency, val_formula
)
VALUES (
    ?, ?, ?, 
    /* We only fill the column that matches the data_type */
    CASE WHEN ? = 'string' THEN ? ELSE NULL END,
    CASE WHEN ? = 'numeric' THEN ? ELSE NULL END,
    CASE WHEN ? = 'datetime' THEN ? ELSE NULL END,
    CASE WHEN ? = 'bool' THEN ? ELSE NULL END,
    CASE WHEN ? = 'currency' THEN ? ELSE NULL END,
    CASE WHEN ? = 'formula' THEN ? ELSE NULL END
)
ON DUPLICATE KEY UPDATE 
    /* IMPORTANT: If the user changes '100' to 'Hello', 
       we need to clear out the old numeric value and set the new string value. */
    data_type    = VALUES(data_type),
    val_string   = VALUES(val_string),
    val_numeric  = VALUES(val_numeric),
    val_datetime = VALUES(val_datetime),
    val_bool     = VALUES(val_bool),
    val_currency = VALUES(val_currency),
    val_formula  = VALUES(val_formula);