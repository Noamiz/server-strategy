import 'dotenv/config';

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    'postgresql://postgres:postgres@localhost:5432/server_strategy_test?schema=public';
}


