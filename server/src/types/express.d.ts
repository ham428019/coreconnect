export {};

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: import('@prisma/client').UserRole;
      };
    }
  }
}
