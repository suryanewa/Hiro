export const API_VERSION = '1.0.0';

export const DEFAULT_COLORS = Object.freeze(['#0f172a', '#3b82f6', '#8b5cf6', '#000000']);

export const RATIOS = Object.freeze([
  { label: '16:9', width: 1920, height: 1080 },
  { label: '1:1', width: 1080, height: 1080 },
  { label: '9:16', width: 1080, height: 1920 },
  { label: 'Web', width: 1440, height: 900 },
]);

export const BLEND_MODES = Object.freeze([
  { label: 'Normal', value: 'source-over' },
  { label: 'Dynamic', value: 'dynamic' },
  { label: 'Screen', value: 'screen' },
  { label: 'Multiply', value: 'multiply' },
  { label: 'Overlay', value: 'overlay' },
  { label: 'Color Dodge', value: 'color-dodge' },
  { label: 'Exclusion', value: 'exclusion' },
]);

export const CANVAS_BLEND_MODES = Object.freeze([
  'source-over',
  'dynamic',
  'screen',
  'overlay',
  'color-dodge',
  'exclusion',
  'multiply',
  'soft-light',
]);

export const VIBRANCY_OPTIONS = Object.freeze([
  { label: 'Subtle', value: 'subtle' },
  { label: 'Normal', value: 'normal' },
  { label: 'Vibrant', value: 'vibrant' },
]);

export const DEFAULT_GRADIENT_CONFIG = Object.freeze({
  colors: DEFAULT_COLORS,
  width: 1920,
  height: 1080,
  ratioLabel: '16:9',
  seed: 0.5,
  isBlurred: true,
  blurStrength: 100,
  blendMode: 'source-over',
  showRing: false,
  frameThickness: 12,
  activeShader: 'none',
  activePreset: '',
  presetParams: {},
});

export const LIMITS = Object.freeze({
  minColors: 2,
  maxColors: 6,
  minDimension: 1,
  maxDimension: 8192,
  minBlurStrength: 0,
  maxBlurStrength: 100,
  minFrameThickness: 2,
  maxFrameThickness: 24,
});
