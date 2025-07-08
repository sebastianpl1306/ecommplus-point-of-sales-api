import { Request, Response } from "express";
import { PointOfSalesService } from "./PointOfSalesService";
import { InfoTokenSave } from "../../interfaces";

export class PointOfSalesController {
    private pointOfSalesService;

    constructor() {
        this.pointOfSalesService = new PointOfSalesService();
    }

    /**
     * Permite obtener un punto de venta por su ID
     */
    async getPointOfSalesById(request: Request, response: Response) {
        const { pointOfSalesId } = request.params;
        try {
            if (!pointOfSalesId) {
                console.error('[ERROR][getPointOfSalesById] Point of Sales ID is required', { pointOfSalesId });
                response.status(401).json({
                    ok: false,
                    msg: 'Point of Sales ID is required'
                })
                return;
            }

            const pointOfSales = await this.pointOfSalesService.getPointOfSalesById(pointOfSalesId);

            response.status(200).json({
                ok: true,
                pointOfSales
            })
            return;
        } catch (error) {
            console.error('[ERROR][getPointOfSalesById]', error)
            response.status(500).json({
                ok: false,
                msg: "Ups! Error invoke"
            })
        }
    }

    /**
     * Permite obtener los puntos de venta por companyId
     */
    async getPointOfSalesByCompanyId(request: Request, response: Response) {
        const { companyId }: InfoTokenSave = request.body.tokenInfo;
        try {
            if (!companyId) {
                console.error('[ERROR][getPointOfSalesByCompanyId] Company ID is required', { companyId });
                response.status(401).json({
                    ok: false,
                    msg: 'Company ID is required'
                })
                return;
            }

            const pointOfSales = await this.pointOfSalesService.getPointOfSalesByCompanyId(companyId);

            response.status(200).json({
                ok: true,
                pointOfSales
            })
            return;
        } catch (error) {
            console.error('[ERROR][getPointOfSalesByCompanyId]', error)
            response.status(500).json({
                ok: false,
                msg: "Ups! Error invoke"
            })
        }
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