# SIGET — Sistema Integral de Gestión de Equipos Tecnológicos

Aplicación web empresarial para administrar equipos tecnológicos, usuarios, reservas, préstamos, devoluciones, incidencias y mantenimientos, con trazabilidad de cambios de estado.

## Arquitectura
- Frontend: React + Vite + TypeScript + React Router + Axios.
- Backend: Node.js + NestJS + TypeScript + API REST + JWT + DTO/class-validator.
- Base de datos: PostgreSQL + Prisma ORM.
- Infraestructura: Docker y Docker Compose.
- Pruebas: Jest, Vitest, Postman/Newman y k6.
- Calidad: SonarQube/SonarCloud.
- CI: GitHub Actions.

## Requisitos
- Docker Desktop / Docker Engine con Compose, o Node.js 20 + PostgreSQL 16.

## Ejecución con Docker
```bash
cp .env.example .env
docker compose up -d --build
```

Servicios:
- Frontend: http://localhost:8080
- Backend API: http://localhost:3000
- Swagger: http://localhost:3000/api/docs

Credenciales de desarrollo iniciales (cambie las variables `SEED_*_PASSWORD` antes de un despliegue público):
- admin@siget.local
- inventario@siget.local
- usuario@siget.local
- tecnico@siget.local

La contraseña por defecto solo para desarrollo es `Cambiar123!` cuando no se sobrescriben variables de entorno.

## Ejecución sin Docker
### Backend
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
npm run start:dev
```
### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Migraciones
```bash
cd backend
npx prisma migrate dev --name init
npx prisma db seed
```
Para producción use `npx prisma migrate deploy`.

## Pruebas
Backend:
```bash
cd backend
npm test
npm run test:cov
```
Frontend:
```bash
cd frontend
npm test
```

## Postman/Newman
Colección: `postman/SIGET.postman_collection.json`.
```bash
newman run postman/SIGET.postman_collection.json
```

## k6
```bash
k6 run -e BASE_URL=http://localhost:3000 -e USER=usuario@siget.local -e PASSWORD='Cambiar123!' k6/load-test.js
```

## SonarQube
Existe `sonar-project.properties` para analizar `backend/src` y `frontend/src`. Configure `sonar.host.url` y `sonar.token` por variables/CLI, nunca en el repositorio.

## Flujo funcional de demostración
1. Administrador inicia sesión y registra equipo.
2. Usuario consulta equipos disponibles y crea reserva.
3. Encargado aprueba la reserva y registra préstamo.
4. El equipo cambia a PRESTADO.
5. Encargado registra devolución y el equipo vuelve a DISPONIBLE.
6. Se registra incidencia.
7. Técnico crea/inicia mantenimiento; el equipo pasa a MANTENIMIENTO.
8. Técnico finaliza mantenimiento; el equipo vuelve a DISPONIBLE.
9. El historial de estado queda almacenado.

## Estrategia de ramas sugerida
- DEV: integración de trabajo.
- QA: validación.
- PROD o main: versión liberada.
Configure protección para impedir merge a QA/PROD cuando CI falle.

## Licencia
MIT.
