import { zipSync } from 'fflate';
import { buildReactShaderSnippet, generateReplicationHtml } from './api/snippets.js';
import { renderGradient } from './gradientRenderer';
import gradientRendererSource from './gradientRenderer.js?raw';

export function renderGradientToDataUrl(options) {
  const canvas = document.createElement('canvas');
  canvas.width = options.width;
  canvas.height = options.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  renderGradient(ctx, options);
  return canvas.toDataURL('image/png');
}

function dataUrlToBytes(dataUrl) {
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function textToBytes(text) {
  return new TextEncoder().encode(text);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function buildExportBaseName(ratioLabel) {
  const ratioSlug = ratioLabel.replace(':', 'x').toLowerCase();
  return `hiro-${ratioSlug}-${Date.now()}`;
}

function buildReadme(config) {
  const { ratioLabel, width, height, activeShader, activePreset, pngFilename, htmlFilename } = config;
  const hasShader = activeShader && activeShader !== 'none';

  const lines = [
    'Hiro Export',
    '===========',
    '',
    `Aspect ratio: ${ratioLabel} (${width}×${height})`,
    '',
    'Files:',
    `- ${pngFilename} — rendered background at export resolution`,
    `- ${htmlFilename} — open in a browser to use the background on the web`,
  ];

  if (hasShader) {
    lines.push(
      '- gradientRenderer.js — canvas gradient generator (base layer)',
      '- GradientBackground.jsx — React component with live shader overlay',
      '',
      `Shader: ${activeShader}${activePreset ? ` (${activePreset})` : ''}`,
      '',
      'The HTML file references the PNG (same folder) to show the shader effect.',
      'Shaders require React and @paper-design/shaders-react — see GradientBackground.jsx.',
    );
  } else {
    lines.push(
      '',
      'The HTML file renders the gradient parametrically in a canvas (no dependencies).',
    );
  }

  return lines.join('\n');
}

export function exportBackground({
  colors,
  seed,
  width,
  height,
  ratioLabel,
  isBlurred,
  blurStrength,
  blendMode,
  showRing,
  activeShader,
  activePreset,
  presetParams,
  getDisplayedDataUrl,
  gradientDataUrl,
}) {
  const baseName = buildExportBaseName(ratioLabel);
  const pngFilename = `${baseName}.png`;
  const htmlFilename = `${baseName}.html`;
  const hasShader = activeShader && activeShader !== 'none';

  let pngDataUrl = getDisplayedDataUrl?.() ?? null;

  if (!pngDataUrl) {
    pngDataUrl = renderGradientToDataUrl({
      colors,
      width,
      height,
      seed,
      isBlurred,
      blurStrength,
      blendMode,
      showRing,
    });
  }

  if (!pngDataUrl && gradientDataUrl) {
    pngDataUrl = gradientDataUrl;
  }

  if (!pngDataUrl) return false;

  const html = generateReplicationHtml({
    colors,
    seed,
    width,
    height,
    ratioLabel,
    isBlurred,
    blurStrength,
    blendMode,
    showRing,
    activeShader,
    activePreset,
    presetParams,
    pngFilename,
    pngDataUrl,
  }, { rendererSource: gradientRendererSource });

  const zipEntries = {
    [pngFilename]: dataUrlToBytes(pngDataUrl),
    [htmlFilename]: textToBytes(html),
    'README.txt': textToBytes(buildReadme({
      ratioLabel,
      width,
      height,
      activeShader,
      activePreset,
      pngFilename,
      htmlFilename,
    })),
  };

  if (hasShader) {
    zipEntries['gradientRenderer.js'] = textToBytes(gradientRendererSource);
    zipEntries['GradientBackground.jsx'] = textToBytes(
      buildReactShaderSnippet({
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
        presetParams: presetParams || {},
      })
    );
  }

  const zipped = zipSync(zipEntries);
  downloadBlob(new Blob([zipped], { type: 'application/zip' }), `${baseName}.zip`);

  return true;
}
