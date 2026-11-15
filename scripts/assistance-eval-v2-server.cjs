const { URL } = require('node:url');
const target = process.env.API_DATABASE_URL && new URL(process.env.API_DATABASE_URL);
if (!target || target.hostname !== '127.0.0.1' || target.port !== '55438' || target.pathname !== '/pyneath_assistance_eval_v2' ||
    process.env.API_HOST !== '127.0.0.1' || process.env.API_PORT !== '18087' ||
    process.env.API_ASSISTANCE_PROVIDER !== 'beeknoee' || process.env.BEEKNOEE_MODEL !== 'bee/gpt-6-luna' ||
    process.env.BEEKNOEE_RESPONSE_FORMAT !== 'json_schema' || process.env.API_ASSISTANCE_DIAGNOSTICS !== 'false' ||
    process.env.API_ASSISTANCE_QUALITY_V2 !== 'true')
  throw new Error('Evaluation server requires isolated local API, database and Luna configuration');
require('./assistance-eval-v2-inference.cjs').install();
require('../apps/api/dist/main.js');
