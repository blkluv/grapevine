import fs from 'fs';
import { OpenAPIHono } from "@hono/zod-openapi";
import { withRoutes } from '../grapevine-api/dist/routes/index.js';

const app = withRoutes(new OpenAPIHono());

// Get the OpenAPI document
const spec = app.getOpenAPIDocument();

// Ensure proper structure with metadata at the top
const formattedSpec = {
  openapi: spec.openapi || '3.0.0',
  info: spec.info || {
    version: '0.1.0',
    title: 'grapevine API',
    description: 'Decentralized Data Feeds Platform API'
  },
  servers: spec.servers || [
    {
      url: 'http://localhost:3000',
      description: 'Local development server'
    }
  ],
  tags: spec.tags || [],
  components: spec.components || { schemas: {}, parameters: {} },
  paths: spec.paths || {}
};

fs.writeFileSync('openapi.json', JSON.stringify(formattedSpec, null, 2));
console.log('OpenAPI spec generated successfully');
console.log(`Total endpoints: ${Object.keys(formattedSpec.paths).length}`);
process.exit(0);