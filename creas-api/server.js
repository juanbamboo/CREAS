/* ============================================================
 *  CREAS · API del tablero
 *  Express + Postgres. Lectura pública, escritura con clave única.
 *
 *  Variables de entorno (se cargan en Railway, NO acá):
 *    DATABASE_URL  → referencia a ${{ Postgres.DATABASE_URL }}
 *    EDIT_KEY      → tu clave única para editar
 * ============================================================ */

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());              // permite que el front (Cloudflare) le pegue
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes("proxy.rlwy")
    ? { rejectUnauthorized: false } : false
});

const EDIT_KEY = process.env.EDIT_KEY || "cambiame";

/* ---- Tablas permitidas y sus columnas editables (whitelist = seguridad) ---- */
const TABLES = {
  detalles: { order: "orden",              insert: ["clave","valor","orden"],
              update: ["clave","valor","orden"] },
  bloqueos: { order: "id",                 insert: ["titulo","quien","para"],
              update: ["titulo","quien","para"] },
  tareas:   { order: "id",                 insert: ["categoria","nombre","responsable","inicio","fin","prioridad","critico","estado"],
              update: ["categoria","nombre","responsable","inicio","fin","prioridad","critico","estado"] },
  riesgos:  { order: "id",                 insert: ["id","riesgo","categoria","impacto","probabilidad","mitigacion","accion","dueno","estado"],
              update: ["riesgo","categoria","impacto","probabilidad","mitigacion","accion","dueno","estado"] },
  equipo:   { order: "id",                 insert: ["nombre","rol","tipo","contacto","estado","proxima_accion"],
              update: ["nombre","rol","tipo","contacto","estado","proxima_accion"] },
  log:      { order: "fecha DESC, id DESC", insert: ["fecha","actividad","categoria","responsable"],
              update: ["fecha","actividad","categoria","responsable"] },
  gastos:   { order: "fecha DESC, id DESC", insert: ["fecha","concepto","categoria","monto"],
              update: ["fecha","concepto","categoria","monto"] }
};

/* ---- Auth: solo escritura necesita la clave ---- */
function requireKey(req, res, next) {
  const auth = req.headers.authorization || "";
  const key = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (key !== EDIT_KEY) return res.status(401).json({ error: "Clave inválida" });
  next();
}

/* ---- Salud ---- */
app.get("/api/health", (_req, res) => res.json({ ok: true }));

/* ---- Validar clave (para que el front entre en modo edición) ---- */
app.post("/api/auth", (req, res) => {
  res.json({ ok: (req.body && req.body.key) === EDIT_KEY });
});

/* ---- Lectura: todo el tablero de una (público) ---- */
app.get("/api/data", async (_req, res) => {
  try {
    const out = {};
    for (const [t, cfg] of Object.entries(TABLES)) {
      const r = await pool.query(`SELECT * FROM ${t} ORDER BY ${cfg.order}`);
      out[t] = r.rows;
    }
    res.json(out);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error leyendo la base" });
  }
});

/* ---- Crear (auth) ---- */
app.post("/api/:table", requireKey, async (req, res) => {
  const cfg = TABLES[req.params.table];
  if (!cfg) return res.status(404).json({ error: "Tabla no permitida" });
  const cols = cfg.insert.filter(c => c in req.body);
  if (!cols.length) return res.status(400).json({ error: "Nada para insertar" });
  const vals = cols.map(c => req.body[c]);
  const ph = cols.map((_, i) => `$${i + 1}`);
  try {
    const r = await pool.query(
      `INSERT INTO ${req.params.table} (${cols.join(",")}) VALUES (${ph.join(",")}) RETURNING *`, vals);
    res.status(201).json(r.rows[0]);
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

/* ---- Actualizar (auth) ---- */
app.put("/api/:table/:id", requireKey, async (req, res) => {
  const cfg = TABLES[req.params.table];
  if (!cfg) return res.status(404).json({ error: "Tabla no permitida" });
  const cols = cfg.update.filter(c => c in req.body);
  if (!cols.length) return res.status(400).json({ error: "Nada para actualizar" });
  const set = cols.map((c, i) => `${c}=$${i + 1}`);
  const vals = cols.map(c => req.body[c]);
  vals.push(req.params.id);
  try {
    const r = await pool.query(
      `UPDATE ${req.params.table} SET ${set.join(",")} WHERE id=$${vals.length} RETURNING *`, vals);
    if (!r.rows.length) return res.status(404).json({ error: "No encontrado" });
    res.json(r.rows[0]);
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

/* ---- Borrar (auth) ---- */
app.delete("/api/:table/:id", requireKey, async (req, res) => {
  if (!TABLES[req.params.table]) return res.status(404).json({ error: "Tabla no permitida" });
  try {
    await pool.query(`DELETE FROM ${req.params.table} WHERE id=$1`, [req.params.id]);
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`CREAS API en puerto ${PORT}`));
