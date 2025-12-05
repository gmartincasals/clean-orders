# 🚀 Setup GitHub Actions CI/CD

Guía rápida para configurar el CI/CD en tu repositorio.

## ✅ Checklist de Configuración

### 1. Verificar Workflows

Asegúrate de que estos archivos existan en `.github/workflows/`:

- [x] `ci.yml` - Pipeline principal de CI
- [x] `pr-checks.yml` - Checks automáticos en PRs
- [x] `auto-label.yml` - Auto-etiquetado de PRs
- [x] `dependency-review.yml` - Revisión de dependencias
- [x] `release.yml` - Automatización de releases

### 2. Configurar Labels

Opción A: Usando GitHub CLI (`gh`):

```bash
# Instalar gh CLI si no lo tienes
# macOS: brew install gh
# Linux: https://github.com/cli/cli#installation

# Autenticarse
gh auth login

# Crear labels desde el archivo JSON
cat .github/labels.json | jq -r '.[] | [.name, .color, .description] | @tsv' | \
  while IFS=$'\t' read -r name color description; do
    gh label create "$name" --color "$color" --description "$description" 2>/dev/null || \
    gh label edit "$name" --color "$color" --description "$description"
  done
```

Opción B: Manualmente en GitHub:

1. Ve a `Settings` → `Labels` en tu repositorio
2. Crea cada label del archivo `.github/labels.json`

### 3. Configurar Branch Protection Rules

Ve a `Settings` → `Branches` → `Add rule`:

**Para `main`:**

```
✅ Require a pull request before merging
✅ Require approvals: 1
✅ Dismiss stale pull request approvals when new commits are pushed
✅ Require status checks to pass before merging
  - lint
  - unit-tests
  - e2e-tests
✅ Require branches to be up to date before merging
✅ Do not allow bypassing the above settings
```

**Para `develop`:**

```
✅ Require a pull request before merging
✅ Require status checks to pass before merging
  - lint
  - unit-tests
```

### 4. Configurar Secrets (Opcional)

Solo si quieres features adicionales:

#### Para Codecov (cobertura de tests):

```bash
# 1. Crear cuenta en https://codecov.io
# 2. Agregar tu repositorio
# 3. Copiar el token
# 4. Agregar secret en GitHub

gh secret set CODECOV_TOKEN
# Pega el token cuando te lo pida
```

#### Para notificaciones Slack:

```bash
# 1. Crear webhook en Slack
# 2. Agregar secret

gh secret set SLACK_WEBHOOK_URL
```

### 5. Habilitar GitHub Actions

1. Ve a `Settings` → `Actions` → `General`
2. En "Actions permissions":
   - ✅ Allow all actions and reusable workflows
3. En "Workflow permissions":
   - ✅ Read and write permissions
   - ✅ Allow GitHub Actions to create and approve pull requests

### 6. Test del Pipeline

#### Test Local (antes de push):

```bash
# 1. Asegurar que PostgreSQL esté corriendo
npm run db:up

# 2. Ejecutar migraciones
npm run db:migrate

# 3. Ejecutar todos los tests
npm run test:unit
npm run test:e2e

# 4. Build
npm run build
```

#### Test en GitHub:

```bash
# 1. Crear una rama de prueba
git checkout -b test/ci-setup

# 2. Hacer un cambio menor
echo "# CI/CD Setup Test" >> TEST.md
git add TEST.md
git commit -m "test: CI/CD setup"

# 3. Push y crear PR
git push origin test/ci-setup
gh pr create --title "Test: CI/CD Setup" --body "Testing GitHub Actions workflows"

# 4. Observar los checks en la PR
gh pr checks

# 5. Ver logs si algo falla
gh run view --log-failed
```

## 🔍 Verificación Post-Setup

### Checklist de Verificación

- [ ] Los workflows aparecen en la pestaña "Actions"
- [ ] Una PR de prueba activa todos los checks
- [ ] Los labels se crean automáticamente en PRs
- [ ] Los tests E2E pasan en CI
- [ ] Los comentarios automáticos funcionan
- [ ] Branch protection rules bloquean merges sin checks

### Comandos de Verificación

```bash
# Ver workflows disponibles
gh workflow list

# Ver últimas ejecuciones
gh run list --limit 5

# Ver detalles de una ejecución
gh run view <run-id>

# Ver labels del repositorio
gh label list

# Ver branch protection rules
gh api repos/:owner/:repo/branches/main/protection
```

## 🐛 Troubleshooting Común

### Error: "Resource not accessible by integration"

**Problema**: El workflow no tiene permisos suficientes.

**Solución**:
1. Ve a `Settings` → `Actions` → `General`
2. En "Workflow permissions" marca "Read and write permissions"

### Error: "PostgreSQL service unhealthy"

**Problema**: El servicio PostgreSQL no inicia correctamente en CI.

**Solución**: El workflow ya incluye health checks. Si persiste:
- Verifica la imagen: `postgres:16-alpine`
- Revisa las variables de entorno en el workflow

### Los labels no se crean automáticamente

**Problema**: El workflow de auto-label no funciona.

**Solución**:
1. Verifica que los labels existan en el repositorio
2. Revisa los permisos: `pull-requests: write`
3. Chequea los logs: `gh run view --log`

### Tests pasan localmente pero fallan en CI

**Problema**: Diferencias de entorno.

**Solución**:
```bash
# Reproducir exactamente el ambiente de CI
docker run -it \
  -v $(pwd):/app \
  -w /app \
  node:20-alpine \
  sh -c "npm ci && npm run test:unit"
```

## 📚 Siguientes Pasos

### Optimizaciones Recomendadas

1. **Cache de Dependencias**
   - Ya configurado con `cache: 'npm'` en workflows

2. **Paralelización de Tests**
   - Considerar split de tests E2E si crecen mucho

3. **Environments**
   - Crear environments de staging/production en GitHub

4. **Deploy Automático**
   - Configurar deploy a producción en merge a `main`

### Features Adicionales

#### ESLint y Prettier

```bash
npm install -D eslint prettier
npm install -D @typescript-eslint/parser @typescript-eslint/eslint-plugin

# Descomentar job de code-quality en pr-checks.yml
```

#### Conventional Commits

```bash
npm install -D @commitlint/cli @commitlint/config-conventional

# Agregar workflow para validar mensajes de commit
```

#### Dependabot

Crear `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
```

## 🎯 Testing del CI/CD Completo

```bash
# Script completo de test
#!/bin/bash
set -e

echo "🧪 Testing CI/CD Pipeline..."

# 1. Test local
echo "1️⃣ Running local tests..."
npm run db:up
sleep 5
npm run db:migrate
npm run test:unit
npm run test:e2e
npm run build

# 2. Create test PR
echo "2️⃣ Creating test PR..."
git checkout -b test/ci-$(date +%s)
echo "# CI Test $(date)" >> .ci-test
git add .ci-test
git commit -m "test: CI pipeline validation"
git push origin HEAD

# 3. Open PR
PR_URL=$(gh pr create \
  --title "Test: CI Pipeline" \
  --body "Automated CI/CD test" \
  --label "ci/cd,tests")

echo "3️⃣ PR created: $PR_URL"

# 4. Wait for checks
echo "4️⃣ Waiting for checks..."
gh pr checks --watch

# 5. Cleanup
echo "5️⃣ Closing test PR..."
gh pr close --delete-branch

echo "✅ CI/CD test completed!"
```

## ✅ Completado

Una vez que todo funcione:

1. Elimina la rama de prueba
2. Actualiza el README con badges de CI
3. Documenta cualquier configuración custom
4. Notifica al equipo sobre el nuevo proceso

---

**¿Problemas?** Abre una issue o consulta [CI_CD.md](./CI_CD.md) para más detalles.
