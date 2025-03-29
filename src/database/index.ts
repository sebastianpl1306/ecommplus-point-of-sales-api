import { connect } from 'mongoose';

export const connectionDB = async(connectionString: string) =>{
    try {
        await connect(connectionString);
        console.log('[INITIAL][DB] Database Connect');
    } catch (error) {
        console.log(error);
        throw new Error('[INITIAL][ERROR] Error a la hora de inicializar DB');
    }
}