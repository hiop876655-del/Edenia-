// Cloud Run production fallback entry point (ES Module)
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
require('./dist/server.cjs');

