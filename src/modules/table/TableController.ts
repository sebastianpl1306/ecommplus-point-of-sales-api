import { Request, Response } from 'express';
import { TableService } from './TableServices';
import { InfoTokenSave } from '../../interfaces';

export class TableController {
    private tableService;

    constructor(){
        this.tableService = new TableService();
    }

    /**
     * Permite crear una mesa
     */
    async createTable (request: Request, response: Response) {
        const { number, capacity, pointOfSalesId } = request.body;
        const { companyId }: InfoTokenSave = request.body.tokenInfo;

        try {
            if( !number || !capacity || !companyId || !pointOfSalesId ) {
                response.status(401).json({
                    ok:false,
                    msg: 'Info missing'
                })
                return;
            }

            const table = await this.tableService.createTable({ capacity, companyId, number, pointOfSalesId });

            if(!table) {
                console.error(`[ERROR][createTable]`, { capacity, companyId, number, pointOfSalesId });
                response.status(401).json({
                    ok: false,
                    msg: "Error creating table"
                })
                return;
            }

            response.status(200).json({
                ok: true,
                table
            })
            return;
        } catch (error) {
            console.error('[ERROR][createOrderPoint]', error)
            response.status(500).json({
                ok: false,
                msg: "Ups! Error invoke"
            })
            return;
        }
    }

    /**
     * Permite obtener las mesas de un punto de venta
     */
    async getTables (request: Request, response: Response) {
        const { pointOfSalesId } = request.body;

        try {
            const tables = await this.tableService.getTables(pointOfSalesId);

            if(!tables) {
                console.error(`[ERROR][getTables]`, { pointOfSalesId });
                response.status(401).json({
                    ok: false,
                    msg: "Error getting tables"
                })
                return;
            }

            response.status(200).json({
                ok: true,
                tables
            })
        } catch (error) {
            console.error('[ERROR][getTables]', error)
            response.status(500).json({
                ok: false,
                msg: "Ups! Error invoke"
            })
            return;
        }
    }
}