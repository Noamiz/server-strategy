import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be defined (see env.example) before running the seed script.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

const ROLE_DEFINITIONS = [
  { name: 'admin', description: 'Full system administrator', isInternal: true },
  { name: 'editor', description: 'Content editor with write access', isInternal: true },
  { name: 'viewer', description: 'Read-only internal user', isInternal: true },
  { name: 'ops', description: 'Operations and support specialist', isInternal: true },
];

const USER_DEFINITIONS = [
  {
    email: 'admin@example.com',
    displayName: 'Admin One',
    roles: ['admin'],
  },
  {
    email: 'editor@example.com',
    displayName: 'Editor One',
    roles: ['editor'],
  },
  {
    email: 'viewer@example.com',
    displayName: 'Viewer One',
    roles: ['viewer'],
  },
  {
    email: 'ops@example.com',
    displayName: 'Operations One',
    roles: ['ops'],
  },
];

async function main(): Promise<void> {
  const roleIdByName = new Map<string, string>();

  for (const role of ROLE_DEFINITIONS) {
    const record = await prisma.role.upsert({
      where: { name: role.name },
      update: {
        description: role.description,
        isInternal: role.isInternal,
      },
      create: {
        name: role.name,
        description: role.description,
        isInternal: role.isInternal,
      },
    });

    roleIdByName.set(role.name, record.id);
  }

  for (const user of USER_DEFINITIONS) {
    const record = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        displayName: user.displayName,
        isActive: true,
      },
      create: {
        email: user.email,
        displayName: user.displayName,
        isActive: true,
      },
    });

    for (const roleName of user.roles) {
      const roleId = roleIdByName.get(roleName);
      if (!roleId) {
        continue;
      }

      await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: record.id,
            roleId,
          },
        },
        update: {},
        create: {
          userId: record.id,
          roleId,
        },
      });
    }
  }
}

main()
  .catch((error) => {
    console.error('Failed to seed database', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
