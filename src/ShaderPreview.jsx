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
  'paper-texture': { Component: PaperTexture, presets: paperTexturePresets },
  'fluted-glass': { Component: FlutedGlass, presets: flutedGlassPresets },
  'water': { Component: Water, presets: waterPresets },
  'image-dithering': { Component: ImageDithering, presets: imageDitheringPresets },
  'halftone-dots': { Component: HalftoneDots, presets: halftoneDotsPresets },
  'halftone-cmyk': { Component: HalftoneCmyk, presets: halftoneCmykPresets }
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
            scale={1}
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
