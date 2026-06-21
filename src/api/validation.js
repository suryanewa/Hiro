import {
  CANVAS_BLEND_MODES,
  DEFAULT_GRADIENT_CONFIG,
  LIMITS,
  RATIOS,
  VIBRANCY_OPTIONS,
} from './constants.js';
import { SHADER_VALUES, getShaderPreset } from './shaders.js';

const HEX_COLOR_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const BLEND_MODE_VALUES = new Set(CANVAS_BLEND_MODES);
const VIBRANCY_VALUES = new Set(VIBRANCY_OPTIONS.map((option) => option.value));
const SHADER_VALUE_SET = new Set(SHADER_VALUES);
const RANDOM_RATIO_VALUES = new Set(['random', ...RATIOS.map((ratio) => ratio.label)]);

export const RANDOM_MAX_ATTEMPTS = Object.freeze({
  min: 1,
  max: 12,
  default: 6,
});

export class ApiValidationError extends Error {
  constructor(errors, status = 400) {
    super('Invalid gradient API request');
    this.name = 'ApiValidationError';
    this.status = status;
    this.errors = errors;
  }
}

export function isHexColor(value) {
  return typeof value === 'string' && HEX_COLOR_RE.test(value);
}

export function normalizeHexColor(value) {
  if (!isHexColor(value)) return null;
  const hex = value.toLowerCase();
  if (hex.length === 4) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  return hex;
}

export function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function parseNumber(value, field, errors) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    errors.push({ field, message: `${field} must be a finite number.` });
    return null;
  }
  return number;
}

function parseInteger(value, field, errors) {
  const number = parseNumber(value, field, errors);
  if (number === null) return null;
  if (!Number.isInteger(number)) {
    errors.push({ field, message: `${field} must be an integer.` });
    return null;
  }
  return number;
}

function parseBoolean(value, field, errors, fallback) {
  if (typeof value === 'undefined') return fallback;
  if (typeof value === 'boolean') return value;
  errors.push({ field, message: `${field} must be a boolean.` });
  return fallback;
}

function resolveRatio(input) {
  const requested = input.ratioLabel ?? input.ratio;
  if (!requested) return null;
  return RATIOS.find((ratio) => ratio.label === requested) ?? null;
}

function normalizeColors(input, errors) {
  const colors = Array.isArray(input.colors) ? input.colors : DEFAULT_GRADIENT_CONFIG.colors;

  if (!Array.isArray(input.colors) && typeof input.colors !== 'undefined') {
    errors.push({ field: 'colors', message: 'colors must be an array of hex strings.' });
  }

  if (colors.length < LIMITS.minColors || colors.length > LIMITS.maxColors) {
    errors.push({
      field: 'colors',
      message: `colors must contain between ${LIMITS.minColors} and ${LIMITS.maxColors} values.`,
    });
  }

  return colors.map((color, index) => {
    const normalized = normalizeHexColor(color);
    if (!normalized) {
      errors.push({ field: `colors.${index}`, message: 'Color must be a #rgb or #rrggbb hex string.' });
      return DEFAULT_GRADIENT_CONFIG.colors[index] ?? '#000000';
    }
    return normalized;
  });
}

function normalizeDimension(input, field, fallback, errors) {
  if (typeof input[field] === 'undefined') return fallback;
  const value = parseInteger(input[field], field, errors);
  if (value === null) return fallback;

  if (value < LIMITS.minDimension || value > LIMITS.maxDimension) {
    errors.push({
      field,
      message: `${field} must be between ${LIMITS.minDimension} and ${LIMITS.maxDimension}.`,
    });
    return clampNumber(value, LIMITS.minDimension, LIMITS.maxDimension);
  }

  return value;
}

function normalizeShader(input, errors) {
  const activeShader = input.activeShader ?? input.shader ?? DEFAULT_GRADIENT_CONFIG.activeShader;
  if (!SHADER_VALUE_SET.has(activeShader)) {
    errors.push({ field: 'activeShader', message: `activeShader must be one of: ${SHADER_VALUES.join(', ')}.` });
    return {
      activeShader: DEFAULT_GRADIENT_CONFIG.activeShader,
      activePreset: DEFAULT_GRADIENT_CONFIG.activePreset,
      presetParams: DEFAULT_GRADIENT_CONFIG.presetParams,
    };
  }

  if (activeShader === 'none') {
    return {
      activeShader: 'none',
      activePreset: '',
      presetParams: {},
    };
  }

  const activePreset = String(input.activePreset ?? input.preset ?? '');
  const preset = getShaderPreset(activeShader, activePreset);
  const presetParams = isPlainObject(input.presetParams)
    ? input.presetParams
    : preset?.params ?? {};

  if (typeof input.presetParams !== 'undefined' && !isPlainObject(input.presetParams)) {
    errors.push({ field: 'presetParams', message: 'presetParams must be an object when provided.' });
  }

  return {
    activeShader,
    activePreset: activePreset || preset?.name || '',
    presetParams,
  };
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasOwnValue(input, field) {
  return Object.prototype.hasOwnProperty.call(input, field) && typeof input[field] !== 'undefined';
}

function validateIntegerRange(input, field, min, max, errors) {
  if (!hasOwnValue(input, field)) return null;
  const value = input[field];

  if (typeof value !== 'number' || !Number.isInteger(value)) {
    errors.push({ field, message: `${field} must be an integer.` });
    return null;
  }

  if (value < min || value > max) {
    errors.push({ field, message: `${field} must be between ${min} and ${max}.` });
    return null;
  }

  return value;
}

export function validateVibrancy(value) {
  return VIBRANCY_VALUES.has(value);
}

export function normalizeGradientConfig(input = {}) {
  const source = isPlainObject(input) ? input : {};
  const errors = [];
  const ratio = resolveRatio(source);
  const fallbackWidth = ratio?.width ?? DEFAULT_GRADIENT_CONFIG.width;
  const fallbackHeight = ratio?.height ?? DEFAULT_GRADIENT_CONFIG.height;
  const seed = typeof source.seed === 'undefined'
    ? DEFAULT_GRADIENT_CONFIG.seed
    : parseNumber(source.seed, 'seed', errors);
  const blurStrength = typeof source.blurStrength === 'undefined'
    ? DEFAULT_GRADIENT_CONFIG.blurStrength
    : parseNumber(source.blurStrength, 'blurStrength', errors);
  const blendMode = source.blendMode ?? DEFAULT_GRADIENT_CONFIG.blendMode;

  if (!isPlainObject(input)) {
    errors.push({ field: 'body', message: 'Request body must be an object.' });
  }

  if (!BLEND_MODE_VALUES.has(blendMode)) {
    errors.push({ field: 'blendMode', message: `blendMode must be one of: ${CANVAS_BLEND_MODES.join(', ')}.` });
  }

  if (typeof source.ratio !== 'undefined' && !ratio) {
    errors.push({
      field: 'ratio',
      message: `ratio must be one of: ${RATIOS.map((item) => item.label).join(', ')}.`,
    });
  }

  if (blurStrength !== null && (blurStrength < LIMITS.minBlurStrength || blurStrength > LIMITS.maxBlurStrength)) {
    errors.push({
      field: 'blurStrength',
      message: `blurStrength must be between ${LIMITS.minBlurStrength} and ${LIMITS.maxBlurStrength}.`,
    });
  }

  const shader = normalizeShader(source, errors);
  const width = normalizeDimension(source, 'width', fallbackWidth, errors);
  const height = normalizeDimension(source, 'height', fallbackHeight, errors);
  const config = {
    colors: normalizeColors(source, errors),
    width,
    height,
    ratioLabel: ratio?.label ?? source.ratioLabel ?? source.ratio ?? `${width}x${height}`,
    seed: seed ?? DEFAULT_GRADIENT_CONFIG.seed,
    isBlurred: parseBoolean(source.isBlurred, 'isBlurred', errors, DEFAULT_GRADIENT_CONFIG.isBlurred),
    blurStrength: blurStrength === null
      ? DEFAULT_GRADIENT_CONFIG.blurStrength
      : clampNumber(blurStrength, LIMITS.minBlurStrength, LIMITS.maxBlurStrength),
    blendMode: BLEND_MODE_VALUES.has(blendMode) ? blendMode : DEFAULT_GRADIENT_CONFIG.blendMode,
    showRing: parseBoolean(source.showRing, 'showRing', errors, DEFAULT_GRADIENT_CONFIG.showRing),
    ...shader,
  };

  return {
    valid: errors.length === 0,
    errors,
    config,
  };
}

export function createGradientConfig(input = {}) {
  const result = normalizeGradientConfig(input);
  if (!result.valid) {
    throw new ApiValidationError(result.errors);
  }
  return result.config;
}

export function validateRandomGradientOptions(input = {}) {
  const source = typeof input === 'undefined' ? {} : input;
  const errors = [];

  if (!isPlainObject(source)) {
    throw new ApiValidationError([{ field: 'body', message: 'Request body must be an object.' }]);
  }

  const options = { ...source };
  const count = validateIntegerRange(source, 'count', LIMITS.minColors, LIMITS.maxColors, errors);
  if (count !== null) {
    options.count = count;
  }

  if (hasOwnValue(source, 'vibrancy') && !VIBRANCY_VALUES.has(source.vibrancy)) {
    errors.push({
      field: 'vibrancy',
      message: `vibrancy must be one of: ${VIBRANCY_OPTIONS.map((option) => option.value).join(', ')}.`,
    });
  }

  for (const field of ['ratio', 'ratioLabel']) {
    if (hasOwnValue(source, field) && !RANDOM_RATIO_VALUES.has(source[field])) {
      errors.push({
        field,
        message: `${field} must be one of: ${Array.from(RANDOM_RATIO_VALUES).join(', ')}.`,
      });
    }
  }

  for (const field of ['includeShader', 'includeNone']) {
    if (hasOwnValue(source, field) && typeof source[field] !== 'boolean') {
      errors.push({ field, message: `${field} must be a boolean.` });
    }
  }

  if (hasOwnValue(source, 'previousColors')) {
    if (!Array.isArray(source.previousColors)) {
      errors.push({ field: 'previousColors', message: 'previousColors must be an array of hex strings.' });
    } else if (source.previousColors.length > LIMITS.maxColors) {
      errors.push({
        field: 'previousColors',
        message: `previousColors must contain no more than ${LIMITS.maxColors} values.`,
      });
    } else {
      options.previousColors = source.previousColors.map((color, index) => {
        const normalized = normalizeHexColor(color);
        if (!normalized) {
          errors.push({
            field: `previousColors.${index}`,
            message: 'Color must be a #rgb or #rrggbb hex string.',
          });
          return color;
        }
        return normalized;
      });
    }
  }

  const maxAttempts = validateIntegerRange(
    source,
    'maxAttempts',
    RANDOM_MAX_ATTEMPTS.min,
    RANDOM_MAX_ATTEMPTS.max,
    errors,
  );
  if (maxAttempts !== null) {
    options.maxAttempts = maxAttempts;
  }

  if (errors.length > 0) {
    throw new ApiValidationError(errors);
  }

  return options;
}
