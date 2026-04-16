const express = require("express");

const mariadb = require("mariadb");
const cors = require("cors");
const queries = require("./dbUtils");

const bcrypt = require("bcrypt");
const crypto = require("crypto");

const session = require("express-session");
const FileStore = require("session-file-store")(session);

require("dotenv").config();

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());

const dynamicSecret = crypto.randomBytes(32).toString("hex");

console.log(
  `[Server] Booting up with Secret Key: ${dynamicSecret.substring(0, 8)}...`,
);

app.use(
  session({
    // Using our freshly minted key
    secret: dynamicSecret,

    // store: new FileStore({
    //   path: "./sessions",
    //   // Optional: clear expired sessions on boot
    //   reapInterval: 3600,
    // }),

    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
      httpOnly: true,
      secure: false, // Set to true if you move to HTTPS!
      sameSite: 'lax',
    },
  }),
);

// 2. The Global Check (Must come second)
app.use((req, res, next) => {
  // List of routes that DON'T need a login (whitelist)
  console.log(req.path);
  const publicRoutes = ["/api/login", "/api/register", "/api/public"];

  if (publicRoutes.includes(req.path)) {
    return next(); // Let them through to the login page!
  }

  // Check the session file for the user_id
  if (req.session.user_id) {
    console.log(`User ${req.session.user_id} is authenticated.`);
    next(); // Math/Signature/File all matched! Proceed to the route.
  } else {
    console.log("No valid session found. Redirecting...");
    res.status(401).json({ message: "Session expired" });
  }
});

// Database Connection Pool
const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  connectionLimit: 5,
});

app.get("/api/session", (req, res) => {
  console.log('SESSION')
  console.log(req.session);
  if (req.session.user) {
    res.json({
      authenticated: true,
      user: req.session.user,
    });
  } else {
    res.json({ authenticated: false });
  }
});

// GET: Fetch all cells for a specific sheet
app.get("/api/cells/:sheetId", async (req, res) => {
  console.log("request recieved");
  withTransaction(res, async (conn) => {
    const data = await conn.query(queries.sheetCells, req.params.sheetId);
    console.log(data);
    const sheet = [];

    data.forEach((row) => {
      if (!sheet[row.row_id]) sheet[row.row_id] = {};

      sheet[row.row_id][row.col_id] = {
        value: row.cell_value,
        row: row.row_id,
        col: row.col_id,
        sheet_id: row.sheet_id,
        isDirty: false,
      };
    });

    console.log(sheet);
    res.json(sheet);
  });
});

app.get("/api/sheets/latestId", async (req, res) => {
  withTransaction(res, async (conn) => {
    conn = await pool.getConnection();

    const rows = await conn.query("SELECT MAX(id) AS id FROM sheets");

    const id = rows.length > 0 ? rows[0].id : 0;
    console.log(id);

    res.send(id.toString());
  });
});

app.get("/api/db", async (req, res) => {
  console.log("read sheets request recieved");
  const sheets = await withTransaction(res, async (conn) => {
    const rows = await conn.execute(queries.readSheets);

    const sheets = {};
    const counts = {};

    console.log("rows..");
    console.log(rows);
    const cols = {};
    rows.forEach((row, index) => {
      if (!sheets[row.sheet_id.ToString()]) {
        sheets[row.sheet_id] = {
          id: row.sheet_id.ToString(),
          name: row.sheet_name,
          cols: [],
          row_count: counts[row.sheet_id.ToString()],
        };
      }
      const sheetCol = { id: row.column_id, name: row.column_name };
      sheets[row.sheet_id.ToString()]["cols"].push(sheetCol);
    });

    console.log(sheets);
    console.log("*** !!!OK!!! ***");
    return sheets;
  });

  res.json(sheets); // This is the response.data Pinia receives

  // const rowCounts = await conn.query(
  //   `WITH count AS (
  //     SELECT
  //         sheet_id
  //         ,COUNT(row_id) AS row_count
  //     FROM cells
  //     GROUP BY
  //         sheet_id
  //         ,col_id
  //     )
  //     SELECT sheet_id, MAX(row_count) AS row_count FROM count GROUP BY sheet_id
  //     `,
  // );
  //   console.log(`Found ${rows.length} columns across all tables.`);
  // console.log(rowCounts);
  // const sheets = {};
  // const counts = {};
  // rowCounts.forEach((count) => {
  //   counts[count.sheet_id] = Number(count.row_count);
  // });
});

// ** SIGN UP **
app.post("/api/register", async (req, res) => {
  try {
    console.log("ress");
    let { email, username, password } = req.body;

    if (!username) username = email;
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);

    const rows = withTransaction(res, async (conn) => {
      await conn.query(
        "INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)",
        [email, username, hash],
      );

      // LOGIN NEW USER
      const r = await conn.query("SELECT * FROM users WHERE email = ?", [
        email,
      ]);
      return r;
    });

    const user = rows[0];
    console.log(user);

    // Compare the login password with the hash in the DB
    const match = await bcrypt.compare(password, user.password_hash);

    if (match) {
      // SAVE TO SIGNED COOKIE SESSION
      req.session.user_id = user.id;
      return res.send("Logged in!");
    }

    res.status(401).send("Invalid email or password.");
  } catch (ex) {
    console.log(ex);
  }
});

// *** LOG IN ***
app.post("/api/login", async (req, res) => {
  console.log(req.body);

  const { email, password } = req.body;

  const rows = await withTransaction(res, async (conn) => {
    return await conn.query("SELECT * FROM users WHERE email = ?", [email]);
  });

  console.log(rows);

  try {
    if (rows.length > 0) {
      const user = rows[0];
      // Compare the login password with the hash in the DB
      const match = await bcrypt.compare(password, user.password_hash);
      console.log(match);
      if (match) {
        // SAVE TO SIGNED COOKIE SESSION
        console.log(req.session);
        req.session.user_id = user.id;
        console.log(req.session);
        return res.send("Logged in!");
      }

      res.status(401).send("Invalid email or password.");
    }
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// POST: Update or Insert a cell
app.post("/api/cells/saveCells", async (req, res) => {
  console.log("save request recieved");
  console.log(req.body);
  const { cells } = req.body;
  console.log(cells);

  if (!cells || cells.length === 0) return res.sendStatus(400);

  const sheetId = cells[0]["sheet_id"];

  console.log(sheetId);

  const foundColumns = {};
  const columns = [];

  const foundRows = {};
  const rows = [];

  const values = cells.map((c) => {
    if (!foundColumns[c.col_id]) {
      foundColumns[c.col_id] = true;
      columns.push([c.sheet_id, c.col_id]);
    }

    if (!foundRows[c.row_id]) {
      foundRows[c.row_id] = true;
      rows.push([c.sheet_id, c.row_id]);
    }

    return [c.sheet_id, c.row_id, c.col_id, c.display_val, "string"];
  });

  console.log("cols");
  console.log(columns);

  console.log("sheets");
  console.log(sheetId);

  console.log("save request recieved");
  console.log(values);

  withTransaction(res, async (conn) => {
    await conn.execute(queries.insertIgnoreSheet, [sheetId, null]);
    console.log("ok");

    await conn.batch(
      "INSERT IGNORE INTO sheet_rows (sheet_id, id) VALUES (?, ?)",
      rows,
    );

    await conn.batch(queries.insertIgnoreCol, columns);

    await conn.batch(queries.upsertCells, values);
  });
});

app.post("/api/deleteSheet", async (req, res) => {
  let { sheet_id } = req.body;
  sheet_id = Number(sheet_id);
  if (!sheet_id) return res.status(400).send("Missing sheet id");
  console.log(sheet_id);
  let conn;

  try {
    conn = await pool.getConnection();

    await conn.beginTransaction();

    await conn.query("DELETE FROM Cells WHERE sheet_id = ?", [sheet_id]);

    await conn.query("DELETE FROM Sheets WHERE id = ?", [sheet_id]);

    await conn.commit();

    res.status(200).json({ success: true, deleted: sheet_id });
  } catch (err) {
    if (conn) await conn.rollback();
    res.status(500).send(err);
  } finally {
    if (conn) conn.release();
  }
});

app.post("/api/updateName", async (req, res) => {
  console.log("updating name");
  const sheetId = req.body.sheet_id;
  const newName = req.body.new_name;
  const tableName = req.body.table_name;

  console.log(req.body);

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
    console.log("starting db connection");
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

app.listen(process.env.PORT, () =>
  console.log("Backend running on localhost:" + process.env.PORT),
);

/**
 * Higher-order function to handle DB transactions safely.
 * @param {Function} action - The async logic to run inside the transaction.
 * @param {Object} res - The Express response object to handle errors.
 */

async function withTransaction(res, action) {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // Run the actual logic and pass the connection to it
    const result = await action(conn);

    await conn.commit();
    return result;
  } catch (err) {
    if (conn) await conn.rollback();
    console.error("Database Error:", err);

    // Centralized error response
    res
      .status(500)
      .json({ error: "Database Transaction Failed", details: err.message });
    throw err; // Re-throw so the route knows it failed
  } finally {
    if (conn) conn.release();
  }
}
