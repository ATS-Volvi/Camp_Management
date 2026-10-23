import { IAuthData } from "../../middleware/authHandler";

export {};

declare global {
  namespace Express {
    export interface Request {
      authData?: IAuthData;
      params: Record<string, any>;
    }
  }
}
