import type { User } from 'common-strategy';
import type { Session } from '@prisma/client';

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
    session?: Session;
  }
}


