import {
  API_VERSION,
  CANVAS_BLEND_MODES,
  LIMITS,
  RATIOS,
  VIBRANCY_OPTIONS,
} from './constants.js';
import { SHADER_VALUES } from './shaders.js';
import { RANDOM_MAX_ATTEMPTS } from './validation.js';

const HEX_COLOR_PATTERN = '^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$';

function renderPath() {
  return {
    post: {
      summary: 'Render a gradient as SVG',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/GradientConfigInput' },
          },
        },
      },
      responses: {
        200: {
          description: 'SVG image',
          content: { 'image/svg+xml': {} },
        },
        400: { description: 'Validation error' },
      },
    },
  };
}

export function buildOpenApiSpec({ baseUrl = 'http://localhost:8787' } = {}) {
  const ratioLabels = RATIOS.map((ratio) => ratio.label);
  const vibrancyValues = VIBRANCY_OPTIONS.map((option) => option.value);

  return {
    openapi: '3.1.0',
    info: {
      title: 'Hiro Gradients API',
      version: API_VERSION,
      description: 'Generate, validate, render, and export parametric Hiro gradient backgrounds.',
    },
    servers: [{ url: baseUrl }],
    paths: {
      '/api/health': {
        get: {
          summary: 'Health check',
          responses: {
            200: {
              description: 'API is healthy',
            },
          },
        },
      },
      '/api/meta': {
        get: {
          summary: 'List API capabilities, defaults, limits, ratios, blend modes, and shader presets',
          responses: {
            200: {
              description: 'Capability metadata',
            },
          },
        },
      },
      '/api/gradients': {
        post: {
          summary: 'Normalize and create a gradient config',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/GradientConfigInput' },
              },
            },
          },
          responses: {
            200: { description: 'Normalized gradient config' },
            400: { description: 'Validation error' },
          },
        },
      },
      '/api/gradients/random': {
        post: {
          summary: 'Create a random, optionally seeded gradient config',
          requestBody: {
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RandomGradientInput' },
              },
            },
          },
          responses: {
            200: { description: 'Generated gradient config' },
            400: { description: 'Validation error' },
          },
        },
      },
      '/api/gradients/validate': {
        post: {
          summary: 'Validate a gradient config without throwing',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/GradientConfigInput' },
              },
            },
          },
          responses: {
            200: { description: 'Validation result' },
          },
        },
      },
      '/api/gradients/render': renderPath(),
      '/api/gradients/svg': renderPath(),
      '/api/gradients/html': {
        post: {
          summary: 'Create standalone replication HTML for a gradient',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/GradientConfigInput' },
              },
            },
          },
          responses: {
            200: {
              description: 'Standalone HTML',
              content: { 'text/html': {} },
            },
            400: { description: 'Validation error' },
          },
        },
      },
      '/api/gradients/react': {
        post: {
          summary: 'Create a React shader snippet for shader-backed gradients',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/GradientConfigInput' },
              },
            },
          },
          responses: {
            200: { description: 'React component code' },
            400: { description: 'Validation error' },
          },
        },
      },
      '/api/openapi.json': {
        get: {
          summary: 'OpenAPI 3.1 contract',
          responses: {
            200: { description: 'OpenAPI JSON document' },
          },
        },
      },
    },
    components: {
      schemas: {
        GradientConfigInput: {
          type: 'object',
          properties: {
            colors: {
              type: 'array',
              minItems: LIMITS.minColors,
              maxItems: LIMITS.maxColors,
              items: { type: 'string', pattern: HEX_COLOR_PATTERN },
            },
            width: { type: 'integer', minimum: LIMITS.minDimension, maximum: LIMITS.maxDimension },
            height: { type: 'integer', minimum: LIMITS.minDimension, maximum: LIMITS.maxDimension },
            ratio: { type: 'string', enum: ratioLabels },
            ratioLabel: { type: 'string' },
            seed: { type: 'number' },
            isBlurred: { type: 'boolean' },
            blurStrength: {
              type: 'number',
              minimum: LIMITS.minBlurStrength,
              maximum: LIMITS.maxBlurStrength,
            },
            blendMode: {
              type: 'string',
              enum: [...CANVAS_BLEND_MODES],
            },
            showRing: { type: 'boolean' },
            activeShader: {
              type: 'string',
              enum: [...SHADER_VALUES],
            },
            activePreset: { type: 'string' },
            presetParams: { type: 'object', additionalProperties: true },
          },
        },
        RandomGradientInput: {
          type: 'object',
          properties: {
            seed: { oneOf: [{ type: 'string' }, { type: 'number' }] },
            count: { type: 'integer', minimum: LIMITS.minColors, maximum: LIMITS.maxColors },
            vibrancy: { type: 'string', enum: vibrancyValues },
            ratio: { type: 'string', enum: ['random', ...ratioLabels] },
            previousColors: {
              type: 'array',
              maxItems: LIMITS.maxColors,
              items: { type: 'string', pattern: HEX_COLOR_PATTERN },
            },
            includeShader: { type: 'boolean' },
            includeNone: { type: 'boolean' },
            maxAttempts: {
              type: 'integer',
              minimum: RANDOM_MAX_ATTEMPTS.min,
              maximum: RANDOM_MAX_ATTEMPTS.max,
              default: RANDOM_MAX_ATTEMPTS.default,
            },
          },
        },
      },
    },
  };
}
