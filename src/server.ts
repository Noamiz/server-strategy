import 'dotenv/config';
import { app } from './app';

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.listen(PORT, () => {
  // TODO: replace with structured logger once available.
  console.log(`server-strategy listening on port ${PORT}`);
});

