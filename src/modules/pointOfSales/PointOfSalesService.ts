import { PointOfSalesModel } from "../../database/models";

interface CreatePointOfSaleOrderParams {
    name: string;
    description?: string;
    companyId: string;
}

export class PointOfSalesService {
  constructor () {}
  
  /**
   * Permite obtener un punto de venta por su ID
   * @param pointOfSalesId 
   * @returns 
   */
  async getPointOfSalesById (pointOfSalesId: string) {
    try {
        if (!pointOfSalesId) {
            throw new Error('Point of Sales ID is required');
        }

        const pointOfSales = await PointOfSalesModel.findById(pointOfSalesId).populate('paymentMethods');

        if (!pointOfSales) {
            throw new Error('Point of Sales not found');
        }
    
        return pointOfSales;
        }
    catch (error) {
        throw new Error(`[getPointOfSalesById] ${error}`);
    }
  }

  /**
  * Permite obtener los puntos de venta por companyId
  * @param companyId id de la compañía
  * @returns Puntos de venta encontrados
  */
  async getPointOfSalesByCompanyId (companyId: string) {
    try {
      if (!companyId) {
        throw new Error('Company ID is required');
      }

      const pointOfSales = await PointOfSalesModel.find({ company: companyId });

      return pointOfSales;
    } catch (error) {
      throw new Error(`[getPointOfSalesByCompanyId] ${error}`);
    }
  }

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