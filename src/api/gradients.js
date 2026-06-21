import {
  API_VERSION,
  BLEND_MODES,
  CANVAS_BLEND_MODES,
  DEFAULT_GRADIENT_CONFIG,
  LIMITS,
  RATIOS,
  VIBRANCY_OPTIONS,
} from './constants.js';
import { generateDifferentPalette, generateRandomPalette } from './palettes.js';
import { createSeededRandom, randomChoice, randomInt } from './random.js';
import {
  SHADER_OPTIONS,
  getShaderPreset,
  listShaderPresetMetadata,
  pickRandomShaderSelection,
} from './shaders.js';
import { buildReactShaderSnippet, generateReplicationHtml } from './snippets.js';
import { renderGradientToSvg } from './svgRenderer.js';
import {
  RANDOM_MAX_ATTEMPTS,
  createGradientConfig,
  validateRandomGradientOptions,
  validateVibrancy,
} from './validation.js';

function resolveRandom(randomOrSeed) {
  if (typeof randomOrSeed === 'function') return randomOrSeed;
  if (typeof randomOrSeed === 'undefined' || randomOrSeed === null) return Math.random;
  return createSeededRandom(randomOrSeed);
}

function resolveRatio(value, random) {
  if (value === 'random') return randomChoice(RATIOS, random);
  if (value) return RATIOS.find((ratio) => ratio.label === value) ?? RATIOS[0];
  return RATIOS[0];
}

export function listGradientMetadata() {
  return {
    name: 'gradients',
    version: API_VERSION,
    limits: LIMITS,
    ratios: RATIOS,
    blendModes: BLEND_MODES,
    canvasBlendModes: CANVAS_BLEND_MODES,
    vibrancy: VIBRANCY_OPTIONS,
    shaders: SHADER_OPTIONS,
    shaderPresets: listShaderPresetMetadata(),
    defaults: DEFAULT_GRADIENT_CONFIG,
  };
}

export function createRandomGradientConfig(options = {}) {
  options = validateRandomGradientOptions(options);
  const random = resolveRandom(options.random ?? options.seed);
  const fallbackCount = randomInt(LIMITS.minColors, LIMITS.maxColors, random);
  const requestedCount = Number(options.count ?? fallbackCount);
  const count = Math.min(
    LIMITS.maxColors,
    Math.max(LIMITS.minColors, Number.isFinite(requestedCount) ? Math.round(requestedCount) : fallbackCount),
  );
  const vibrancy = validateVibrancy(options.vibrancy) ? options.vibrancy : randomChoice(VIBRANCY_OPTIONS, random).value;
  const ratio = resolveRatio(options.ratio ?? options.ratioLabel, random);
  const shaderSelection = options.includeShader === false
    ? { shader: 'none', preset: '', presetParams: {} }
    : pickRandomShaderSelection(random, { includeNone: options.includeNone !== false });
  const colors = Array.isArray(options.colors)
    ? options.colors
    : options.previousColors
      ? generateDifferentPalette(
        count,
        vibrancy,
        options.previousColors,
        options.maxAttempts ?? RANDOM_MAX_ATTEMPTS.default,
        random,
      )
      : generateRandomPalette(count, vibrancy, random);
  const preset = getShaderPreset(shaderSelection.shader, shaderSelection.preset);

  return createGradientConfig({
    colors,
    width: options.width ?? ratio.width,
    height: options.height ?? ratio.height,
    ratioLabel: ratio.label,
    seed: options.rendererSeed ?? random(),
    isBlurred: options.isBlurred ?? true,
    blurStrength: options.blurStrength ?? randomInt(50, 75, random),
    blendMode: options.blendMode ?? randomChoice(BLEND_MODES, random).value,
    showRing: options.showRing ?? false,
    activeShader: options.activeShader ?? shaderSelection.shader,
    activePreset: options.activePreset ?? shaderSelection.preset,
    presetParams: options.presetParams ?? preset?.params ?? shaderSelection.presetParams,
  });
}

export function renderGradientAsSvg(config) {
  return renderGradientToSvg(config);
}

export function createGradientHtml(config, options) {
  return generateReplicationHtml(createGradientConfig(config), options);
}

export function createGradientReactSnippet(config) {
  const normalized = createGradientConfig(config);
  return buildReactShaderSnippet(normalized);
}

export { createGradientConfig };
