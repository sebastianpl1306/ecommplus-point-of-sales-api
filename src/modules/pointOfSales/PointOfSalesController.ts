import { Request, Response } from "express";
import { PointOfSalesService } from "./PointOfSalesService";
import { InfoTokenSave } from "../../interfaces";

export class PointOfSalesController {
    private pointOfSalesService;

    constructor() {
        this.pointOfSalesService = new PointOfSalesService();
    }

    /**
     * Permite crear un punto de venta
     */
    async createPointOfSale(request: Request, response: Response) {
        const { name, description } = request.body;
        const { companyId }: InfoTokenSave = request.body.tokenInfo;
        try {
            if(!name || !companyId) {
                console.error('[ERROR][createPointOfSale] Info missing', { name, description, companyId });
                response.status(401).json({
                    ok: false,
                    msg: 'Info missing'
                })
                return;
            }

            const pointOfSale = await this.pointOfSalesService.createPointOfSaleOrder({ name, description, companyId });

            response.status(200).json({
                ok: true,
                pointOfSale
            })
            return;
        } catch (error) {
            console.error('[ERROR][createPointOfSale]', error)
            response.status(500).json({
                ok: false,
                msg: "Ups! Error invoke"
            })
        }
    }
}