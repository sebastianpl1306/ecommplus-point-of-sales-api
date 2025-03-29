import express, { Application, Router } from 'express';
import fileUpload from 'express-fileupload';
import {Server as HttpServer, createServer} from 'http';
import cors from 'cors';

/**
 * Clase para crear el servidor
 */
export class Server {
    private _app: Application | null;
    private _httpServer: HttpServer | null;
    private _serverPort: number | null;

    public get app(): Application | null {
        return this._app;
    }

    public get httpServer(): HttpServer | null{
        return this._httpServer;
    }

    public get serverPort(): number | null{
        return this._serverPort;
    }

    public constructor(){
        this._app = null;
        this._serverPort = null;
        this._httpServer = null;
        this._serverPort = null;
    }

    /**
     * Inicializa las configuraciones del servidor y lo inicia
     * @param router Rutas del servidor
     * @param serverPort Puerto del servidor
     */
    public async initiateAndStart(router: Router, serverPort: number): Promise<any | null>{
        try {
            this._app = express();
            this._serverPort = serverPort;
            this._httpServer = createServer(this._app);
            this._app.use(express.json())
            this._app.use(cors())
            this._app.use(fileUpload({
                useTempFiles: true,
                tempFileDir: './uploads'
            }))
            this.defaultConfigurations(router);
            this._httpServer.listen(this._serverPort, ()=>{
                console.log(`[SERVER][INFO] SERVER RUNNING ON ${this._serverPort}`);
            })
        } catch (error) {
            return Promise.reject("[SERVER] [ERROR] error")
        }
    }

    /**
     * Configuraciones por defecto del servidor
     * @param router Router del servidor
     */
    private defaultConfigurations(router: Router): void{
        if (this.app) {
            this.app.use('/', router);
            this.app.use(fileUpload({
                useTempFiles: true,
                tempFileDir: './uploads'
            }))
            this.app.use(express.json());
        }
    }
}