import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { 
  PaperTexture, paperTexturePresets,
  FlutedGlass, flutedGlassPresets,
  Water, waterPresets,
  ImageDithering, imageDitheringPresets,
  HalftoneDots, halftoneDotsPresets,
  HalftoneCmyk, halftoneCmykPresets
} from '@paper-design/shaders-react';

const SHADER_COMPONENTS = {
  'paper-texture': { Component: PaperTexture, presets: paperTexturePresets.filter(p => p.name !== 'Cardboard' && p.name !== 'Details') },
  'fluted-glass': { Component: FlutedGlass, presets: flutedGlassPresets.filter(p => p.name !== 'Abstract' && p.name !== 'Folds') },
  'water': { Component: Water, presets: waterPresets },
  'image-dithering': { Component: ImageDithering, presets: imageDitheringPresets.filter(p => p.name !== 'Default' && p.name !== 'Noise' && p.name !== 'Retro') },
  'halftone-dots': { Component: HalftoneDots, presets: halftoneDotsPresets.filter(p => p.name !== 'Default' && p.name !== 'LED screen' && p.name !== 'Round and square') },
  'halftone-cmyk': { Component: HalftoneCmyk, presets: halftoneCmykPresets.filter(p => p.name !== 'Newspaper' && p.name !== 'Drops') }
};

const ShaderPreview = forwardRef(({ shaderType, presetName, imageUrl, width, height }, ref) => {
  const shaderElementRef = useRef(null);

  // Expose export function to parent
  useImperativeHandle(ref, () => ({
    exportToDataURL: () => {
      const element = shaderElementRef.current;
      const canvas = element?.paperShaderMount?.canvasElement;
      if (!canvas) return null;
      return canvas.toDataURL('image/png');
    }
  }));

  const shaderConfig = SHADER_COMPONENTS[shaderType];
  if (!shaderConfig) return null;

  const { Component, presets } = shaderConfig;
  const preset = presets.find(p => p.name === presetName) || presets[0];

  // For all water presets besides slow-mo, and all fluted glass presets, scale up/zoom in to hide distortion edges
  const isWaterOverlay = shaderType === 'water' && presetName !== 'Slow-mo';
  const isFlutedGlass = shaderType === 'fluted-glass';
  const shaderScale = (isWaterOverlay || isFlutedGlass) ? 1.25 : 1;

  // For the default fluted glass, scale up the glass pattern (rib width) 3.0x (from 0.5 to 1.5)
  const isDefaultFlutedGlass = shaderType === 'fluted-glass' && (presetName === 'Default' || !presetName);

  // Visual scaling logic (matches GradientCanvas)
  const renderScale = Math.min(1, 800 / Math.max(width, height));

  return (
    <div 
      className="canvas-wrapper"
      style={{
        width: `${width * renderScale}px`,
        height: `${height * renderScale}px`
      }}
    >
      {imageUrl ? (
        <div
          style={{
            width: `${width}px`,
            height: `${height}px`,
            transform: `scale(${renderScale})`,
            transformOrigin: 'top left',
            position: 'absolute',
            top: 0,
            left: 0
          }}
        >
          <Component
            ref={shaderElementRef}
            image={imageUrl}
            width={width}
            height={height}
            {...(preset?.params || {})}
            fit="cover"
            scale={shaderScale}
            {...(isDefaultFlutedGlass ? { size: 1.5 } : {})}
            style={{ width: '100%', height: '100%', display: 'block' }}
          />
        </div>
      ) : (
        <div style={{ width: '100%', height: '100%', background: 'var(--bg-sidebar)' }} />
      )}
    </div>
  );
});

export default ShaderPreview;
