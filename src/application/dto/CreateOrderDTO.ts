/**
 * DTO para crear un nuevo pedido
 * No requiere items iniciales, se pueden agregar después
 */
export interface CreateOrderDTO {
  /**
   * ID del pedido (opcional, si no se provee se genera uno nuevo)
   */
  orderId?: string;
}
