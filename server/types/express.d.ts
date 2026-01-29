import type { Customer } from '@shared/schema';

declare global {
  namespace Express {
    // Omit sensitive fields from req.user
    interface User extends Omit<Customer, 'password' | 'resetPasswordToken' | 'resetPasswordExpires'> {}
  }
}

export {};
