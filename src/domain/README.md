# Dominio de Pedidos (Orders)

Modelo de dominio rico implementado siguiendo los principios de Domain-Driven Design (DDD).

## Estructura

```
domain/
├── value-objects/      # Value Objects con invariantes
│   ├── Currency.ts     # Moneda ISO 4217
│   ├── Money.ts        # Dinero (cantidad + moneda)
│   ├── OrderId.ts      # Identificador de pedido
│   ├── ProductId.ts    # Identificador de producto
│   ├── Quantity.ts     # Cantidad de productos
│   └── OrderItem.ts    # Item del pedido
├── entities/           # Entidades y Aggregate Roots
│   └── Order.ts        # Pedido (Aggregate Root)
├── events/             # Eventos de dominio
│   ├── DomainEvent.ts
│   ├── OrderCreated.ts
│   ├── OrderItemAdded.ts
│   └── OrderItemQuantityIncreased.ts
└── examples/           # Ejemplos de uso
    └── order-usage.example.ts
```

## Value Objects

### Currency
Representa una moneda con código ISO 4217.

**Invariantes:**
- Código de moneda válido
- Debe estar en la lista de monedas soportadas

**Monedas soportadas:** USD, EUR, GBP, JPY, MXN, ARS, CLP

**Ejemplo:**
```typescript
const usd = Currency.USD();
const eur = Currency.create('EUR');
```

### Money
Representa una cantidad monetaria con su moneda.

**Invariantes:**
- El monto debe ser un número válido
- El monto no puede ser negativo
- Debe tener una moneda asociada

**Operaciones:**
- `add(other)`: Suma dos cantidades (misma moneda)
- `multiply(factor)`: Multiplica por un factor
- `hasSameCurrency(other)`: Verifica si tienen la misma moneda

**Ejemplo:**
```typescript
const usd = Currency.USD();
const price = Money.create(100, usd);
const total = price.multiply(2); // $200.00
```

### OrderId
Identificador único de un pedido.

**Invariantes:**
- No puede estar vacío

**Ejemplo:**
```typescript
const id = OrderId.generate(); // ORD-lx3k8p-abc123
const customId = OrderId.create('ORDER-001');
```

### ProductId
Identificador único de un producto.

**Invariantes:**
- No puede estar vacío

### Quantity
Cantidad de productos.

**Invariantes:**
- Debe ser un número entero positivo
- No puede ser cero

**Ejemplo:**
```typescript
const qty = Quantity.create(5);
const total = qty.add(Quantity.create(3)); // 8
```

### OrderItem
Item dentro de un pedido.

**Componentes:**
- ProductId
- Quantity
- Money (precio unitario)

**Operaciones:**
- `calculateSubtotal()`: Calcula cantidad × precio
- `increaseQuantity(qty)`: Incrementa la cantidad

## Entidades

### Order (Aggregate Root)
Representa un pedido completo con sus items.

**Invariantes:**
- Un pedido debe tener un ID único
- Todos los items deben tener la misma moneda
- No se pueden agregar items con precio cero

**Operaciones principales:**
```typescript
// Crear pedido
const order = Order.create();

// Agregar items
const usd = Currency.USD();
order.addItem(
  ProductId.create('PROD-001').value,
  Quantity.create(2).value,
  Money.create(100, usd).value
);

// Calcular total
const total = order.calculateTotal();

// Totales por moneda
const totals = order.calculateTotalsByCurrency();

// Consultas
order.itemCount;              // Número de productos diferentes
order.getTotalQuantity();     // Cantidad total de items
order.hasProduct(productId);  // Verifica si contiene un producto
```

## Eventos de Dominio

### OrderCreated
Se emite cuando se crea un nuevo pedido.

**Datos:**
- `orderId`: ID del pedido creado

### OrderItemAdded
Se emite cuando se agrega un item nuevo al pedido.

**Datos:**
- `orderId`: ID del pedido
- `productId`: ID del producto
- `quantity`: Cantidad agregada
- `unitPrice`: Precio unitario

### OrderItemQuantityIncreased
Se emite cuando se incrementa la cantidad de un item existente.

**Datos:**
- `orderId`: ID del pedido
- `productId`: ID del producto
- `previousQuantity`: Cantidad anterior
- `newQuantity`: Nueva cantidad

## Uso de Eventos

Los eventos se acumulan en el aggregate y se pueden obtener con:

```typescript
const order = Order.create();
// ... realizar operaciones ...
const events = order.pullDomainEvents();

events.forEach(event => {
  console.log(event.eventType);
  console.log(event.toPrimitives());
});
```

## Manejo de Errores

El dominio usa el tipo `Result<T, E>` para manejo funcional de errores:

```typescript
const qtyResult = Quantity.create(-1);
if (qtyResult.ok) {
  const qty = qtyResult.value;
} else {
  console.error(qtyResult.error); // "La cantidad debe ser mayor que cero"
}
```

## Ejemplo Completo

Ver [order-usage.example.ts](./examples/order-usage.example.ts) para un ejemplo completo de uso.

## Principios Aplicados

- **Inmutabilidad**: Los Value Objects son inmutables
- **Validación en construcción**: Todas las invariantes se validan al crear objetos
- **Encapsulación**: Los detalles internos están protegidos
- **Aggregate Root**: Order controla el acceso a sus items
- **Domain Events**: Captura los cambios importantes del dominio
- **Sin dependencias externas**: Código puro sin frameworks ni IO
