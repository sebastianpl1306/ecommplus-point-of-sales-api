import { PointOfSalesModel, TableModel } from "../../database/models";

interface CreateTableParams {
    number: number;
    capacity: number;
    companyId: string;
    pointOfSalesId: string;
}

export class TableService {
    constructor() {}

    /**
     * Permite obtener las tablas de un punto de venta
     * @param pointOfSalesId id del punto de venta
     * @returns Punto de venta encontrado
     */
    async getTables(pointOfSalesId: string) {
        try {
            if (!pointOfSalesId) {
                throw new Error('missing info');
            }

            const tables = await TableModel.find({ pointOfSales: pointOfSalesId });

            return tables;
        } catch (error) {
            throw new Error(`[getTables] ${error}`);
        }
    }

    /**
     * Permite obtener las mesas
     * @returns 
     */
    async createTable ({ number, capacity, pointOfSalesId, companyId }: CreateTableParams){
        try {
            if (!number || !capacity || !pointOfSalesId || !companyId ) {
                throw new Error('missing info');
            }

            //Verificar que la tabla que se desea agregar al punto de venta si pertenezca a la compañía
            const pointOfSales = await PointOfSalesModel.findById(pointOfSalesId).populate('company');

            if(pointOfSales && pointOfSales.company._id === companyId){
                return null;
            }

            const newTable = new TableModel({
                number,
                capacity,
                pointOfSales: pointOfSalesId
            })

            await newTable.save();

            return newTable;
        } catch (error) {
            throw new Error(`[createTable] ${error}`);
        }
    }
}