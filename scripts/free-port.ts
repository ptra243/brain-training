// Prints a TCP port that is free right now (the OS picks it). playwright.config.ts
// runs this so two e2e runs, in this folder or in worktrees, never share a server.
import { createServer } from 'node:net';

const server = createServer();
server.listen(0, '127.0.0.1', () => {
  const address = server.address();
  process.stdout.write(String(typeof address === 'object' && address ? address.port : 0));
  server.close();
});
