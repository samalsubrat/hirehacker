// lib/db.ts
import { Pool } from "pg";

const pool = new Pool({
  user: "postgres",
  host: "192.168.29.77",
  database: "postgres",
  password: "subrat",
  port: 5432,
});

export default pool;
