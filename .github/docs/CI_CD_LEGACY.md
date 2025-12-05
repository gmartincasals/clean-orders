# 🔄 CI/CD Pipeline Documentation

Este documento describe el pipeline de CI/CD configurado para Clean Orders usando GitHub Actions.

## 📋 Tabla de Contenidos

- [Workflows Disponibles](#workflows-disponibles)
- [Configuración Requerida](#configuración-requerida)
- [Ejecución de Tests](#ejecución-de-tests)
- [Process de PR](#proceso-de-pr)
- [Releases](#releases)

## 🔧 Workflows Disponibles

### 1. CI Workflow (`ci.yml`)

**Triggers:**
- Push a `main` o `develop`
- Pull requests a `main` o `develop`

**Jobs:**
- **Lint & Type Check**: Verifica tipos con TypeScript
- **Unit Tests**: Ejecuta tests de dominio y aceptación
- **E2E Tests**: Ejecuta tests E2E con PostgreSQL real
- **Coverage**: Genera reporte de cobertura de tests

**Servicios:**
- PostgreSQL 16 Alpine (para tests E2E)

### 2. PR Checks Workflow (`pr-checks.yml`)

**Triggers:**
- Apertura de PR
- Sincronización de PR (nuevos commits)

**Jobs:**
- **PR Info**: Muestra información de la PR
- **PR Size**: Calcula el tamaño de la PR y advierte si es muy grande
- **All Tests**: Ejecuta todos los tests (unit + E2E)
- **Code Quality**: Ejecuta linters (si está configurado)

**Features:**
- Comenta automáticamente en la PR con resultados
- Warning si la PR > 500 líneas

### 3. Auto Label Workflow (`auto-label.yml`)

**Triggers:**
- Apertura o sincronización de PR

**Labels Automáticos:**

**Por Capa:**
- `domain` - Cambios en src/domain/
- `application` - Cambios en src/application/
- `infrastructure` - Cambios en src/infrastructure/
- `tests` - Cambios en tests/
- `database` - Cambios en db/migrations/
- `documentation` - Cambios en archivos .md
- `ci/cd` - Cambios en .github/workflows/

**Por Tamaño:**
- `size/XS` - < 50 líneas
- `size/S` - < 200 líneas
- `size/M` - < 500 líneas
- `size/L` - < 1000 líneas
- `size/XL` - > 1000 líneas

### 4. Dependency Review (`dependency-review.yml`)

**Triggers:**
- PRs que modifican `package.json` o `package-lock.json`

**Jobs:**
- **Dependency Review**: Analiza nuevas dependencias
- **Security Audit**: Ejecuta `npm audit`

**Características:**
- Falla si hay vulnerabilidades moderadas o superiores
- Comenta en la PR con resultados del audit

### 5. Release Workflow (`release.yml`)

**Triggers:**
- Push de tags con formato `v*.*.*` (ej: v1.0.0)

**Jobs:**
- Build del proyecto
- Ejecución de todos los tests
- Generación de changelog automático
- Creación de GitHub Release
- Generación de artefactos (.tar.gz)

## ⚙️ Configuración Requerida

### Variables de Entorno

Los tests E2E requieren estas variables:

```bash
DATABASE_URL=postgresql://orders_user:orders_pass@localhost:5432/orders_db
USE_INMEMORY=false
NODE_ENV=test
LOG_LEVEL=error
```

### Secrets de GitHub

No se requieren secrets adicionales para los workflows básicos.

Para features opcionales:
- `CODECOV_TOKEN` - Para subir cobertura a Codecov
- `SLACK_WEBHOOK` - Para notificaciones a Slack

### Labels de GitHub

Crea los labels necesarios usando el archivo `.github/labels.json`:

```bash
# Opción 1: Usando gh CLI
gh label create domain --color "0052CC" --description "Changes to domain layer"

# Opción 2: Crear todos con script
cat .github/labels.json | jq -r '.[] | "\(.name)|\(.color)|\(.description)"' | \
  while IFS='|' read name color desc; do
    gh label create "$name" --color "$color" --description "$desc"
  done
```

## 🧪 Ejecución de Tests

### Localmente

```bash
# Tests unitarios (dominio + aceptación)
npm run test:unit

# Tests E2E (requiere PostgreSQL corriendo)
npm run test:e2e

# Todos los tests
npm test

# Tests con watch mode
npm run test:watch
```

### En CI

Los tests se ejecutan automáticamente en:
1. **Cada push** a `main` o `develop`
2. **Cada PR** a estas ramas
3. **Antes de crear un release**

### Configuración de PostgreSQL para E2E

Los tests E2E usan PostgreSQL real. En CI se configura como servicio:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    env:
      POSTGRES_USER: orders_user
      POSTGRES_PASSWORD: orders_pass
      POSTGRES_DB: orders_db
    ports:
      - 5432:5432
```

Localmente, usa Docker Compose:

```bash
npm run db:up      # Inicia PostgreSQL
npm run db:migrate # Ejecuta migraciones
npm run test:e2e   # Ejecuta tests E2E
npm run db:down    # Detiene PostgreSQL
```

## 📝 Proceso de PR

### 1. Crear PR

Al abrir una PR:
- Auto-labeling basado en archivos modificados
- Cálculo de tamaño de PR
- Template de PR se rellena automáticamente

### 2. Checks Automáticos

Se ejecutan:
- ✅ Type checking
- ✅ Unit tests
- ✅ E2E tests (con PostgreSQL)
- ✅ Dependency review (si se modificó package.json)
- ✅ Security audit

### 3. Comentarios Automáticos

GitHub Actions comenta en la PR con:
- Resultado de los tests
- Vulnerabilidades encontradas
- Warnings de tamaño

### 4. Merge

Requisitos para merge:
- ✅ Todos los checks pasando
- ✅ Al menos 1 aprobación (configurar en GitHub)
- ✅ Branch actualizada con base

## 🚀 Releases

### Crear un Release

```bash
# 1. Actualizar versión en package.json
npm version patch  # o minor, o major

# 2. Push del tag
git push origin main --tags

# 3. El workflow se ejecuta automáticamente
```

### Proceso Automático

1. **Build** del proyecto
2. **Tests** completos
3. **Changelog** generado desde commits
4. **GitHub Release** creado
5. **Artifacts** (.tar.gz) subidos

### Formato de Tag

- `v1.0.0` - Release de producción
- `v1.0.0-beta.1` - Pre-release (beta)
- `v1.0.0-rc.1` - Release candidate

## 📊 Métricas y Monitoreo

### Status Badges

Agrega estos badges a tu README:

```markdown
![CI](https://github.com/YOUR_USERNAME/clean-orders/workflows/CI/badge.svg)
![PR Checks](https://github.com/YOUR_USERNAME/clean-orders/workflows/PR%20Checks/badge.svg)
```

### Cobertura de Tests

Para activar reporte de cobertura:

1. Crear cuenta en [Codecov](https://codecov.io)
2. Agregar `CODECOV_TOKEN` a secrets
3. Activar job de coverage en `ci.yml`

## 🔧 Troubleshooting

### Tests E2E fallan en CI

**Problema**: Tests E2E pasan localmente pero fallan en CI.

**Solución**:
1. Verificar que el servicio PostgreSQL esté healthy
2. Verificar las variables de entorno
3. Revisar los logs del servicio PostgreSQL

### Dependency Review falla

**Problema**: El workflow falla en dependency review.

**Solución**:
1. Ejecutar `npm audit` localmente
2. Actualizar dependencias vulnerables
3. Si es un false positive, agregar a excepciones

### Auto-labeling no funciona

**Problema**: Los labels no se agregan automáticamente.

**Solución**:
1. Verificar que los labels existan en el repositorio
2. Verificar permisos del workflow (pull-requests: write)
3. Revisar los logs del workflow

## 📚 Referencias

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vitest Documentation](https://vitest.dev)
- [PostgreSQL in GitHub Actions](https://docs.github.com/en/actions/using-containerized-services/creating-postgresql-service-containers)

## 🤝 Contribuir

Para mejorar el CI/CD:

1. Crea una issue describiendo la mejora
2. Abre una PR con los cambios
3. Los workflows se probarán automáticamente
4. Solicita revisión

---

**Última actualización**: 2025-11-28
