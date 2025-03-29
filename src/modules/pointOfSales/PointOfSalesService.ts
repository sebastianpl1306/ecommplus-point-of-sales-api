import { PointOfSalesModel } from "../../database/models";

interface CreatePointOfSaleOrderParams {
    name: string;
    description?: string;
    companyId: string;
}

export class PointOfSalesService {
  constructor () {}

  /**
   * Permite crear un punto de venta
   */
  async createPointOfSaleOrder ({ name, description, companyId }: CreatePointOfSaleOrderParams) {
    try {
        if(!name || !companyId) {
            throw new Error('missing info');
        }

        const newPointOfSale = new PointOfSalesModel({
            name,
            description,
            company: companyId
        })

        await newPointOfSale.save();

        return newPointOfSale;
    } catch (error) {
        throw new Error(`[createPointOfSaleOrder] ${error}`);
    }
  }
}