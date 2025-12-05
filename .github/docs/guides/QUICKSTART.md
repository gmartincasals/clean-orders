# 🚀 Guía de Setup Rápido - 10 Minutos

Esta guía te llevará desde cero hasta tener el CI/CD completamente funcional.

## ✅ Pre-requisitos

- [ ] GitHub repository creado
- [ ] Acceso de administrador al repositorio
- [ ] [GitHub CLI](https://cli.github.com/) instalado (opcional pero recomendado)
- [ ] Node.js 20+ instalado localmente

## 📋 Paso 1: Habilitar GitHub Actions (1 min)

### Opción A: Via Web UI

1. Ve a tu repositorio en GitHub
2. Click en **Settings** (⚙️)
3. En el menú lateral, click en **Actions** → **General**
4. En "Actions permissions":
   - ✅ Selecciona **"Allow all actions and reusable workflows"**
5. En "Workflow permissions":
   - ✅ Selecciona **"Read and write permissions"**
   - ✅ Marca **"Allow GitHub Actions to create and approve pull requests"**
6. Click **Save**

### Opción B: Via GitHub CLI

```bash
gh api repos/:owner/:repo/actions/permissions \
  -X PUT \
  -f enabled=true \
  -f allowed_actions=all

gh api repos/:owner/:repo/actions/permissions/workflow \
  -X PUT \
  -f default_workflow_permissions=write \
  -f can_approve_pull_request_reviews=true
```

## 🏷️ Paso 2: Crear Labels (2 min)

Los workflows usan labels para organizar PRs automáticamente.

### Opción A: Script Automático (Recomendado)

```bash
# Desde la raíz del proyecto
cd .github

# Crear todos los labels de una vez
cat labels.json | jq -r '.[] | [.name, .color, .description] | @tsv' | \
  while IFS=$'\t' read -r name color description; do
    echo "Creating label: $name"
    gh label create "$name" \
      --color "$color" \
      --description "$description" \
      2>/dev/null || echo "  → Label already exists, skipping"
  done

echo "✅ Labels created successfully!"
```

### Opción B: Manual (si no tienes jq)

```bash
# Labels esenciales (crea estos manualmente en GitHub)
gh label create "domain" --color "0052CC" --description "Changes to domain layer"
gh label create "application" --color "5319E7" --description "Changes to application layer"
gh label create "infrastructure" --color "D93F0B" --description "Changes to infrastructure layer"
gh label create "tests" --color "0E8A16" --description "Changes to tests"
gh label create "size/S" --color "BFFF00" --description "Small PR (< 200 lines)"
gh label create "size/M" --color "FFFF00" --description "Medium PR (< 500 lines)"
gh label create "size/L" --color "FF8C00" --description "Large PR (< 1000 lines)"
```

### Verificar Labels

```bash
gh label list
```

Deberías ver al menos 17 labels creados.

## 🛡️ Paso 3: Configurar Branch Protection (3 min)

Protege tu rama `main` para que solo se pueda mergear con checks pasando.

### Via Web UI

1. Ve a **Settings** → **Branches**
2. Click **Add branch protection rule**
3. En "Branch name pattern": escribe `main`
4. Configura las siguientes opciones:

#### Protección Básica
- ✅ **Require a pull request before merging**
  - ✅ Require approvals: `1`
  - ✅ Dismiss stale pull request approvals when new commits are pushed
  - ✅ Require review from Code Owners (opcional)

#### Status Checks
- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - En "Status checks that are required", busca y agrega:
    - `lint`
    - `unit-tests`
    - `e2e-tests`

#### Reglas Adicionales
- ✅ **Require conversation resolution before merging**
- ✅ **Do not allow bypassing the above settings**
- ⚠️ Desmarca **"Allow force pushes"**
- ⚠️ Desmarca **"Allow deletions"**

5. Click **Create** o **Save changes**

### Via GitHub CLI

```bash
# Crear regla de protección para main
gh api repos/:owner/:repo/branches/main/protection \
  -X PUT \
  -f required_status_checks[strict]=true \
  -f required_status_checks[contexts][]=lint \
  -f required_status_checks[contexts][]=unit-tests \
  -f required_status_checks[contexts][]=e2e-tests \
  -f required_pull_request_reviews[required_approving_review_count]=1 \
  -f required_pull_request_reviews[dismiss_stale_reviews]=true \
  -f enforce_admins=true \
  -f required_conversation_resolution=true

echo "✅ Branch protection configured for main"
```

## 🧪 Paso 4: Probar el Pipeline (4 min)

Vamos a crear una PR de prueba para verificar que todo funcione.

### 1. Crear rama de prueba

```bash
# Asegúrate de estar en la rama main
git checkout main
git pull origin main

# Crear rama de prueba
git checkout -b test/ci-setup
```

### 2. Hacer un cambio pequeño

```bash
# Crear un archivo de prueba
echo "# CI/CD Setup Test" > .github/CI_TEST.md
echo "" >> .github/CI_TEST.md
echo "This file tests the CI/CD pipeline." >> .github/CI_TEST.md
echo "Date: $(date)" >> .github/CI_TEST.md

# Commit
git add .github/CI_TEST.md
git commit -m "test: verify CI/CD pipeline setup"
```

### 3. Push y crear PR

```bash
# Push de la rama
git push origin test/ci-setup

# Crear PR con GitHub CLI
gh pr create \
  --title "Test: CI/CD Pipeline Setup" \
  --body "Testing the complete CI/CD pipeline configuration.

This PR verifies:
- ✅ Workflows are triggered
- ✅ Auto-labeling works
- ✅ Tests run successfully
- ✅ Comments are posted

Once verified, this PR can be closed without merging." \
  --label "ci/cd,tests"
```

### 4. Observar los Workflows

```bash
# Ver el progreso en tiempo real
gh pr checks --watch

# Esto mostrará algo como:
# All checks have passed
# ✓ lint
# ✓ unit-tests
# ✓ e2e-tests
# ✓ all-tests
# ✓ pr-size
```

### 5. Verificar Resultados

En GitHub, deberías ver:

1. **Auto-labels aplicados**: `ci/cd`, `tests`, `size/XS`
2. **Checks corriendo**: lint, unit-tests, e2e-tests
3. **Comentario automático** con resultados
4. **Status checks** al final de la PR

### 6. Limpiar

```bash
# Cerrar la PR de prueba sin mergear
gh pr close test/ci-setup --delete-branch

# O si quieres mantenerla abierta para referencia:
# No hagas nada, déjala como documentación
```

## ✅ Verificación Final

Ejecuta este checklist para confirmar que todo está configurado:

```bash
# Checklist automático
echo "🔍 Verificando configuración del CI/CD..."
echo ""

# 1. Verificar workflows
echo "1. Workflows disponibles:"
gh workflow list | head -5
echo ""

# 2. Verificar labels
LABEL_COUNT=$(gh label list --limit 100 | wc -l)
echo "2. Labels creados: $LABEL_COUNT/17"
echo ""

# 3. Verificar branch protection
echo "3. Branch protection en main:"
gh api repos/:owner/:repo/branches/main/protection --jq '.required_status_checks.contexts | .[]' 2>/dev/null || echo "   ⚠️  No configurado"
echo ""

# 4. Verificar última ejecución
echo "4. Última ejecución de workflow:"
gh run list --limit 1
echo ""

echo "✅ Verificación completada!"
```

### Resultados Esperados

- ✅ 5 workflows listados (ci, pr-checks, auto-label, dependency-review, release)
- ✅ 17 labels creados
- ✅ Branch protection con checks requeridos
- ✅ Al menos 1 workflow ejecutado

## 🎉 ¡Listo!

Tu CI/CD está completamente configurado. Ahora:

1. **Lee**: [Workflow de Desarrollo](DEVELOPMENT_WORKFLOW.md) para uso diario
2. **Explora**: [Workflows Detallados](../workflows/) para entender cada pipeline
3. **Personaliza**: [Configuración Avanzada](ADVANCED_CONFIG.md) para optimizar

## 🆘 ¿Problemas?

Si algo no funciona:

1. **Revisa**: [Problemas Comunes](../troubleshooting/COMMON_ISSUES.md)
2. **Debugging**: [Guía de Debugging](DEBUGGING.md)
3. **Ayuda**: Abre un [Issue](../../issues/new)

## 📚 Siguientes Pasos

- [ ] Leer [Workflow de Desarrollo](DEVELOPMENT_WORKFLOW.md)
- [ ] Configurar [Dependabot](ADVANCED_CONFIG.md#dependabot)
- [ ] Agregar [badges al README](../../../README.md#badges)
- [ ] Invitar al equipo y asignar roles

---

**Tiempo estimado**: 10 minutos
**Dificultad**: Fácil
**Última actualización**: 2025-11-28
