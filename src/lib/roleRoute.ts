import { UserRole } from './supabase';

export function getRoleHomeRoute(role: UserRole): string {
  switch (role) {
    case 'villager':
      return '/my-cases';
    case 'asha_worker':
    case 'doctor':
      return '/cases';
    case 'admin':
      return '/users';
    default:
      return '/dashboard';
  }
}
