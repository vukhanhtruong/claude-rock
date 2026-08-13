// scripts/lib/port.mjs
// new-lead-dashboard v1
import net from 'node:net';

export async function findFreePort(start = 4600) {
  return (await isFree(start)) ? start : findFreePort(start + 1);
}

function isFree(port) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once('error', () => resolve(false));
    srv.listen(port, '127.0.0.1', () => srv.close(() => resolve(true)));
  });
}
