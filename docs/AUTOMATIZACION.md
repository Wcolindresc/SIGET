# Automatización de pruebas — SIGET

Responsable: Julio Alexis León Rodríguez (Ingeniero de Automatización).
Numeración de requerimientos y casos de prueba según E1–E3 del equipo (RF-01…RF-14, RNF-01…RNF-07, CP-01…CP-30).

## 1. Línea base (registrada el 24/09/2026, antes de agregar pruebas)

| Métrica | Valor | Comando |
|---|---|---|
| Suites / pruebas backend | 4 / 4 aprobadas | backend: `npm test` |
| Cobertura backend (All files, % Stmts) | 7.8 % | backend: `npm run test:cov` |
| Cobertura módulos críticos (% Stmts) | 19.5 % | backend: `npm run test:cov` |
| Archivos / pruebas frontend | 1 / 1 (marcador) | frontend: `npm test` |
| Cobertura frontend | No medible (sin proveedor) | — |
| Vulnerabilidades npm backend | 25 (1 crítica, 9 altas, 11 moderadas, 4 bajas) | backend: `npm install` |
| Vulnerabilidades npm frontend | 8 (2 críticas, 1 alta, 5 moderadas) | frontend: `npm install` |

## 2. Inventario de endpoints (41 endpoints, verificados en Swagger)

Todos requieren `Authorization: Bearer <token>` excepto `POST /auth/login`.

| Módulo | Método | Ruta | Roles permitidos |
|---|---|---|---|
| Auth | POST | /auth/login | Público |
| Auth | GET | /auth/profile | Autenticado |
| Usuarios | GET | /usuarios | ADMINISTRADOR |
| Usuarios | GET | /usuarios/:id | ADMINISTRADOR |
| Usuarios | POST | /usuarios | ADMINISTRADOR |
| Usuarios | PATCH | /usuarios/:id | ADMINISTRADOR |
| Usuarios | PATCH | /usuarios/:id/activar | ADMINISTRADOR |
| Usuarios | PATCH | /usuarios/:id/desactivar | ADMINISTRADOR |
| Categorías | GET | /categorias | Autenticado |
| Categorías | POST | /categorias | ADMINISTRADOR |
| Categorías | PATCH | /categorias/:id | ADMINISTRADOR |
| Equipos | GET | /equipos?estado=&categoriaId=&buscar= | Autenticado |
| Equipos | GET | /equipos/:id | Autenticado |
| Equipos | POST | /equipos | ADMINISTRADOR, ENCARGADO_INVENTARIO |
| Equipos | PATCH | /equipos/:id | ADMINISTRADOR, ENCARGADO_INVENTARIO |
| Reservas | POST | /reservas | Autenticado |
| Reservas | GET | /reservas | ADMINISTRADOR, ENCARGADO_INVENTARIO |
| Reservas | GET | /reservas/mias | Autenticado |
| Reservas | GET | /reservas/:id | Autenticado |
| Reservas | PUT | /reservas/:id/aprobar | ADMINISTRADOR, ENCARGADO_INVENTARIO |
| Reservas | PUT | /reservas/:id/rechazar | ADMINISTRADOR, ENCARGADO_INVENTARIO |
| Reservas | PUT | /reservas/:id/cancelar | Autenticado (USUARIO solo las propias) |
| Préstamos | POST | /prestamos | ADMINISTRADOR, ENCARGADO_INVENTARIO |
| Préstamos | GET | /prestamos | ADMINISTRADOR, ENCARGADO_INVENTARIO |
| Préstamos | GET | /prestamos/mios | Autenticado |
| Préstamos | GET | /prestamos/:id | Autenticado |
| Préstamos | PUT | /prestamos/:id/devolver | ADMINISTRADOR, ENCARGADO_INVENTARIO |
| Incidencias | POST | /incidencias | Autenticado |
| Incidencias | GET | /incidencias | Autenticado |
| Incidencias | GET | /incidencias/:id | Autenticado |
| Incidencias | PUT | /incidencias/:id | Autenticado |
| Mantenimientos | POST | /mantenimientos | ADMINISTRADOR, TECNICO, ENCARGADO_INVENTARIO |
| Mantenimientos | GET | /mantenimientos | ídem |
| Mantenimientos | GET | /mantenimientos/:id | ídem |
| Mantenimientos | PUT | /mantenimientos/:id/iniciar | ídem |
| Mantenimientos | PUT | /mantenimientos/:id/finalizar | ídem |
| Reportes | GET | /reportes/resumen | Autenticado |
| Reportes | GET | /reportes/equipos-por-estado | Autenticado |
| Reportes | GET | /reportes/mantenimientos | Autenticado |
| Reportes | GET | /reportes/reservas | Autenticado |
| Reportes | GET | /reportes/prestamos-atrasados | ADMINISTRADOR, ENCARGADO_INVENTARIO |

## 3. Verificación de E1–E3 contra la API

Rutas, métodos, roles, estados y reglas de E1–E3 coinciden con la API. Puntos pendientes:

| Dónde | Incongruencia | Acción sugerida |
|---|---|---|
| E3 §2 Distribución de técnicas | Dice 9 / 8 / 7 / 6, pero el resumen de los 30 CP da Partición 10, Valor límite 9, Tabla de decisión 6, Transición 5. | Luis: corregir la tabla de distribución. |
| CP-15 | No incluye al rol TÉCNICO en la tabla de decisión, y el código le permite cancelar reservas ajenas. | Agregar “Actor E = TECNICO → 403” y enlazar el defecto H-02. |
| CP-25 | Pide validar en t = 7h59m59s y 8h00m01s: esperar 8 h no es práctico. | Ejecutar con JWT_EXPIRES_IN=10s en un entorno controlado; la automatización verifica exp − iat ≤ 8 h. |
| CP-10 | Los rangos B1–B5 requieren una reserva A fija de 10:00 a 12:00. | Ejecución manual o Postman con fechas fijas futuras; la colección cubre el rango idéntico. |
| RNF-07 | “Intervalo de monitoreo definido para la fase” no está definido. | Definirlo (p. ej. la corrida de k6 de CP-30, 5,5 min) para que sea verificable. |
| E4 Matriz | Aún no existe; E3 deja “Resultado de ejecución” como pendiente. | Usar la tabla de trazabilidad CP → automatización y los reportes de Newman/Jest. |

## 4. Framework de pruebas

| Capa | Herramienta | Ubicación | Comando |
|---|---|---|---|
| Unitarias backend | Jest + ts-jest (Prisma simulado) | backend/src/**/*.spec.ts | `npm test` · `npm run test:cov` |
| Componentes frontend | Vitest + Testing Library + jsdom | frontend/src/**/*.spec.tsx | `npm test` |
| API / integración | Postman + Newman | postman/ | `newman run …` |
| Carga y concurrencia | k6 | k6/ | `k6 run …` |
| Análisis estático | SonarQube | sonar-project.properties | `npx @sonar/scan …` |
| Integración continua | GitHub Actions | .github/workflows/ci.yml | automático en cada PR |

## 5. Trazabilidad CP → automatización

| CP | Requerimiento | Técnica | Automatización |
|---|---|---|---|
| CP-01 | RF-01 | Partición | Newman 00 (5 logins) · Jest auth · Vitest Login |
| CP-02 | RF-01 | Partición | Newman 01 · Jest auth · Vitest Login |
| CP-03 | RF-01 | Valor límite | Newman 01 (casos A y B) |
| CP-04 | RF-02, RNF-02 | Tabla de decisión | Newman 02 (4 roles) · Jest roles.guard |
| CP-05 | RF-04 | Partición | Newman 02 |
| CP-06 | RF-04 | Partición | Newman 02 (casos A y B) · Jest equipos |
| CP-07 | RF-03 | Partición | Newman 02 (estado, categoría, texto) · Jest equipos |
| CP-08 | RF-05 | Partición | Newman 03 · Jest reservas |
| CP-09 | RF-05 | Valor límite | Newman 03 (A y B) · Jest reservas (A, B y C) |
| CP-10 | RF-05 | Tabla de decisión | Newman 03 (rango idéntico) · Jest reservas · k6 concurrencia (complemento). Rangos B1–B5: manual |
| CP-11 | RF-05 | Tabla de decisión | Newman 07 (MANTENIMIENTO) · Jest reservas (4 estados no disponibles) |
| CP-12 | RF-06, RF-13 | Transición | Newman 03 · Jest reservas |
| CP-13 | RF-06 | Transición | Newman 03 · Jest reservas |
| CP-14 | RF-07, RF-13 | Transición | Newman 05 · Jest reservas |
| CP-15 | RF-02, RF-07 | Tabla de decisión | Newman 05 (otro usuario y propietario) · Jest reservas (usuario, admin, encargado) |
| CP-16 | RF-08, RF-09, RF-13 | Partición | Newman 04 · Jest préstamos |
| CP-17 | RF-08 | Valor límite | Newman 04 (caso B) · Jest préstamos (A y B) |
| CP-18 | RF-08 | Tabla de decisión | Newman 04 (ACTIVO) · Jest préstamos |
| CP-19 | RF-10 | Valor límite | Newman 04 (caso C) · Jest préstamos (A, B y C) |
| CP-20 | RF-10, RF-13 | Tabla de decisión | Newman 04 (BUENO) · Jest préstamos (3 condiciones) |
| CP-21 | RF-11, RF-13 | Transición | Newman 07 · Jest incidencias |
| CP-22 | RF-12, RF-13 | Transición | Newman 06 · Jest mantenimientos |
| CP-23 | RF-14 | Partición | Newman 08 (4 reportes + restricción de rol) |
| CP-24 | RNF-02 | Partición | Newman 01 (A, B y C) |
| CP-25 | RNF-03 | Valor límite | Newman 01 (vigencia ≤ 8 h en el token). Expiración real: manual con JWT_EXPIRES_IN corto |
| CP-26 | RNF-04 | Partición | Manual (Chrome, Edge, Firefox) |
| CP-27 | RNF-04 | Valor límite | Manual (DevTools 375×667 y 1366×768) |
| CP-28 | RNF-05 | Valor límite | Manual cronometrado (docker compose up) |
| CP-29 | RNF-06 | Valor límite | Jest con cobertura + SonarQube |
| CP-30 | RNF-01, RNF-07 | Valor límite | k6 carga-siget.js contra cloud |

## 6. Cómo ejecutar

```bash
# Levantar SIGET
cp .env.example .env
docker compose up -d --build

# Unitarias backend
cd backend && npm install && npx prisma generate && npm test && npm run test:cov

# Frontend
cd frontend && npm install && npm test && npx vitest run --coverage

# API (desde la raíz)
newman run postman/SIGET.postman_collection.json -e postman/SIGET.local.postman_environment.json --env-var "password=<contraseña>" -r cli,htmlextra --reporter-htmlextra-export reports/newman/siget-local.html

# CP-30 (RNF-01 y RNF-07) contra la nube
k6 run -e BASE_URL=<url-backend> -e PASSWORD=<contraseña> --summary-export reports/k6/cp30.json k6/carga-siget.js

# Concurrencia de reservas (RF-05)
k6 run -e BASE_URL=http://localhost:3000 -e PASSWORD=<contraseña> -e EQUIPO_ID=<uuid disponible> k6/concurrencia-reservas.js

# SonarQube (el token nunca se sube al repositorio)
npx @sonar/scan -Dsonar.host.url=http://localhost:9000 -Dsonar.token=<token>
```
