# Clean Orders - Microservicio de Gestión de Pedidos

[![CI](https://github.com/YOUR_USERNAME/clean-orders/workflows/CI/badge.svg)](https://github.com/YOUR_USERNAME/clean-orders/actions)
[![Tests](https://github.com/YOUR_USERNAME/clean-orders/workflows/PR%20Checks/badge.svg)](https://github.com/YOUR_USERNAME/clean-orders/actions)
[![License](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)

Microservicio de gestión de pedidos implementado con **Clean Architecture**, **Domain-Driven Design** y **Transactional Outbox Pattern**.

## 🎯 Características

- ✅ **Clean Architecture** con separación de capas (Domain, Application, Infrastructure)
- ✅ **Domain-Driven Design** con Value Objects, Entities y Domain Events
- ✅ **Transactional Outbox Pattern** para garantizar consistencia eventual
- ✅ **PostgreSQL** con repositorios y migraciones
- ✅ **Testing exhaustivo** (192 tests: Unit, Acceptance, E2E)
- ✅ **CI/CD con GitHub Actions** (tests, linting, releases automáticos)
- ✅ **Type-safe** con TypeScript estricto
- ✅ **Event-Driven** con event bus y dispatcher

## 📋 Tabla de Contenidos

- [Arquitectura](#arquitectura)
- [Instalación](#instalación)
- [Scripts Disponibles](#scripts-disponibles)
- [Testing](#testing)
- [Base de Datos](#base-de-datos)
- [CI/CD](#cicd)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Tecnologías](#tecnologías)

## 🏗️ Arquitectura

### Capas

- **Domain** (Núcleo del negocio)
  - Entities: `Order`
  - Value Objects: `OrderId`, `ProductId`, `Quantity`, `Money`, `Currency`, `OrderItem`
  - Domain Events: `OrderCreated`, `ItemAdded`

- **Application** (Casos de uso)
  - Use Cases: `CreateOrderUseCase`, `AddItemToOrderUseCase`
  - Ports: `OrderRepository`, `PricingService`, `EventBus`, `Logger`, `Clock`
  - DTOs: Plain objects para entrada/salida
  - Errors: Typed errors con discriminated unions

- **Infrastructure** (Adaptadores)
  - Persistence: `PostgresOrderRepository`, `InMemoryOrderRepository`
  - Messaging: `OutboxEventBus`, `OutboxDispatcher`, `NoopEventBus`
  - HTTP: `StaticPricingService`
  - Logging: `PinoLogger`
  - Database: Connection pooling, migrations

- **Composition** (Dependency Injection)
  - Container con Singleton pattern
  - Configuration con Zod validation
  - Environment-based setup

### Patrones Implementados

- **Repository Pattern**: Abstracción de persistencia
- **Dependency Injection**: Container pattern
- **Result Pattern**: Manejo funcional de errores
- **Builder Pattern**: Test data generation
- **Transactional Outbox**: Consistencia eventual
- **Event Sourcing**: Domain events
- **CQRS**: Separación read/write (parcial)

## 🚀 Instalación

### Requisitos

- Node.js 20+
- Docker (para PostgreSQL)
- npm o pnpm

### Setup

```bash
# Clonar repositorio
git clone https://github.com/YOUR_USERNAME/clean-orders.git
cd clean-orders

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus configuraciones

# Iniciar base de datos
npm run db:up

# Ejecutar migraciones
npm run db:migrate

# Iniciar aplicación
npm run dev
```

## 📜 Scripts Disponibles

### Desarrollo

```bash
npm run dev              # Servidor con PostgreSQL
npm run dev:inmemory     # Servidor con repositorio in-memory
npm run build            # Compilar TypeScript
npm start                # Ejecutar versión compilada
```

### Base de Datos

```bash
npm run db:up            # Iniciar PostgreSQL con Docker
npm run db:down          # Detener PostgreSQL
npm run db:migrate       # Ejecutar migraciones
```

### Workers

```bash
npm run worker:outbox    # Dispatcher de eventos outbox
```

### Testing

```bash
npm test                 # Todos los tests
npm run test:unit        # Tests de dominio + aceptación
npm run test:e2e         # Tests E2E con PostgreSQL
npm run test:watch       # Tests en modo watch
```

## 🧪 Testing

### Suite Completa (192 tests)

#### Tests de Dominio (148 tests)
- Value Objects con validación exhaustiva
- Entities con reglas de negocio
- Builders para generación de test data

```bash
npm run test:unit
```

#### Tests de Aceptación (44 tests)
- DTOs planos como entrada/salida
- Errores tipados específicos
- Test Doubles (Spy, Stub, Fake) - NO mocks

#### Tests E2E (28 tests)
- PostgreSQL real
- Outbox pattern end-to-end
- Verificación de FOR UPDATE SKIP LOCKED
- Integración completa

```bash
# Requiere PostgreSQL corriendo
npm run db:up
npm run test:e2e
```

### Cobertura

- Domain: 100%
- Application: >90%
- Infrastructure: Integración verificada

## 🗄️ Base de Datos

### PostgreSQL Setup

```bash
# Iniciar contenedor
docker compose up -d postgres

# Verificar health
docker ps

# Ejecutar migraciones
npm run db:migrate

# Conectar a la base de datos
docker exec -it clean-orders-db psql -U orders_user -d orders_db
```

### Migraciones

Las migraciones están en `db/migrations/`:

- `001_init_clean.sql` - Schema inicial (orders, order_items, outbox)

### Outbox Table

El patrón Transactional Outbox garantiza que los eventos se publiquen:

```sql
SELECT * FROM outbox WHERE published_at IS NULL;
```

Dispatcher procesa eventos con `FOR UPDATE SKIP LOCKED` para concurrencia segura.

## 🔄 CI/CD

### GitHub Actions Workflows

Todos los workflows están en [.github/workflows/](.github/workflows/):

- **CI** (`ci.yml`): Lint, tests unitarios, tests E2E, coverage
- **PR Checks** (`pr-checks.yml`): Validación completa en PRs
- **Auto Label** (`auto-label.yml`): Etiquetado automático por capa y tamaño
- **Dependency Review** (`dependency-review.yml`): Security audit
- **Release** (`release.yml`): Releases automáticos con changelog

### Configuración

Ver guías completas:
- [Setup Guide](.github/SETUP.md) - Configuración inicial
- [CI/CD Documentation](.github/CI_CD.md) - Documentación completa

### Badges

Reemplaza `YOUR_USERNAME` con tu usuario de GitHub:

```markdown
[![CI](https://github.com/YOUR_USERNAME/clean-orders/workflows/CI/badge.svg)](https://github.com/YOUR_USERNAME/clean-orders/actions)
```

## 📁 Estructura del Proyecto

```
clean-orders/
├── .github/
│   ├── workflows/           # GitHub Actions
│   ├── CI_CD.md            # Documentación CI/CD
│   ├── SETUP.md            # Guía de setup
│   ├── labels.json         # Definición de labels
│   └── PULL_REQUEST_TEMPLATE.md
├── db/
│   └── migrations/         # Migraciones SQL
├── scripts/
│   └── migrate.ts          # Script de migraciones
├── src/
│   ├── domain/
│   │   ├── entities/       # Order
│   │   ├── value-objects/  # OrderId, Money, etc.
│   │   └── events/         # Domain Events
│   ├── application/
│   │   ├── use-cases/      # CreateOrder, AddItemToOrder
│   │   ├── ports/          # Interfaces (Repository, etc.)
│   │   ├── errors/         # Typed errors
│   │   └── dto/            # DTOs
│   ├── infrastructure/
│   │   ├── persistence/    # Repositories
│   │   ├── messaging/      # Outbox, Dispatcher
│   │   ├── logging/        # Pino logger
│   │   └── http/           # Pricing service
│   ├── composition/
│   │   ├── container.ts    # DI Container
│   │   └── config.ts       # Configuration
│   ├── shared/
│   │   └── Results.ts      # Result pattern
│   └── main.ts             # Entry point
├── tests/
│   ├── domain/             # Unit tests
│   │   ├── builders/       # Test builders
│   │   ├── entities/       # Entity tests
│   │   └── value-objects/  # VO tests
│   ├── acceptance/         # Acceptance tests
│   │   └── doubles/        # Test doubles
│   └── e2e/                # E2E tests
│       └── helpers/        # E2E helpers
├── .env                    # Environment config
├── .env.test               # Test environment
├── docker-compose.yml      # PostgreSQL service
├── tsconfig.json           # TypeScript config
├── vitest.config.ts        # Vitest config
└── package.json
```

## 🛠️ Tecnologías

### Core

- **TypeScript 5.6** - Lenguaje principal
- **Node.js 20** - Runtime
- **Fastify 5** - HTTP framework
- **PostgreSQL 16** - Base de datos
- **Vitest 2** - Testing framework

### Infrastructure

- **pg** - PostgreSQL driver
- **pino** - Logging
- **zod** - Schema validation
- **dotenv** - Environment variables

### DevOps

- **Docker** - Containerización
- **GitHub Actions** - CI/CD
- **tsx** - TypeScript execution

## 🔗 Alias de Importación

Configurados en `tsconfig.json`:

```typescript
import { Order } from '@domain/entities/Order';
import { CreateOrderUseCase } from '@application/use-cases/CreateOrderUseCase';
import { PostgresOrderRepository } from '@infrastructure/persistence/postgres/PostgresOrderRepository';
import { Container } from '@composition/container';
import { Result } from '@shared/Results';
```

## 📝 API Endpoints

```bash
# Crear pedido
POST /orders
Body: { orderId?: string }

# Agregar item
POST /orders/:id/items
Body: { productId: string, quantity: number }
```

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una branch (`git checkout -b feature/amazing-feature`)
3. Commit tus cambios (`git commit -m 'feat: add amazing feature'`)
4. Push a la branch (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

El template de PR te guiará con el formato correcto.

## 📄 Licencia

ISC

## 👥 Autor

Tu nombre - [@your_twitter](https://twitter.com/your_twitter)

## 📚 Recursos

- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [Transactional Outbox Pattern](https://microservices.io/patterns/data/transactional-outbox.html)
- [Test Doubles](https://martinfowler.com/bliki/TestDouble.html)

---

⭐ Si este proyecto te fue útil, dale una estrella!
