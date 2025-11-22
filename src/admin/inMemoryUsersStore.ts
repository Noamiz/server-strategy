import type { EmailAddress, UnixMs, User } from 'common-strategy';

const now = (): UnixMs => Date.now();

const USERS: User[] = [
  {
    id: 'admin-1',
    email: 'admin@example.com' as EmailAddress,
    displayName: 'Admin One',
    isActive: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'editor-1',
    email: 'editor@example.com' as EmailAddress,
    displayName: 'Editor One',
    isActive: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'viewer-1',
    email: 'viewer@example.com' as EmailAddress,
    displayName: 'Viewer One',
    isActive: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'ops-1',
    email: 'ops@example.com' as EmailAddress,
    displayName: 'Operations One',
    isActive: true,
    createdAt: now(),
    updatedAt: now(),
  },
];

export function listUsers(): User[] {
  return USERS;
}


