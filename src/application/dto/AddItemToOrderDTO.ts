/**
 * DTO para agregar un item a un pedido existente
 */
export interface AddItemToOrderDTO {
  /**
   * ID del pedido al que se agregará el item
   */
  orderId: string;

  /**
   * ID del producto (SKU)
   */
  productId: string;

  /**
   * Cantidad del producto a agregar
   */
  quantity: number;
}
