import { createServer } from 'node:http';
import { URL } from 'node:url';
import {
  createGradientConfig,
  createGradientHtml,
  createGradientReactSnippet,
  createRandomGradientConfig,
  listGradientMetadata,
  normalizeGradientConfig,
  renderGradientAsSvg,
} from '../src/api/index.js';
import { buildOpenApiSpec } from '../src/api/openapi.js';
import { ApiValidationError } from '../src/api/validation.js';

const JSON_LIMIT_BYTES = 1_000_000;

function send(res, status, body, contentType = 'application/json; charset=utf-8') {
  res.writeHead(status, {
    'content-type': contentType,
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type,accept',
  });
  res.end(body);
}

function sendJson(res, status, payload) {
  send(res, status, JSON.stringify(payload, null, 2));
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let tooLarge = false;

    req.on('data', (chunk) => {
      if (tooLarge) return;

      size += chunk.length;
      if (size > JSON_LIMIT_BYTES) {
        tooLarge = true;
        chunks.length = 0;
        reject(new ApiValidationError([{ field: 'body', message: 'Request body is too large.' }], 413));
        return;
      }

      chunks.push(chunk);
    });

    req.on('end', () => {
      if (tooLarge) return;

      if (!chunks.length) {
        resolve({});
        return;
      }

      const text = Buffer.concat(chunks).toString('utf8');
      try {
        resolve(JSON.parse(text));
      } catch {
        reject(new ApiValidationError([{ field: 'body', message: 'Request body must be valid JSON.' }]));
      }
    });
    req.on('error', reject);
  });
}

function unwrapConfig(body) {
  if (body && typeof body === 'object' && !Array.isArray(body) && body.config) {
    return body.config;
  }
  return body;
}

function requestBaseUrl(req) {
  const host = req.headers.host ?? 'localhost:8787';
  return `http://${host}`;
}

async function routeRequest(req, res) {
  if (req.method === 'OPTIONS') {
    send(res, 204, '');
    return;
  }

  const url = new URL(req.url ?? '/', requestBaseUrl(req));
  const path = url.pathname;

  if (req.method === 'GET' && path === '/api/health') {
    sendJson(res, 200, { ok: true, name: 'gradients', version: listGradientMetadata().version });
    return;
  }

  if (req.method === 'GET' && path === '/api/meta') {
    sendJson(res, 200, listGradientMetadata());
    return;
  }

  if (req.method === 'GET' && path === '/api/openapi.json') {
    sendJson(res, 200, buildOpenApiSpec({ baseUrl: requestBaseUrl(req) }));
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 404, { error: 'not_found', message: `No route for ${req.method} ${path}` });
    return;
  }

  const body = await readRequestBody(req);
  const configInput = unwrapConfig(body);

  if (path === '/api/gradients') {
    sendJson(res, 200, { config: createGradientConfig(configInput) });
    return;
  }

  if (path === '/api/gradients/random') {
    sendJson(res, 200, { config: createRandomGradientConfig(body) });
    return;
  }

  if (path === '/api/gradients/validate') {
    sendJson(res, 200, normalizeGradientConfig(configInput));
    return;
  }

  if (path === '/api/gradients/render' || path === '/api/gradients/svg') {
    send(res, 200, renderGradientAsSvg(configInput), 'image/svg+xml; charset=utf-8');
    return;
  }

  if (path === '/api/gradients/html') {
    send(res, 200, createGradientHtml(configInput), 'text/html; charset=utf-8');
    return;
  }

  if (path === '/api/gradients/react') {
    sendJson(res, 200, { code: createGradientReactSnippet(configInput) });
    return;
  }

  sendJson(res, 404, { error: 'not_found', message: `No route for ${req.method} ${path}` });
}

export function createApiServer() {
  return createServer(async (req, res) => {
    try {
      await routeRequest(req, res);
    } catch (error) {
      if (error instanceof ApiValidationError) {
        sendJson(res, error.status, {
          error: 'validation_error',
          message: error.message,
          errors: error.errors,
        });
        return;
      }

      console.error(error);
      sendJson(res, 500, {
        error: 'internal_error',
        message: 'Unexpected API error.',
      });
    }
  });
}
