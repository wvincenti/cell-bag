SELECT DISTINCT
    sc.sheet_a 
    ,sc.sheet_b
FROM sheet_connections sc
    INNER JOIN users_sheets us 
        ON us.sheet_id = sc.sheet_a 
        OR us.sheet_id = sc.sheet_b
WHERE
   us.user_id = ?
ORDER BY
    sc.sheet_a
    ,sc.sheet_b