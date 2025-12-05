# 🔄 Workflow de Desarrollo Diario

Guía completa del flujo de trabajo diario con CI/CD integrado.

## 📖 Tabla de Contenidos

- [Crear una Feature](#crear-una-feature)
- [Trabajar en una Feature](#trabajar-en-una-feature)
- [Crear Pull Request](#crear-pull-request)
- [Revisar Checks del CI](#revisar-checks-del-ci)
- [Responder a Feedback](#responder-a-feedback)
- [Mergear la PR](#mergear-la-pr)
- [Tips y Best Practices](#tips-y-best-practices)

## 🚀 Crear una Feature

### 1. Sincronizar con Main

```bash
# Asegurarte de tener la última versión
git checkout main
git pull origin main
```

### 2. Crear Rama

Usa un nombre descriptivo que siga la convención:

```bash
# Para features
git checkout -b feature/nombre-descriptivo

# Para bug fixes
git checkout -b fix/descripcion-del-bug

# Para refactoring
git checkout -b refactor/area-a-refactorizar

# Para hotfixes
git checkout -b hotfix/descripcion
```

**Ejemplos buenos**:
- `feature/add-payment-integration`
- `fix/null-pointer-in-order-creation`
- `refactor/extract-validation-logic`

**Ejemplos malos**:
- `feature/new-stuff` (poco descriptivo)
- `fix-bug` (¿qué bug?)
- `juan-changes` (nombre de persona)

## 💻 Trabajar en una Feature

### 1. Hacer Cambios

Desarrolla normalmente, siguiendo las capas de Clean Architecture:

```bash
# Domain: Lógica de negocio pura
src/domain/

# Application: Casos de uso
src/application/

# Infrastructure: Adaptadores
src/infrastructure/
```

### 2. Ejecutar Tests Localmente

**IMPORTANTE**: Siempre ejecuta tests antes de commitear.

```bash
# Tests unitarios (rápido ~1s)
npm run test:unit

# Tests E2E (requiere PostgreSQL ~10s)
npm run db:up
npm run test:e2e

# Todos los tests
npm test

# Type checking
npm run build
```

### 3. Commit frecuentemente

Usa [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Feature
git commit -m "feat: add payment validation to order"

# Bug fix
git commit -m "fix: handle null values in price calculation"

# Refactor
git commit -m "refactor: extract order validation to separate class"

# Tests
git commit -m "test: add edge cases for quantity validation"

# Docs
git commit -m "docs: update API documentation for orders endpoint"

# Chore
git commit -m "chore: update dependencies"
```

**Formato**:
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types comunes**:
- `feat`: Nueva funcionalidad
- `fix`: Corrección de bug
- `refactor`: Refactorización sin cambio de comportamiento
- `test`: Agregar o modificar tests
- `docs`: Documentación
- `chore`: Tareas de mantenimiento
- `perf`: Mejoras de performance
- `ci`: Cambios en CI/CD

## 📤 Crear Pull Request

### 1. Push de la Rama

```bash
# Primera vez
git push -u origin feature/mi-feature

# Siguientes veces
git push
```

### 2. Crear PR

#### Opción A: GitHub CLI (Recomendado)

```bash
gh pr create
```

El CLI te preguntará:
1. **Title**: Usa un título descriptivo
2. **Body**: Se abrirá un editor con el template

#### Opción B: GitHub Web UI

1. Ve a tu repositorio en GitHub
2. Verás un banner "Compare & pull request"
3. Click en el botón
4. Rellena el template

### 3. Rellenar el Template

El template incluye secciones importantes:

```markdown
## 📋 Descripción
[Describe qué hace esta PR]

## 🎯 Tipo de cambio
- [x] ✨ Nueva funcionalidad

## 🧪 Testing
- [x] Tests unitarios agregados
- [x] Tests ejecutados localmente

## ✅ Checklist
- [x] He realizado una auto-revisión
- [x] Todos los tests pasan
- [x] He actualizado la documentación

## 🔗 Issues relacionados
Closes #123
```

**Tips**:
- Sé específico en la descripción
- Incluye screenshots si afecta UI
- Menciona breaking changes claramente
- Linkea los issues relacionados

## 🔍 Revisar Checks del CI

### 1. Observar Workflows

Inmediatamente después de crear la PR, los workflows se ejecutan:

```bash
# Ver estado de checks
gh pr checks

# Ver en tiempo real
gh pr checks --watch

# Ver detalles de un check específico
gh run view <run-id> --log
```

### 2. Interpretar Resultados

Los checks aparecerán en este orden:

```
✓ lint (1-2 min)
✓ unit-tests (1-2 min)
✓ e2e-tests (2-3 min)
✓ all-tests (3-4 min)
✓ pr-size (<1 min)
✓ label (auto) (<1 min)
```

#### ✅ Todos Pasando

```
All checks have passed
✓ lint
✓ unit-tests
✓ e2e-tests
✓ all-tests
```

Tu PR está lista para review. El bot comentará:

> ✅ **Test Results**: All tests passed!

#### ❌ Algunos Fallando

```
Some checks failed
✗ unit-tests
✓ lint
✓ e2e-tests
```

El bot comentará:

> ❌ **Test Results**: Some tests failed. Please check the logs.

### 3. Debugging de Fallos

Si un check falla:

```bash
# Ver logs del run fallido
gh run view --log-failed

# Ver lista de runs
gh run list

# Ver detalles de un run específico
gh run view <run-id>
```

**Fallos comunes**:

1. **Tests fallando**
   ```bash
   # Ejecutar localmente
   npm run test:unit
   # Revisar el output
   ```

2. **Type errors**
   ```bash
   # Build localmente
   npm run build
   # Corregir errores de TypeScript
   ```

3. **E2E tests fallando**
   ```bash
   # Asegurar que PostgreSQL está corriendo
   npm run db:up
   npm run test:e2e
   ```

Ver más: [Debugging Guide](DEBUGGING.md)

## 💬 Responder a Feedback

### 1. Recibir Comments

Los reviewers pueden:
- Dejar comentarios generales
- Sugerir cambios específicos
- Aprobar la PR
- Solicitar cambios

### 2. Hacer Cambios

```bash
# Hacer los cambios solicitados
# ... editar archivos ...

# Commit
git add .
git commit -m "fix: address review comments"

# Push
git push
```

Los workflows se re-ejecutan automáticamente.

### 3. Responder a Comentarios

- **Resuelve** conversaciones cuando completes el cambio
- **Explica** tus decisiones si no estás de acuerdo
- **Pide aclaraciones** si algo no está claro

### 4. Actualizar con Main

Si main avanzó mientras trabajabas:

```bash
# Opción A: Rebase (preferido)
git fetch origin
git rebase origin/main

# Resolver conflictos si hay
# ... editar archivos ...
git add .
git rebase --continue

# Force push (solo en tu rama)
git push --force-with-lease

# Opción B: Merge
git merge origin/main
git push
```

## ✅ Mergear la PR

### Pre-requisitos para Merge

- ✅ Todos los checks pasando
- ✅ Al menos 1 aprobación
- ✅ Todas las conversaciones resueltas
- ✅ Rama actualizada con main

### Opciones de Merge

#### 1. Squash and Merge (Recomendado)

Combina todos los commits en uno solo:

```bash
gh pr merge --squash
```

**Cuándo usar**: Features completas, múltiples commits de WIP

#### 2. Rebase and Merge

Mantiene commits individuales:

```bash
gh pr merge --rebase
```

**Cuándo usar**: Commits bien organizados que cuentan una historia

#### 3. Merge Commit

Crea un commit de merge:

```bash
gh pr merge --merge
```

**Cuándo usar**: Raramente, para merges importantes

### Después del Merge

```bash
# Volver a main
git checkout main
git pull origin main

# Limpiar rama local
git branch -d feature/mi-feature

# La rama remota se elimina automáticamente si configuraste
# "Automatically delete head branches" en Settings
```

## 💡 Tips y Best Practices

### ✅ Do's

- **Commits pequeños y frecuentes**: Más fácil de revertir
- **Tests primero**: TDD cuando sea posible
- **Auto-review**: Revisa tu propio código antes de crear PR
- **Documentar**: Actualiza docs si cambia comportamiento
- **Conventional Commits**: Facilita generar changelogs
- **Rama actualizada**: Rebase frecuentemente con main

### ❌ Don'ts

- **PRs gigantes**: Difíciles de revisar
- **Commits sin sentido**: "WIP", "fixes", "more changes"
- **Push sin tests**: Siempre corre tests localmente
- **Force push en main**: NUNCA
- **Ignorar feedback**: Los reviewers están ayudando
- **Mergear sin aprobación**: Espera el review

### 📏 Tamaño de PRs

| Tamaño | Líneas | Tiempo de Review | Recomendación |
|--------|--------|------------------|---------------|
| XS | <50 | <10 min | ✅ Ideal |
| S | <200 | <30 min | ✅ Bueno |
| M | <500 | <1 hora | ⚠️ Aceptable |
| L | <1000 | <2 horas | ⚠️ Considerar dividir |
| XL | >1000 | >3 horas | ❌ Dividir obligatorio |

Si tu PR es L o XL, el bot te advertirá:

> ⚠️ This PR is quite large (1234 lines). Consider breaking it into smaller PRs.

### 🔄 Ciclo Típico

```
1. Crear rama feature/X
   ↓
2. Desarrollar + Tests locales
   ↓
3. Commit (múltiples)
   ↓
4. Push + Crear PR
   ↓
5. CI ejecuta checks
   ↓
6. ¿Checks pasan?
   ├─ No → Fix + Push (volver al paso 5)
   └─ Sí → Pedir review
       ↓
   7. ¿Aprobado?
      ├─ No → Cambios + Push (volver al paso 5)
      └─ Sí → Squash & Merge
          ↓
      8. Limpiar rama
```

## 📚 Referencias

- [Primera PR](FIRST_PR.md) - Tutorial completo de tu primera PR
- [Testing Guide](TESTING.md) - Cómo funcionan los tests
- [Debugging](DEBUGGING.md) - Solucionar problemas
- [Best Practices](../BEST_PRACTICES.md) - Mejores prácticas

## 🆘 ¿Preguntas?

- **Checks fallando**: [Test Failures](../troubleshooting/TEST_FAILURES.md)
- **Conflictos de merge**: [Common Issues](../troubleshooting/COMMON_ISSUES.md)
- **Permisos**: [Permissions Guide](../troubleshooting/PERMISSIONS.md)

---

**Última actualización**: 2025-11-28
