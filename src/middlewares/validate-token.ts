import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { envs } from '../config';
import { AuthenticationRoles, InfoTokenSave, InfoTokenWithRequest } from '../interfaces';

export const validateJWT = (request: Request, response: Response, next: NextFunction) => {
    const token = request.header('x-token');
    if (!token) {
        return response.status(401).json({
            ok: 'false',
            msg: 'No hay token en la petición'
        })
    }

    try {
        const { uid, name, role, photoURL, direction, companyId }: InfoTokenWithRequest = <InfoTokenWithRequest>jwt.verify(
            token, 
            envs.SECRET_JWT as string
        );

        const tokenInfo: InfoTokenSave = {
            uid,
            name,
            role,
            photoURL,
            direction,
            companyId
        }
        request.body.tokenInfo = tokenInfo;
    } catch (error) {
        return response.status(401).json({
            ok: 'false',
            msg: 'Token invalido!'
        })
    }

    next();
}

export const validateJWTAdmin = (request: Request, response: Response, next: NextFunction) => {
    const token = request.header('x-token');
    if (!token) {
        response.status(401).json({
            ok: 'false',
            msg: 'No hay token en la petición'
        })
        return;
    }

    try {
        const { uid, name, role, photoURL, direction, companyId }: InfoTokenWithRequest = <InfoTokenWithRequest>jwt.verify(
            token, 
            envs.SECRET_JWT as string
        );

        if(role != AuthenticationRoles.ADMIN){
            response.status(401).json({
                ok: 'false',
                msg: 'Unauthorized'
            })
            return;
        }
        const tokenInfo: InfoTokenSave = {
            uid,
            name,
            role,
            photoURL,
            direction,
            companyId
        }
        request.body.tokenInfo = tokenInfo;
    } catch (error) {
        console.log(error);
        response.status(401).json({
            ok: 'false',
            msg: 'Token invalido!'
        })
        return;
    }

    return next();
}

export const validateJWTCustomer = (request: Request, response: Response, next: NextFunction) => {
    const token = request.header('x-token');
    if (!token) {
        return response.status(401).json({
            ok: 'false',
            msg: 'No hay token en la petición'
        })
    }

    try {
        const { uid, name, role, photoURL, direction, companyId }: InfoTokenWithRequest = <InfoTokenWithRequest>jwt.verify(
            token, 
            envs.SECRET_JWT as string
        );

        if(role != AuthenticationRoles.CUSTOMER){
            return response.status(401).json({
                ok: 'false',
                msg: 'Unauthorized'
            })
        }

        const tokenInfo: InfoTokenSave = {
            uid,
            name,
            role,
            photoURL,
            direction,
            companyId
        }
        request.body.tokenInfo = tokenInfo;
    } catch (error) {
        return response.status(401).json({
            ok: 'false',
            msg: 'Token invalido!'
        })
    }

    next();
}