const express = require('express');
const mariadb = require('mariadb');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

require('dotenv').config();
// Database Connection Pool
const pool = mariadb.createPool({
     host: process.env.DB_HOST,
     port: process.env.DB_PORT, 
     user: process.env.DB_USER, 
     password: process.env.DB_PASS,
     database: process.env.DB_NAME,
     connectionLimit: 5
});

// GET: Fetch all cells for a specific sheet
app.get('/api/cells/:sheetId', async (req, res) => {
    console.log('request recieved')
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query(
            "SELECT row_index, col_index, cell_value FROM spreadsheet_cells WHERE sheet_id = ?", 
            [req.params.sheetId]
        );
        console.log(rows)
        res.json(rows);
    } catch (err) {
        res.status(500).send(err);
    } finally {
        if (conn) conn.release();
    }
});

app.get('/api/sheets/latestId', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query(
            "SELECT MAX(id) AS id FROM sheets"
        )
        const id = rows.length > 0 ? rows[0].id : 0;
        res.send(id);
    } catch (err) {
        res.status(500).send(err.message);
    } finally {
        if (conn) conn.release();
    }
})

// POST: Update or Insert a cell
app.post('/api/cells/saveCells', async (req, res) => {
    const {cells} = req.body;

    if (!cells || cells.length === 0) return res.sendStatus(400);
    const sheetId = cells[0]['sheet_id'];
    const values = cells.map(c => [c.sheet_id, c.row_index, c.col_index, c.content]);

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query("INSERT IGNORE INTO sheets (id, name) VALUES (?,?)", [sheetId, 'NULL']);
        const query = `
            INSERT INTO cells (sheet_id, row_id, col_id, cell_value)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE cell_value = VALUES(cell_value)`;
        await conn.batch(query, values);
        res.sendStatus(200);
    } catch (err) {
        res.status(500).send(err);
    } finally {
        if (conn) conn.release();
    }
});

app.get('/api/db', async (req, res) => {
  try {
    console.log('db request recieved');
    const rows = await pool.query(
      `SELECT 
            sheets.id as sheet_id
            ,sheets.name as sheet_name
            ,columns.name as column_name
            ,columns.id as column_id
        FROM sheets
            INNER JOIN columns ON columns.sheet_id = sheets.id
        `
    );
   console.log(`Found ${rows.length} columns across all tables.`);
   const groups = {}
    for (const row of rows)
    {
        if (!groups[row.table_name]) groups[row.table_name] = [];
        groups[row.table_name].push(row);
    }
    console.log(groups)
    res.json(groups); // This is the response.data Pinia receives
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(process.env.PORT, () => console.log('Backend running on localhost:'+ process.env.PORT ));