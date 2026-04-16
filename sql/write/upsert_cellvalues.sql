INSERT INTO cell_values (
        row_id,
        col_id,
        val_string,
        val_numeric,
        val_datetime,
        val_bool
    )
VALUES (
        ?,
        ?,
        CASE
            WHEN ? = 'string' THEN ?
            ELSE NULL
        END,
        CASE
            WHEN ? = 'numeric' THEN ?
            ELSE NULL
        END,
        CASE
            WHEN ? = 'datetime' THEN ?
            ELSE NULL
        END,
        CASE
            WHEN ? = 'bool' THEN ?
            ELSE NULL
        END -- CASE
        --     WHEN ? = 'currency' THEN ?
        --     ELSE NULL
        -- END,
        -- CASE
        --     WHEN ? = 'percentage' THEN ?
        --     ELSE NULL
        -- END,
    ) ON DUPLICATE KEY
UPDATE val_string = CASE
        WHEN
        VALUES(val_string) IS NOT NULL THEN
        VALUES(val_string)
            ELSE NULL
    END,
    val_numeric = CASE
        WHEN
        VALUES(val_numeric) IS NOT NULL THEN
        VALUES(val_numeric)
            ELSE NULL
    END,
    val_datetime = CASE
        WHEN
        VALUES(val_datetime) IS NOT NULL THEN
        VALUES(val_datetime)
            ELSE NULL
    END,
    val_bool = CASE
        WHEN
        VALUES(val_bool) IS NOT NULL THEN
        VALUES(val_bool)
            ELSE NULL
    END