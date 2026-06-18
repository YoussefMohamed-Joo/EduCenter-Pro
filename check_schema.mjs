import initSqlJs from 'sql.js';
import fs from 'fs';

const dbPath = 'C:\\Users\\yousef\\AppData\\Roaming\\educenter-pro\\educenter-pro.db';

async function main() {
  const SQL = await initSqlJs({
    locateFile: (file) => 'node_modules/sql.js/dist/' + file
  });
  
  const buf = fs.readFileSync(dbPath);
  const db = new SQL.Database(buf);
  
  // Check full schema of staff table
  const r = db.exec("PRAGMA table_info(staff)");
  console.log("Staff table schema:", JSON.stringify(r, null, 2));
  
  // Check all tables
  const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  console.log("All tables:", JSON.stringify(tables, null, 2));
  
  // Try exact login query
  const loginQuery = db.exec("SELECT id, username, full_name, role, permissions FROM staff WHERE username = 'admin' AND password = 'admin123' AND is_active = 1");
  console.log("Login query result:", JSON.stringify(loginQuery, null, 2));

  db.close();
}

main().catch(console.error);
