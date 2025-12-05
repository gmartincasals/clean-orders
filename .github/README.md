# 📚 Documentación de CI/CD

Bienvenido a la documentación completa del sistema de CI/CD de Clean Orders.

## 🗂️ Índice de Contenidos

### 🚀 Inicio Rápido
- **[Guía de Setup](docs/guides/QUICKSTART.md)** - Configuración inicial en 10 minutos
- **[Primera PR](docs/guides/FIRST_PR.md)** - Crea tu primera Pull Request con CI

### 📖 Guías Principales

#### Para Desarrolladores
- **[Workflow de Desarrollo](docs/guides/DEVELOPMENT_WORKFLOW.md)** - Flujo diario de trabajo
- **[Testing en CI](docs/guides/TESTING.md)** - Cómo funcionan los tests en CI
- **[Debugging Workflows](docs/guides/DEBUGGING.md)** - Solucionar problemas en CI

#### Para Mantenedores
- **[Configuración Avanzada](docs/guides/ADVANCED_CONFIG.md)** - Optimización y configuración
- **[Branch Protection](docs/guides/BRANCH_PROTECTION.md)** - Reglas de protección
- **[Labels & PR Templates](docs/guides/LABELS_AND_TEMPLATES.md)** - Organización de PRs

### 🔧 Workflows Detallados

Cada workflow tiene su propia documentación:

1. **[CI Workflow](docs/workflows/CI.md)** - Pipeline principal de integración continua
2. **[PR Checks](docs/workflows/PR_CHECKS.md)** - Validación automática de Pull Requests
3. **[Auto Label](docs/workflows/AUTO_LABEL.md)** - Sistema de etiquetado automático
4. **[Dependency Review](docs/workflows/DEPENDENCY_REVIEW.md)** - Seguridad y auditoría
5. **[Release](docs/workflows/RELEASE.md)** - Automatización de releases

### 🆘 Troubleshooting

- **[Problemas Comunes](docs/troubleshooting/COMMON_ISSUES.md)** - Soluciones rápidas
- **[Tests Fallando](docs/troubleshooting/TEST_FAILURES.md)** - Debugging de tests
- **[PostgreSQL Issues](docs/troubleshooting/POSTGRESQL.md)** - Problemas con la BD
- **[Permisos](docs/troubleshooting/PERMISSIONS.md)** - Errores de permisos

### 📊 Referencias

- **[Arquitectura del CI/CD](docs/ARCHITECTURE.md)** - Cómo está diseñado el sistema
- **[Métricas y Monitoreo](docs/METRICS.md)** - Rendimiento y estadísticas
- **[Best Practices](docs/BEST_PRACTICES.md)** - Buenas prácticas
- **[Glosario](docs/GLOSSARY.md)** - Términos y conceptos

## 🎯 Flujos de Trabajo Comunes

### Crear una Feature
```bash
# 1. Crear rama
git checkout -b feature/mi-feature

# 2. Hacer cambios y commit
git add .
git commit -m "feat: agregar mi feature"

# 3. Push y crear PR
git push origin feature/mi-feature
gh pr create

# 4. Los workflows se ejecutan automáticamente
# 5. Revisar resultados en GitHub
```

### Ver Estado de los Checks
```bash
# Ver checks de una PR
gh pr checks

# Ver checks en tiempo real
gh pr checks --watch

# Ver logs de un workflow fallido
gh run view --log-failed
```

### Crear un Release
```bash
# 1. Actualizar versión
npm version patch  # o minor, o major

# 2. Push del tag
git push origin main --tags

# 3. El workflow de release se ejecuta automáticamente
```

## 📈 Estado del Sistema

| Componente | Estado | Tests | Coverage |
|------------|--------|-------|----------|
| Domain | ✅ Estable | 148/148 | 100% |
| Application | ✅ Estable | 44/44 | >90% |
| E2E | ⚠️ En desarrollo | 28/28 | N/A |
| CI/CD | ✅ Activo | - | - |

## 🔗 Enlaces Rápidos

### Workflows en GitHub
- [Ver todos los workflows](../../actions)
- [Últimas ejecuciones](../../actions?query=is%3Ain_progress)
- [Workflows fallidos](../../actions?query=is%3Afailure)

### Archivos de Configuración
- [CI Workflow](../workflows/ci.yml)
- [PR Checks](../workflows/pr-checks.yml)
- [Labels](../labels.json)
- [PR Template](../PULL_REQUEST_TEMPLATE.md)

## 🤝 Contribuir a la Documentación

Si encuentras errores o quieres mejorar la documentación:

1. Edita el archivo correspondiente
2. Crea una PR con el label `documentation`
3. La documentación se revisa rápidamente

## 📞 Soporte

- **Issues**: [Reportar un problema](../../issues/new)
- **Discussions**: [Hacer una pregunta](../../discussions)
- **Wiki**: [Ver la wiki](../../wiki) (si está habilitada)

---

**Última actualización**: 2025-11-28
**Versión de documentación**: 1.0.0
