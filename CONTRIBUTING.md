# Política de ramas y control de cambios — SIGET

Este documento define cómo se integra y promueve el código de SIGET entre ambientes (entregable E9). Aplica a todos los integrantes del equipo.

## 1. Ramas y ambientes

| Rama | Propósito | Ambiente | Despliegue |
| --- | --- | --- | --- |
| `feature/*`, `fix/*`, `test/*`, `docs/*` | Trabajo de un integrante sobre un cambio concreto | Local | Ninguno |
| `DEV` | Integración del trabajo del equipo | Pipeline de Jenkins (base de datos temporal) | Ninguno |
| `QA` | Versión candidata para validación | Pipeline de Jenkins | Ninguno |
| `main` | Producción (PROD) | Render | Automático desde Jenkins, solo si todo el pipeline pasa |

Nadie hace `push` directo a `DEV`, `QA` ni `main`: todo cambio entra por Pull Request.

## 2. Flujo de promoción

```
feature/* ──PR──► DEV ──PR──► QA ──PR──► main ──Jenkins──► Render
```

| Paso | Desde → hacia | Condiciones para el merge |
| --- | --- | --- |
| Desarrollo | `feature/*` → `DEV` | 1 revisión aprobada de otro integrante; pipeline de Jenkins ejecutado |
| Pruebas | `DEV` → `QA` | Check de Jenkins en verde (obligatorio) y 1 revisión aprobada de un integrante distinto del autor |
| Producción | `QA` → `main` | Check de Jenkins en verde (obligatorio) y 1 revisión aprobada de un integrante distinto del autor |

Las ramas `QA` y `main` están protegidas en GitHub: exigen Pull Request, 1 aprobación y el check `continuous-integration/jenkins/pr-merge` en verde. Si el pipeline falla, el botón de merge queda bloqueado.

## 3. Pipeline (Jenkinsfile)

Cada push y cada Pull Request ejecutan, en este orden:

1. Compilación de backend y frontend.
2. Pruebas unitarias (Jest y Vitest) con cobertura.
3. Análisis estático con SonarQube y verificación del Quality Gate.
4. Pruebas de API con Newman (colección `postman/`). Las pruebas de la carpeta "09 Hallazgos" documentan defectos conocidos y no bloquean el pipeline; cualquier otra falla sí lo bloquea.
5. Despliegue a Render (solo en `main`).

Si una etapa falla, las siguientes no se ejecutan.

## 4. Nombres de ramas y commits

- Ramas: `feature/<descripcion-corta>`, `fix/<descripcion>`, `test/<descripcion>`, `docs/<descripcion>`, en minúsculas y con guiones. Siempre se crean desde `DEV` actualizada.
- Commits con prefijo de tipo: `feat:`, `fix:`, `test:`, `ci:`, `docs:`, `refactor:`. Ejemplo: `test(api): validacion de esquema JSON en 58 solicitudes`.

## 5. Pull Requests

Cada Pull Request debe incluir:

- Objetivo y lista de cambios.
- Criterios de aceptación en Gherkin (`Característica`, `Escenario`, `Dado`, `Cuando`, `Entonces`).
- Evidencias (capturas o resultados) cuando aplique.
- Un revisor del equipo distinto del autor.

## 6. Revisión efectiva

Una aprobación sin comentarios no cuenta como revisión. Quien revisa debe:

1. Leer la pestaña *Files changed* y comentar al menos una línea concreta (una duda, un riesgo o una mejora).
2. Marcar *Request changes* si algo debe corregirse, o *Approve* cuando el autor haya respondido o corregido.
3. Verificar que el check de Jenkins esté en verde antes de aprobar.

Las revisiones automáticas (por ejemplo, de herramientas de IA) son apoyo, pero no reemplazan la revisión de un integrante.

## 7. Correcciones urgentes

Si producción falla, se crea `fix/<descripcion>` desde `main`, se abre un Pull Request hacia `main` con las mismas condiciones (check verde y revisión) y, después del merge, se lleva el mismo cambio a `DEV` y `QA` para no perderlo. El mismo autor del fix es responsable de llevarlo a `DEV` y `QA`, mediante Pull Requests con las mismas condiciones, a más tardar el siguiente día hábil.

## 8. Secretos y archivos que no se suben

- No se suben `node_modules`, `.env`, reportes generados (`reports/`, `coverage/`), archivos temporales ni contraseñas.
- El archivo `.env` se crea localmente a partir de `.env.example`.
- Tokens, contraseñas y deploy hooks se guardan solo como credenciales de Jenkins (`github-pat`, `sonar-token`, `siget-seed-password`, `render-hook-backend`, `render-hook-frontend`).
