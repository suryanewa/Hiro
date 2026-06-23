import assert from 'node:assert/strict';
import test from 'node:test';
import { createApiServer } from '../api/http.js';
import {
  buildOpenApiSpec,
  createGradientConfig,
  createGradientHtml,
  createRandomGradientConfig,
  listGradientMetadata,
  normalizeGradientConfig,
  renderGradientAsSvg,
} from '../src/api/index.js';
import {
  dataUrlToBytes,
  ExportError,
  sanitizeExportSlug,
  selectExportImageDataUrl,
  validateExportDimensions,
} from '../src/exportGuards.js';

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve(`http://${address.address}:${address.port}`);
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function postJson(baseUrl, path, body) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function postRaw(baseUrl, path, body) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  });
}

test('creates deterministic seeded random configs', () => {
  const first = createRandomGradientConfig({ seed: 'launch', count: 4, vibrancy: 'normal', ratio: '1:1' });
  const second = createRandomGradientConfig({ seed: 'launch', count: 4, vibrancy: 'normal', ratio: '1:1' });

  assert.deepEqual(first, second);
  assert.equal(first.colors.length, 4);
  assert.equal(first.width, 1080);
  assert.equal(first.height, 1080);
});

test('randomizes blur strength between 35 and 75 inclusive', () => {
  const createConfigWithBlurRandom = (blurRandom) => {
    const randomValues = [0, blurRandom];
    return createRandomGradientConfig({
      random: () => randomValues.shift() ?? blurRandom,
      colors: ['#0f172a', '#3b82f6'],
      count: 2,
      vibrancy: 'normal',
      ratio: '16:9',
      includeShader: false,
      rendererSeed: 0.5,
    });
  };

  assert.equal(createConfigWithBlurRandom(0).blurStrength, 35);
  assert.equal(createConfigWithBlurRandom(0.999).blurStrength, 75);
});

test('rejects invalid random generation options', () => {
  let error;
  assert.throws(() => {
    try {
      createRandomGradientConfig({
        count: 7,
        vibrancy: 'electric',
        ratio: '4:3',
        includeShader: 'yes',
        includeNone: null,
        previousColors: ['#000000', '#111111', '#222222', '#333333', '#444444', '#555555', '#666666'],
        maxAttempts: 99,
      });
    } catch (caught) {
      error = caught;
      throw caught;
    }
  }, { name: 'ApiValidationError' });

  assert.deepEqual(error.errors.map(({ field }) => field), [
    'count',
    'vibrancy',
    'ratio',
    'includeShader',
    'includeNone',
    'previousColors',
    'maxAttempts',
  ]);
});

test('validates and normalizes gradient configs', () => {
  const config = createGradientConfig({
    colors: ['#abc', '#123456'],
    ratio: 'Web',
    seed: 0.25,
    blurStrength: 55,
    blendMode: 'dynamic',
  });

  assert.equal(config.colors[0], '#aabbcc');
  assert.equal(config.width, 1440);
  assert.equal(config.height, 900);

  const invalid = normalizeGradientConfig({ colors: ['nope'], width: 0, blendMode: 'bad' });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.length >= 3);
});

test('renders gradients as SVG and creates standalone HTML', () => {
  const config = createGradientConfig({
    colors: ['#0f172a', '#3b82f6', '#8b5cf6'],
    width: 320,
    height: 180,
    seed: 0.5,
    blendMode: 'source-over',
  });
  const svg = renderGradientAsSvg(config);
  const html = createGradientHtml(config);

  assert.match(svg, /^<svg/);
  assert.match(svg, /<path|<rect/);
  assert.match(html, /renderGradient/);
});

test('renders SVG blur filters and blend modes for richer configs', () => {
  const svg = renderGradientAsSvg({
    colors: ['#0f172a', '#3b82f6', '#8b5cf6'],
    width: 320,
    height: 180,
    seed: 0.5,
    isBlurred: true,
    blurStrength: 60,
    blendMode: 'screen',
  });

  assert.match(svg, /<filter id="hiro-blur-/);
  assert.match(svg, /<feGaussianBlur/);
  assert.match(svg, /mix-blend-mode:screen/);
});

test('escapes generated HTML metadata', () => {
  const html = createGradientHtml({
    colors: ['#0f172a', '#3b82f6'],
    width: 320,
    height: 180,
    ratioLabel: '<strong data-x="ratio">Ratio</strong>',
    activeShader: 'paper-texture',
    activePreset: 'Default <em data-x="preset">Preset</em>',
  });

  assert.match(html, /&lt;strong data-x=&quot;ratio&quot;&gt;Ratio&lt;\/strong&gt;/);
  assert.match(html, /paper-texture \(Default &lt;em data-x=&quot;preset&quot;&gt;Preset&lt;\/em&gt;\)/);
  assert.doesNotMatch(html, /<strong data-x="ratio">/);
  assert.doesNotMatch(html, /<em data-x="preset">/);
});

test('validates export dimensions and data URLs', () => {
  assert.deepEqual(validateExportDimensions({ width: 1920, height: 1080 }), {
    valid: true,
    errors: [],
  });
  assert.equal(validateExportDimensions({ width: 0, height: 1080 }).valid, false);
  assert.equal(validateExportDimensions({ width: 1920.5, height: 1080 }).valid, false);

  assert.equal(sanitizeExportSlug('16:9 <Hero>'), '16x9-hero');

  const bytes = dataUrlToBytes('data:image/png;base64,SGlybw==');
  assert.deepEqual([...bytes], [72, 105, 114, 111]);

  assert.throws(
    () => dataUrlToBytes('data:image/jpeg;base64,SGlybw=='),
    (error) => error instanceof ExportError && error.code === 'invalid_data_url_type',
  );
  assert.throws(
    () => dataUrlToBytes('not-a-data-url'),
    (error) => error instanceof ExportError && error.code === 'invalid_data_url',
  );
});

test('selects export image data without silently dropping shaders', () => {
  assert.equal(selectExportImageDataUrl({
    hasShader: false,
    displayedDataUrl: null,
    renderedDataUrl: 'data:image/png;base64,cmVuZGVyZWQ=',
    fallbackDataUrl: 'data:image/png;base64,ZmFsbGJhY2s=',
  }), 'data:image/png;base64,cmVuZGVyZWQ=');

  assert.equal(selectExportImageDataUrl({
    hasShader: true,
    displayedDataUrl: 'data:image/png;base64,c2hhZGVy',
    renderedDataUrl: 'data:image/png;base64,cmVuZGVyZWQ=',
    fallbackDataUrl: null,
  }), 'data:image/png;base64,c2hhZGVy');

  assert.throws(
    () => selectExportImageDataUrl({
      hasShader: true,
      displayedDataUrl: null,
      renderedDataUrl: 'data:image/png;base64,cmVuZGVyZWQ=',
      fallbackDataUrl: 'data:image/png;base64,ZmFsbGJhY2s=',
    }),
    (error) => error instanceof ExportError && error.code === 'shader_capture_unavailable',
  );
});

test('exposes metadata', () => {
  const metadata = listGradientMetadata();
  assert.equal(metadata.name, 'gradients');
  assert.ok(metadata.ratios.some((ratio) => ratio.label === '16:9'));
  assert.ok(metadata.shaderPresets['paper-texture'].length > 0);
});

test('OpenAPI spec mirrors runtime metadata', () => {
  const metadata = listGradientMetadata();
  const spec = buildOpenApiSpec();
  const gradientInput = spec.components.schemas.GradientConfigInput.properties;
  const randomInput = spec.components.schemas.RandomGradientInput.properties;

  assert.ok(spec.paths['/api/gradients/svg']);
  assert.deepEqual(gradientInput.blendMode.enum, metadata.canvasBlendModes);
  assert.deepEqual(gradientInput.activeShader.enum, metadata.shaders.map((shader) => shader.value));
  assert.deepEqual(randomInput.vibrancy.enum, metadata.vibrancy.map((option) => option.value));
  assert.equal(gradientInput.colors.minItems, metadata.limits.minColors);
  assert.equal(gradientInput.colors.maxItems, metadata.limits.maxColors);
  assert.equal(randomInput.previousColors.maxItems, metadata.limits.maxColors);
  assert.equal(randomInput.maxAttempts.minimum, 1);
  assert.equal(randomInput.maxAttempts.maximum, 12);
});

test('serves HTTP API routes', async () => {
  const server = createApiServer();
  const baseUrl = await listen(server);

  try {
    const options = await fetch(`${baseUrl}/api/gradients`, { method: 'OPTIONS' });
    assert.equal(options.status, 204);

    const health = await fetch(`${baseUrl}/api/health`);
    assert.equal(health.status, 200);
    assert.equal((await health.json()).ok, true);

    const random = await postJson(baseUrl, '/api/gradients/random', {
      seed: 'api',
      count: 3,
      includeShader: false,
    });
    assert.equal(random.status, 200);
    const randomJson = await random.json();
    assert.equal(randomJson.config.colors.length, 3);

    const validate = await postJson(baseUrl, '/api/gradients/validate', randomJson.config);
    assert.equal(validate.status, 200);
    assert.equal((await validate.json()).valid, true);

    const render = await postJson(baseUrl, '/api/gradients/render', randomJson.config);
    assert.equal(render.status, 200);
    assert.match(render.headers.get('content-type'), /image\/svg\+xml/);
    assert.match(await render.text(), /^<svg/);

    const svg = await postJson(baseUrl, '/api/gradients/svg', randomJson.config);
    assert.equal(svg.status, 200);
    assert.match(svg.headers.get('content-type'), /image\/svg\+xml/);
    assert.match(await svg.text(), /^<svg/);

    const html = await postJson(baseUrl, '/api/gradients/html', randomJson.config);
    assert.equal(html.status, 200);
    assert.match(html.headers.get('content-type'), /text\/html/);
    assert.match(await html.text(), /^<!DOCTYPE html>/);

    const react = await postJson(baseUrl, '/api/gradients/react', {
      ...randomJson.config,
      activeShader: 'paper-texture',
      activePreset: 'Default',
    });
    assert.equal(react.status, 200);
    assert.match((await react.json()).code, /PaperTexture/);

    const invalid = await postJson(baseUrl, '/api/gradients', { colors: ['bad'] });
    assert.equal(invalid.status, 400);

    const invalidRandom = await postJson(baseUrl, '/api/gradients/random', { maxAttempts: 100 });
    assert.equal(invalidRandom.status, 400);
    assert.equal((await invalidRandom.json()).error, 'validation_error');

    const missing = await fetch(`${baseUrl}/api/missing`);
    assert.equal(missing.status, 404);

    const openapi = await fetch(`${baseUrl}/api/openapi.json`);
    assert.equal(openapi.status, 200);
    assert.equal((await openapi.json()).openapi, '3.1.0');
  } finally {
    await close(server);
  }
});

test('returns structured JSON for malformed and oversized bodies', async () => {
  const server = createApiServer();
  const baseUrl = await listen(server);

  try {
    const malformed = await postRaw(baseUrl, '/api/gradients', '{"colors":[');
    assert.equal(malformed.status, 400);
    assert.deepEqual(await malformed.json(), {
      error: 'validation_error',
      message: 'Invalid gradient API request',
      errors: [{ field: 'body', message: 'Request body must be valid JSON.' }],
    });

    const oversized = await postRaw(baseUrl, '/api/gradients', JSON.stringify({ padding: 'x'.repeat(1_000_000) }));
    assert.equal(oversized.status, 413);
    assert.deepEqual(await oversized.json(), {
      error: 'validation_error',
      message: 'Invalid gradient API request',
      errors: [{ field: 'body', message: 'Request body is too large.' }],
    });

    const health = await fetch(`${baseUrl}/api/health`);
    assert.equal(health.status, 200);
  } finally {
    await close(server);
  }
});
