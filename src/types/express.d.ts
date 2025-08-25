import { UserModel } from '../models/User';

declare global {
  namespace Express {
    interface Request {
      user?: UserModel;
    }
  }
}

export {};