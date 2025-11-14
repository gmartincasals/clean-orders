/**
 * Ejemplo de uso del modelo de dominio Order
 * Este archivo demuestra cómo usar la entidad Order, los Value Objects y los eventos
 */

import { Order } from '../entities/Order.js';
import { ProductId } from '../value-objects/ProductId.js';
import { Quantity } from '../value-objects/Quantity.js';
import { Money } from '../value-objects/Money.js';
import { Currency } from '../value-objects/Currency.js';
import { OrderId } from '../value-objects/OrderId.js';

export function orderUsageExample(): void {
  console.log('=== Ejemplo de uso del modelo de dominio Order ===\n');

  // 1. Crear un nuevo pedido
  console.log('1. Creando un nuevo pedido...');
  const order = Order.create();
  console.log(`   Pedido creado con ID: ${order.id}`);
  console.log(`   Fecha de creación: ${order.createdAt.toISOString()}\n`);

  // 2. Agregar items al pedido
  console.log('2. Agregando items al pedido...');

  const laptop = ProductId.create('LAPTOP-001');
  const mouse = ProductId.create('MOUSE-001');
  const keyboard = ProductId.create('KEYBOARD-001');

  if (!laptop.ok || !mouse.ok || !keyboard.ok) {
    console.error('Error al crear IDs de producto');
    return;
  }

  const qty1 = Quantity.create(2);
  const qty2 = Quantity.create(1);
  const qty3 = Quantity.create(3);

  if (!qty1.ok || !qty2.ok || !qty3.ok) {
    console.error('Error al crear cantidades');
    return;
  }

  const usd = Currency.USD();

  const price1 = Money.create(1200, usd);
  const price2 = Money.create(25, usd);
  const price3 = Money.create(75, usd);

  if (!price1.ok || !price2.ok || !price3.ok) {
    console.error('Error al crear precios');
    return;
  }

  // Agregar laptop
  const result1 = order.addItem(laptop.value, qty1.value, price1.value);
  if (result1.ok) {
    console.log('   ✓ Agregado: 2x Laptop @ $1,200.00');
  }

  // Agregar mouse
  const result2 = order.addItem(mouse.value, qty2.value, price2.value);
  if (result2.ok) {
    console.log('   ✓ Agregado: 1x Mouse @ $25.00');
  }

  // Agregar keyboard
  const result3 = order.addItem(keyboard.value, qty3.value, price3.value);
  if (result3.ok) {
    console.log('   ✓ Agregado: 3x Keyboard @ $75.00\n');
  }

  // 3. Incrementar cantidad de un item existente
  console.log('3. Incrementando cantidad de laptops...');
  const additionalQty = Quantity.create(1);
  if (additionalQty.ok) {
    const result4 = order.addItem(laptop.value, additionalQty.value, price1.value);
    if (result4.ok) {
      console.log('   ✓ Se incrementó la cantidad de laptops de 2 a 3\n');
    }
  }

  // 4. Mostrar resumen del pedido
  console.log('4. Resumen del pedido:');
  console.log(`   Total de productos diferentes: ${order.itemCount}`);
  console.log(`   Cantidad total de items: ${order.getTotalQuantity()}`);

  console.log('\n   Items:');
  order.items.forEach((item) => {
    console.log(`   - ${item.toString()}`);
  });

  // 5. Calcular total
  console.log('\n5. Calculando total del pedido...');
  const totalResult = order.calculateTotal();
  if (totalResult.ok) {
    console.log(`   Total: ${totalResult.value.toString()}`);
  }

  // También mostrar totales por moneda (útil cuando hay múltiples monedas)
  console.log('\n   Totales por moneda:');
  const totalsByCurrency = order.calculateTotalsByCurrency();
  totalsByCurrency.forEach((total, currency) => {
    console.log(`   - ${currency}: ${total.toString()}`);
  });

  // 6. Eventos de dominio
  console.log('\n6. Eventos de dominio generados:');
  const events = order.pullDomainEvents();
  events.forEach((event, index) => {
    console.log(`\n   Evento ${index + 1}:`);
    console.log(`   Tipo: ${event.constructor.name}`);
    console.log(`   Ocurrió: ${event.occurredAt.toISOString()}`);
    console.log(`   Datos:`, JSON.stringify(event.toPrimitives(), null, 2));
  });

  // 7. Validaciones y casos de error
  console.log('\n7. Probando validaciones...');

  // Intentar agregar item con precio cero
  const zeroPriceResult = Money.create(0, usd);
  if (zeroPriceResult.ok) {
    const errorResult = order.addItem(laptop.value, qty1.value, zeroPriceResult.value);
    if (!errorResult.ok) {
      console.log(`   ✓ Validación correcta: ${errorResult.error}`);
    }
  }

  // Intentar agregar item con moneda diferente
  const eur = Currency.EUR();
  const differentCurrencyPrice = Money.create(100, eur);
  if (differentCurrencyPrice.ok) {
    const euroProduct = ProductId.create('PROD-EUR');
    const euroQty = Quantity.create(1);
    if (euroProduct.ok && euroQty.ok) {
      const errorResult = order.addItem(
        euroProduct.value,
        euroQty.value,
        differentCurrencyPrice.value
      );
      if (!errorResult.ok) {
        console.log(`   ✓ Validación correcta: ${errorResult.error}`);
      }
    }
  }

  // Intentar crear cantidad negativa
  const negativeQtyResult = Quantity.create(-1);
  if (!negativeQtyResult.ok) {
    console.log(`   ✓ Validación correcta: ${negativeQtyResult.error}`);
  }

  console.log('\n=== Fin del ejemplo ===');
}

// Ejecutar el ejemplo si se ejecuta directamente
if (require.main === module) {
  orderUsageExample();
}
