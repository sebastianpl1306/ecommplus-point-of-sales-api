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
        const pointOfSalesId = request.query.pointOfSalesId as string;

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

    async getTableById (request: Request, response: Response) {
        const tableId = request.query.tableId as string;

        if (!tableId) {
            response.status(401).json({
                ok: false,
                msg: "Table ID is required"
            })
            return;
        }

        try {
            const table = await this.tableService.getTableById(tableId);
            if(!table) {
                console.error(`[ERROR][getTableById]`, { tableId });
                response.status(401).json({
                    ok: false,
                    msg: "Error getting table"
                })
                return;
            }
            response.status(200).json({
                ok: true,
                table
            })
        } catch (error) {
            console.error('[ERROR][getTableById]', error)
            response.status(500).json({
                ok: false,
                msg: "Ups! Error invoke"
            })
            return;
        }
    }
}