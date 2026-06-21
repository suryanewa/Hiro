import { renderGradient } from '../gradientRenderer.js';

const SHADER_REACT_COMPONENTS = {
  'paper-texture': 'PaperTexture',
  'fluted-glass': 'FlutedGlass',
  water: 'Water',
  'image-dithering': 'ImageDithering',
  'halftone-dots': 'HalftoneDots',
  'halftone-cmyk': 'HalftoneCmyk',
};

function escapeHtmlMetadata(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeCssString(value) {
  return String(value)
    .replaceAll('\\', '\\\\')
    .replaceAll("'", "\\'")
    .replaceAll('\n', '\\A ')
    .replaceAll('\r', '\\D ')
    .replaceAll('\f', '\\C ')
    .replaceAll('<', '\\3C ')
    .replaceAll('>', '\\3E ');
}

function getShaderScale(shaderType) {
  if (shaderType === 'water' || shaderType === 'fluted-glass') return 1.25;
  if (shaderType === 'paper-texture') return 1.15;
  return 1;
}

export function getShaderExtraProps(shaderType, presetName, presetParams = {}) {
  const shaderScale = getShaderScale(shaderType);
  const props = {
    fit: 'cover',
    scale: shaderScale,
    ...presetParams,
  };

  if (shaderType === 'fluted-glass' && (presetName === 'Default' || !presetName)) {
    props.size = 0.92;
    props.shift = -0.18;
    props.scale = shaderScale * 1.1;
  }

  if (shaderType === 'paper-texture' && (presetName === 'Default' || !presetName)) {
    Object.assign(props, {
      colorBack: '#ffffff',
      colorFront: '#ffffff',
      contrast: 0.18,
      roughness: 0,
      fiber: 0.16,
      fiberSize: 0.15,
      crumples: 0.10,
      crumpleSize: 0.1,
      folds: 0,
      foldCount: 1,
      drops: 0,
      fade: 0.4,
      seed: 0,
    });
  }

  return props;
}

export function buildReactShaderSnippet(config) {
  const { activeShader, activePreset, presetParams, width, height } = config;
  const componentName = SHADER_REACT_COMPONENTS[activeShader];
  const shaderProps = getShaderExtraProps(activeShader, activePreset, presetParams);
  const paperTextureFilter = activeShader === 'paper-texture'
    ? "filter: 'contrast(1.25) saturate(1.25) brightness(1.05)',"
    : '';

  if (!componentName) {
    return '';
  }

  return `import { useEffect, useRef, useState } from 'react';
import { ${componentName} } from '@paper-design/shaders-react';
import { renderGradient } from './gradientRenderer';

const CONFIG = ${JSON.stringify({
    colors: config.colors,
    seed: config.seed,
    isBlurred: config.isBlurred,
    blurStrength: config.blurStrength,
    blendMode: config.blendMode,
    showRing: config.showRing,
    width,
    height,
  }, null, 2)};

const SHADER_PROPS = ${JSON.stringify(shaderProps, null, 2)};

export default function GradientBackground() {
  const canvasRef = useRef(null);
  const [gradientUrl, setGradientUrl] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = CONFIG.width;
    canvas.height = CONFIG.height;
    renderGradient(canvas.getContext('2d'), CONFIG);
    setGradientUrl(canvas.toDataURL('image/png'));
  }, []);

  if (!gradientUrl) {
    return <canvas ref={canvasRef} width={CONFIG.width} height={CONFIG.height} style={{ display: 'none' }} />;
  }

  return (
    <${componentName}
      image={gradientUrl}
      width={CONFIG.width}
      height={CONFIG.height}
      {...SHADER_PROPS}
      style={{
        width: '100vw',
        height: '100vh',
        display: 'block',
        objectFit: 'cover',
        ${paperTextureFilter}
      }}
    />
  );
}`;
}

export function buildStandaloneRendererScript(rendererSource) {
  if (rendererSource) {
    return rendererSource.replace(/^export function renderGradient/m, 'function renderGradient');
  }
  return renderGradient.toString();
}

export function generateReplicationHtml(config, { rendererSource } = {}) {
  const {
    colors,
    seed,
    width,
    height,
    isBlurred,
    blurStrength,
    blendMode,
    showRing,
    activeShader,
    activePreset,
    pngFilename = 'hiro-gradient.png',
    ratioLabel = `${width}x${height}`,
  } = config;

  const gradientConfig = {
    colors,
    seed,
    isBlurred,
    blurStrength,
    blendMode,
    showRing,
  };
  const hasShader = activeShader && activeShader !== 'none';
  const shaderLabel = hasShader
    ? `${activeShader}${activePreset ? ` (${activePreset})` : ''}`
    : null;
  const safeRatioLabel = escapeHtmlMetadata(ratioLabel);
  const safeSizeLabel = escapeHtmlMetadata(`${width}x${height}`);
  const safeShaderLabel = shaderLabel ? escapeHtmlMetadata(shaderLabel) : null;
  const safePngFilename = escapeCssString(pngFilename);

  if (hasShader) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Hiro Background - ${safeRatioLabel} (${safeSizeLabel})</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
    .background {
      position: fixed;
      inset: 0;
      background: center / cover no-repeat url('${safePngFilename}');
    }
  </style>
</head>
<body>
  <!--
    Shader: ${safeShaderLabel}
    This page uses the exported PNG (${safeSizeLabel}) which includes the shader effect.
    For a live, parametric version with the same shader, use GradientBackground.jsx
    and gradientRenderer.js from this export bundle.
  -->
  <div class="background" role="img" aria-label="Hiro background with ${safeShaderLabel} shader"></div>
</body>
</html>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Hiro Background - ${safeRatioLabel} (${safeSizeLabel})</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
    canvas {
      display: block;
      width: 100vw;
      height: 100vh;
      object-fit: cover;
    }
  </style>
</head>
<body>
  <canvas id="background" aria-hidden="true"></canvas>
  <script>
${buildStandaloneRendererScript(rendererSource)}

    const CONFIG = ${JSON.stringify(gradientConfig, null, 4)};

    function drawBackground() {
      const canvas = document.getElementById('background');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      renderGradient(canvas.getContext('2d'), {
        ...CONFIG,
        width: canvas.width,
        height: canvas.height,
      });
    }

    drawBackground();
    window.addEventListener('resize', drawBackground);
  </script>
</body>
</html>`;
}
