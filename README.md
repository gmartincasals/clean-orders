# Microservicios de pedidos

Microservicio de gestión de pedidos implementado con **Clean Architecture** y **DDD** (Domain-Driven Design).

## Arquitectura

- **Dominio**: Order, Price, SKU, Quantity, eventos de dominio.
- **Application**: casos de uso CreateOrder, AddItemOrder, puertos y DTOs.
- **Infraestructura**: repositorio InMemory, pricing estático, event bus no-op.
- **HTTP**: endpoints mínimos con Fastify.
- **Composición**: container.ts como composition root.
- **Tests**: dominio + aceptación de casos de uso.

## Estructura del Proyecto

```
clean-orders/
├── src/
│   ├── domain/           # Entidades, Value Objects, Eventos de Dominio
│   ├── application/      # Casos de Uso, Puertos (interfaces), DTOs
│   ├── infrastructure/   # Adaptadores (Repositorios, APIs, Event Bus)
│   ├── composition/      # Dependency Injection Container
│   └── shared/           # Utilidades compartidas
├── tests/                # Tests de aceptación
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Comportamiento

- `POST /orders` crea un pedido.
- `POST /orders/:id/items` agrega una línea (SKU + qty) con precio actual.
- Devuelve el total del pedido.

## Instalación

```bash
npm install
```

## Scripts

```bash
npm run dev          # Ejecutar en modo desarrollo
npm run build        # Compilar TypeScript
npm start            # Ejecutar en producción
npm test             # Ejecutar tests
npm run test:watch   # Ejecutar tests en modo watch
```

## Tecnologías

- **Fastify**: Framework HTTP
- **TypeScript**: Lenguaje principal
- **Vitest**: Testing
- **Zod**: Validación de esquemas
- **TSX**: Ejecución de TypeScript en desarrollo

## Alias de importación

- `@` → `src/`
- `@domain` → `src/domain/`
- `@application` → `src/application/`
- `@infrastructure` → `src/infrastructure/`
- `@shared` → `src/shared/`
- `@composition` → `src/composition/`

```

```
