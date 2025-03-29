process.loadEnvFile();

import { envs } from './config';
import { connectionDB } from './database';
import { router } from './router';
import { Server } from './server';

const server = new Server();
connectionDB( envs.CONNECTION_STRING as string );

server.initiateAndStart(router, envs.PORT as number)
    .catch((error) => console.log('[INITAL][ERROR]'+error));