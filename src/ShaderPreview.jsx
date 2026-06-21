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
  'water': { Component: Water, presets: waterPresets.filter(p => p.name !== 'Slow-mo' && p.name !== 'Abstract') },
  'image-dithering': { Component: ImageDithering, presets: imageDitheringPresets.filter(p => p.name !== 'Default' && p.name !== 'Noise' && p.name !== 'Retro') },
  'halftone-dots': { Component: HalftoneDots, presets: halftoneDotsPresets.filter(p => p.name !== 'Default' && p.name !== 'LED screen' && p.name !== 'Round and square') },
  'halftone-cmyk': { Component: HalftoneCmyk, presets: halftoneCmykPresets.filter(p => p.name !== 'Newspaper' && p.name !== 'Drops') }
};

const ShaderPreview = forwardRef(({ shaderType, presetName, imageUrl, width, height, zoom = 1, containerHeight }, ref) => {
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

  // For water, fluted glass, and paper texture presets, scale up/zoom in to hide distortion edges
  const isWaterOverlay = shaderType === 'water';
  const isFlutedGlass = shaderType === 'fluted-glass';
  const isPaperTexture = shaderType === 'paper-texture';
  const shaderScale = (isWaterOverlay || isFlutedGlass) ? 1.25 : (isPaperTexture ? 1.15 : 1);

  // For the default fluted glass, scale up the glass pattern (rib width) by setting size to 0.92 (default is 0.5)
  const isDefaultFlutedGlass = shaderType === 'fluted-glass' && (presetName === 'Default' || !presetName);

  // For the default paper texture, use custom parameters
  const isDefaultPaperTexture = shaderType === 'paper-texture' && (presetName === 'Default' || !presetName);

  // Visual scaling logic (matches GradientCanvas)
  const activeContainerHeight = containerHeight || 600;
  const renderScale = (activeContainerHeight / height) * zoom;

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
            key={imageUrl}
            ref={shaderElementRef}
            image={imageUrl}
            width={width}
            height={height}
            {...(preset?.params || {})}
            fit="cover"
            scale={shaderScale}
            {...(isDefaultFlutedGlass ? { size: 0.92, shift: -0.18, scale: shaderScale * 1.1 } : {})}
            {...(isDefaultPaperTexture ? {
              colorBack: '#ffffff',
              colorFront: '#ffffff',
              contrast: 0.08,
              roughness: 0,
              fiber: 0.08,
              fiberSize: 0.15,
              crumples: 0.05,
              crumpleSize: 0.1,
              folds: 0,
              foldCount: 1,
              drops: 0,
              fade: 0.4,
              seed: 0
            } : {})}
            style={{ 
              width: '100%', 
              height: '100%', 
              display: 'block',
              filter: shaderType === 'paper-texture' ? 'contrast(1.25) saturate(1.25) brightness(1.05)' : 'none'
            }}
          />
        </div>
      ) : (
        <div style={{ width: '100%', height: '100%', background: 'var(--bg-sidebar)' }} />
      )}
    </div>
  );
});

export default ShaderPreview;
