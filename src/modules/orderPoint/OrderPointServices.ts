import { OrderPointStatus, ProductsOrderPoint } from "../../interfaces";
import { OrderPointModel } from "../../database/models";
import { generateFiltersByOrderPoints, QueryFiltersOrderPoints } from "../../helpers";

interface CreateOrderParams {
  tableId: string;
  products: ProductsOrderPoint[];
  status: OrderPointStatus;
  subtotal: number;
  userId?: string;
  pointOfSalesId: string;
  sessionId: string;
}

interface UpdateOrderParams {
  products: ProductsOrderPoint[];
  status: OrderPointStatus;
  subtotal: number;
  pointOfSalesId: string;
}

export class OrderPointService {
  constructor () {}

  /**
   * Permite actualizar una orden de punto de venta
   * @param orderId id de la orden
   * @param updates Actualizaciones de la orden
   * @returns Orden actualizada
   */
  async updateOrderPoint(orderId: string, updates: Partial<UpdateOrderParams>) {
    try {
      if (!orderId) {
        throw new Error('Order ID is required');
      }

      const updatedOrder = await OrderPointModel.findByIdAndUpdate(orderId, updates, {
        new: true,
        runValidators: true,
      });

      if (!updatedOrder) {
        throw new Error('Order not found');
      }
  
      return updatedOrder;
    } catch (error) {
      throw new Error(`[updateOrderPoint] ${error}`);
    }
  }

  /**
  * Permite crear una orden de punto de venta
  */
  async createOrderPoint ({ tableId, products, status, subtotal, userId, pointOfSalesId, sessionId }: CreateOrderParams) {
    try {
      if (!tableId || !products || !status || !subtotal || !pointOfSalesId || !sessionId) {
        console.error('[ERROR][OrderPointServices][createOrderPoint] missing info', { tableId, products, status, subtotal, pointOfSalesId, userId, sessionId });
        throw new Error('missing info');
      }

      const newOrder = new OrderPointModel({
        table: tableId,
        products,
        status,
        subtotal,
        pointOfSales: pointOfSalesId,
        session: sessionId,
        user: userId
      });

      //Guardar el orden en base de datos
      await newOrder.save();

      return newOrder;
    } catch (error) {
      throw new Error(`[OrderPointServices][createOrderPoint] ${error}`);
    }
  }

  /**
   * Permite obtener las ordenes de punto de venta
   * @returns Ordenes de punto de venta
   */
  async getOrderPoints (filters?: QueryFiltersOrderPoints, page: number = 1, limit: number = 10 ) {
    try {
      const query: QueryFiltersOrderPoints = generateFiltersByOrderPoints(filters);

      // Calcular el número de documentos a omitir
      const skip = (page - 1) * limit;

      const ordersPoint = await OrderPointModel.find(query)
        .populate('pointOfSales')
        .populate('table')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const totalPages = await OrderPointModel.countDocuments(query);

      if (ordersPoint) {
        return {
          ordersPoint,
            totalPages,
            page
        }
      }

      return {
        ordersPoint: [],
        totalPages: 0,
        page: 0
      };
    } catch (error) {
      throw new Error(`[getOrderPoints] ${error}`);
    }
  }
}