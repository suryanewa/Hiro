import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { motion } from 'framer-motion';
import { renderGradient } from './gradientRenderer';
import { renderGradientToDataUrl } from './exportBackground';

const RATIO_TRANSITION = { type: 'spring', stiffness: 380, damping: 32 };
const RAPID_PREVIEW_MAX_DIMENSION = 960;
const BLUR_SCRUB_PREVIEW_MAX_DIMENSION = 720;

const GradientCanvas = forwardRef(({
  colors,
  width,
  height,
  seed,
  glassIntensity = 0.1,
  isBlurred = true,
  blurStrength = 100,
  blendMode = 'dynamic',
  onRender,
  zoom = 1,
  containerHeight,
  showRing,
  previewMaxDimension = null,
  coalesceRenders = false,
  captureForShader = true,
  renderGeneration = 0,
  latestGenerationRef,
}, ref) => {
  const canvasRef = useRef(null);
  const frameRef = useRef(null);
  const renderParamsRef = useRef({});
  const previewMaxDimensionRef = useRef(previewMaxDimension);
  const coalesceRendersRef = useRef(coalesceRenders);
  const captureForShaderRef = useRef(captureForShader);

  previewMaxDimensionRef.current = previewMaxDimension;
  coalesceRendersRef.current = coalesceRenders;
  captureForShaderRef.current = captureForShader;

  renderParamsRef.current = {
    colors,
    width,
    height,
    seed,
    isBlurred,
    blurStrength,
    blendMode,
    showRing,
  };

  useImperativeHandle(ref, () => ({
    exportToDataURL: () => renderGradientToDataUrl(renderParamsRef.current),
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const params = {
      colors,
      width,
      height,
      seed,
      isBlurred,
      blurStrength,
      blendMode,
      showRing,
    };

    const generation = renderGeneration;

    const isStale = () => {
      if (!latestGenerationRef) return false;
      return generation !== latestGenerationRef.current;
    };

    const draw = () => {
      if (isStale()) return;

      const maxDim = Math.max(params.width, params.height);
      const maxPreview = previewMaxDimensionRef.current;
      const scale = maxPreview
        ? Math.min(1, maxPreview / maxDim)
        : 1;
      const renderWidth = Math.max(1, Math.round(params.width * scale));
      const renderHeight = Math.max(1, Math.round(params.height * scale));

      canvas.width = renderWidth;
      canvas.height = renderHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      renderGradient(ctx, {
        ...params,
        width: renderWidth,
        height: renderHeight,
      });

      if (isStale()) return;

      if (onRender && captureForShaderRef.current) {
        if (coalesceRendersRef.current) {
          onRender(canvas.toDataURL('image/jpeg', 0.92), generation);
        } else {
          onRender(canvas.toDataURL('image/png'), generation);
        }
      }
    };

    if (coalesceRendersRef.current) {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }

      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        draw();
      });

      return () => {
        if (frameRef.current) {
          cancelAnimationFrame(frameRef.current);
        }
      };
    }

    draw();
  }, [
    colors,
    width,
    height,
    seed,
    glassIntensity,
    isBlurred,
    blurStrength,
    blendMode,
    onRender,
    showRing,
    renderGeneration,
  ]);

  const activeContainerHeight = containerHeight || 600;
  const renderScale = (activeContainerHeight / height) * zoom;

  return (
    <motion.div
      className="canvas-wrapper"
      initial={false}
      animate={{
        width: width * renderScale,
        height: height * renderScale,
      }}
      transition={RATIO_TRANSITION}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
        }}
      />
    </motion.div>
  );
});

export { RAPID_PREVIEW_MAX_DIMENSION, BLUR_SCRUB_PREVIEW_MAX_DIMENSION };
export default GradientCanvas;
