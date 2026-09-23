# Arquitectura SIGET

## Contexto
SIGET centraliza el control de equipos tecnológicos para administradores, encargados de inventario, usuarios y técnicos. El navegador consume una API REST protegida con JWT. La API persiste datos en PostgreSQL mediante Prisma.

## Contenedores
1. **Frontend React/Vite**: interfaz SPA responsive.
2. **Backend NestJS**: API REST, reglas de negocio, autorización y Swagger.
3. **PostgreSQL**: persistencia relacional.

## Módulos críticos
- Autenticación y autorización.
- Reservas.
- Préstamos y devoluciones.
- Transiciones de estado de equipos.
- Mantenimiento.

## Modelo de datos principal
Usuario, Categoria, Equipo, Reserva, Prestamo, Devolucion, Incidencia, Mantenimiento e HistorialEstado.
