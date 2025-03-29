import { Request } from 'express';
import { AuthenticationRoles, Direction } from "./UserInterface";

export interface InfoTokenSave {
    uid: string;
    name: string;
    role: AuthenticationRoles;
    photoURL: string;
    direction: Direction;
    companyId: string;
}

export interface InfoTokenWithRequest extends Request, InfoTokenSave {}