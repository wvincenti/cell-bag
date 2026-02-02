const express = require("express");
const mariadb = require("mariadb");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

require("dotenv").config();
// Database Connection Pool
const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  connectionLimit: 5,
});

// GET: Fetch all cells for a specific sheet
app.get("/api/cells/:sheetId", async (req, res) => {
  console.log("request recieved");
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      "SELECT sheet_id, row_id, col_id, cell_value FROM cells WHERE sheet_id = ?",
      [req.params.sheetId],
    );

    const cells = [];

    rows.forEach((row) => {
      cells.push({
        id: row.sheet_id + "-" + row.row_id + "-" + row.col_id,
        value: row.cell_value,
      });
    });

    console.log(cells);
    res.json(cells);
  } catch (err) {
    res.status(500).send(err);
  } finally {
    if (conn) conn.release();
  }
});

app.get("/api/sheets/latestId", async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query("SELECT MAX(id) AS id FROM sheets");
    const id = rows.length > 0 ? rows[0].id : 0;
    res.send(id);
  } catch (err) {
    res.status(500).send(err.message);
  } finally {
    if (conn) conn.release();
  }
});

// POST: Update or Insert a cell
app.post("/api/cells/saveCells", async (req, res) => {
  console.log("save request recieved");

  const { cells } = req.body;

  if (!cells || cells.length === 0) return res.sendStatus(400);
  const sheetId = cells[0]["sheet_id"];

  const foundColumns = {};
  const columns = [];

  const values = cells.map((c) => {
    
    if (!foundColumns[c.col_index]) {
      foundColumns[c.col_index] = true;
      columns.push([c.col_index, c.sheet_id]);
    }

    return [c.sheet_id, c.row_index, c.col_index, c.content];
  });

  console.log("save request recieved");
  console.log(values);
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query("INSERT IGNORE INTO sheets (id, name) VALUES (?,?)", [
      sheetId,
      null,
    ]);
    const query = `
            INSERT INTO cells (sheet_id, row_id, col_id, cell_value)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE cell_value = VALUES(cell_value)`;
    await conn.batch(query, values);

    const columnQuery = `
          INSERT IGNORE INTO columns (id, sheet_id)
          VALUES (?, ?)
          `;
    await conn.batch(columnQuery, columns)

    res.sendStatus(200);
  } catch (err) {
    res.status(500).send(err);
  } finally {
    if (conn) conn.release();
  }
});

app.post("/api/updateName", async (req, res) => {
  const sheetId = req.body.sheet_id;
  const newName = req.body.new_name;
  const tableName = req.body.table_name;

  // 1. Define the "Safe List"
  const allowedTables = ["sheets", "columns", "cell_data"];

  // 2. The Check
  if (!allowedTables.includes(tableName)) {
    // Log the attempt for security monitoring
    console.warn(
      `Security Alert: Unauthorized table access attempt: ${tableName}`,
    );
    return res.status(403).json({ error: "Invalid table name" });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query("UPDATE " + tableName + " SET name = ? WHERE id = ?", [
      newName,
      sheetId,
    ]);
    res.sendStatus(200);
  } catch (err) {
    res.status(500).send(err);
  } finally {
    if (conn) conn.release();
  }
});

app.get("/api/db", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    console.log("db request recieved");

    const rows = await conn.query(
      `SELECT 
            sheets.id as sheet_id
            ,sheets.name as sheet_name
            ,columns.name as column_name
            ,columns.id as column_id
            
        FROM sheets
            INNER JOIN columns ON columns.sheet_id = sheets.id
        `,
    );

    const rowCounts = await conn.query(
      `WITH count AS (
        SELECT
            sheet_id
            ,COUNT(row_id) AS row_count
        FROM cells
        GROUP BY 
            sheet_id
            ,col_id
        )
        SELECT sheet_id, MAX(row_count) AS row_count FROM count GROUP BY sheet_id
        `,
    );

    console.log(`Found ${rows.length} columns across all tables.`);
    console.log(rowCounts);
    console.log(rows);
    const sheets = {};
    const counts = {};
    rowCounts.forEach((count) => {
      counts[count.sheet_id] = Number(count.row_count);
    });
    for (const row of rows) {
      if (!sheets[row.sheet_id])
        sheets[row.sheet_id] = {
          id: row.sheet_id,
          name: row.sheet_name,
          cols: [],
          row_count: counts[row.sheet_id],
        };

      const sheetCol = { id: row.column_id, name: row.column_name };
      sheets[row.sheet_id]["cols"].push(sheetCol);
    }
    console.log(sheets);
    res.json(sheets); // This is the response.data Pinia receives
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) {
      conn.release();
    }
  }
});

app.listen(process.env.PORT, () =>
  console.log("Backend running on localhost:" + process.env.PORT),
);
