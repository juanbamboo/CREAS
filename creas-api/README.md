# CREAS · API del tablero

API en Express que sirve los datos del tablero desde Postgres.
Lectura pública; escritura solo con tu clave única.

## Desplegar en Railway (desde GitHub — tu flujo)

1. **Subí esta carpeta a un repo de GitHub** (por ej. `creas-api`).
   Los tres archivos: `server.js`, `package.json`, `.gitignore`.

2. En Railway, dentro del proyecto **CREAS**:
   **New → GitHub Repo → elegí `creas-api`.**
   Railway detecta Node solo y corre `npm install` + `npm start`.

3. En el servicio de la API, pestaña **Variables**, agregá dos:
   - `DATABASE_URL` = `${{ Postgres.DATABASE_URL }}`  ← esto conecta con tu base (es la pantalla "Connect to Postgres" que viste)
   - `EDIT_KEY` = *tu clave secreta para editar* (elegí una y guardala)

4. Pestaña **Settings → Networking → Generate Domain**.
   Railway te da una URL pública, por ej. `https://creas-api-production.up.railway.app`.
   **Esa URL es la base de la API.** Guardala: la necesita el front.

## Probar que anda

Abrí en el navegador:
`https://TU-URL/api/data`

Tenés que ver un JSON con `detalles`, `tareas`, `riesgos`, etc.
Si ves los datos → la API está viva y seguimos con el front.

## Endpoints

| Método | Ruta | Auth | Qué hace |
|---|---|---|---|
| GET  | `/api/data` | no | Devuelve todas las tablas |
| GET  | `/api/health` | no | Chequeo de salud |
| POST | `/api/auth` | no | Valida la clave (para el modo edición) |
| POST | `/api/:tabla` | sí | Crea un registro |
| PUT  | `/api/:tabla/:id` | sí | Edita un registro |
| DELETE | `/api/:tabla/:id` | sí | Borra un registro |

La escritura necesita el header `Authorization: Bearer TU_CLAVE`.
El front lo maneja solo cuando entrás en modo edición.
