import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

const GradientCanvas = forwardRef(({ colors, width, height, seed, glassIntensity = 0.1, isBlurred = true, blurStrength = 100, blendMode = 'dynamic', onRender, zoom = 1, containerHeight, showRing }, ref) => {
  const canvasRef = useRef(null);

  // Expose export function to parent
  useImperativeHandle(ref, () => ({
    exportToDataURL: () => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      return canvas.toDataURL('image/png');
    }
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Set actual canvas resolution (for high DPI, we could scale, but for 1:1 export we just use width/height)
    canvas.width = width;
    canvas.height = height;

    // Simple pseudo-random generator based on seed so we get consistent results per seed
    let s = seed;
    const random = () => {
      const x = Math.sin(s++) * 10000;
      return x - Math.floor(x);
    };

    const getBlendMode = (index) => {
      if (blendMode === 'dynamic') {
        const modes = ['source-over', 'screen', 'overlay', 'color-dodge', 'exclusion', 'multiply', 'soft-light'];
        // Deterministic pseudo-random blend mode choice that doesn't advance random() sequence
        const hash = Math.sin(seed + index) * 10000;
        const val = hash - Math.floor(hash);
        return modes[Math.floor(val * modes.length)];
      }
      return blendMode;
    };

    // 1. Draw Background
    ctx.fillStyle = colors[0] || '#000000'; // Default to first color or black
    ctx.fillRect(0, 0, width, height);

    // 2. Draw Organic Blobs with Blur
    const blurAmount = Math.max(width, height) * 0.15 * (blurStrength / 100); // Responsive blur
    ctx.filter = isBlurred && blurStrength > 0 ? `blur(${blurAmount}px)` : 'none';

    const drawArch = (color, x, y, w, h) => {
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.moveTo(x - w/2, y + h);
      ctx.lineTo(x - w/2, y);
      ctx.bezierCurveTo(x - w/2, y - h/1.5, x + w/2, y - h/1.5, x + w/2, y);
      ctx.lineTo(x + w/2, y + h);
      ctx.fill();
    };

    const drawBlade = (color, cx, cy, length, angle, thickness) => {
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      
      // Draw a sharp sweeping blade / teardrop
      ctx.moveTo(-length/2, 0);
      ctx.quadraticCurveTo(0, -thickness, length/2, 0); // top curve
      ctx.quadraticCurveTo(0, thickness * 0.2, -length/2, 0); // bottom sharp curve
      
      ctx.fill();
      ctx.rotate(-angle);
      ctx.translate(-cx, -cy);
    };

    const drawOrganicShape = (color, cx, cy, baseRadius, numPoints, stretchX, stretchY, rotation) => {
      ctx.beginPath();
      ctx.fillStyle = color;
      
      const points = [];
      for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        const variance = baseRadius * (0.1 + random() * 0.9); // Huge variance for sharp points
        const px = cx + Math.cos(angle + rotation) * variance * stretchX;
        const py = cy + Math.sin(angle + rotation) * variance * stretchY;
        points.push({ x: px, y: py });
      }

      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
      }
      ctx.fill();
    };

    const baseDim = Math.max(width, height);

    // Pick a composition theme based on seed to ensure cohesive experimental designs
    // 0: Sweeping Waves & Dunes
    // 1: Sharp Slashes / Claws (like image 1 & 2)
    // 2: Monumental Arches / Portals (like image 3)
    const theme = Math.floor(random() * 3);

    if (theme === 0) {
      // THEME 0: SWEEPING WAVES & DUNES
      colors.forEach((color, i) => {
        const dominance = (colors.length - i) / colors.length;
        const wavesCount = Math.max(1, Math.round(dominance * 3)); // More waves for dominant colors

        for (let w = 0; w < wavesCount; w++) {
          ctx.globalCompositeOperation = getBlendMode(i * 10 + w);
          ctx.globalAlpha = 1.0;
          ctx.fillStyle = color;
          ctx.beginPath();
          
          // Start from bottom or top randomly
          const isBottom = random() > 0.5;
          const baseY = isBottom ? height * 1.2 : -height * 0.2;
          
          ctx.moveTo(-width * 0.2, baseY);
          
          // Reach is proportional to dominance
          const reach = height * (0.4 + 0.8 * dominance);
          const cp1x = width * (0.2 + random() * 0.6);
          const cp1y = isBottom ? height * 1.2 - reach * (0.3 + random() * 0.7) : -height * 0.2 + reach * (0.3 + random() * 0.7);
          const cp2x = width * (0.4 + random() * 0.6);
          const cp2y = isBottom ? height * 1.2 - reach * (0.3 + random() * 0.7) : -height * 0.2 + reach * (0.3 + random() * 0.7);
          const endY = isBottom ? height * 1.2 - reach * (0.3 + random() * 0.7) : -height * 0.2 + reach * (0.3 + random() * 0.7);
          
          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, width * 1.2, endY);
          
          // Close the shape
          ctx.lineTo(width * 1.2, baseY);
          ctx.lineTo(-width * 0.2, baseY);
          ctx.fill();
        }
      });
    } else if (theme === 1) {
      // THEME 1: SHARP SLASHES / CLAWS
      // Base background
      ctx.fillStyle = colors[0] || '#000';
      ctx.fillRect(0, 0, width, height);

      // Draw massive swooping slashes ending in sharp points
      for (let i = 1; i < colors.length; i++) {
        const color = colors[i];
        const dominance = (colors.length - i) / (colors.length - 1 || 1);
        const numSlashes = Math.max(1, Math.round(dominance * 3)); // More slashes for dominant colors
        
        ctx.fillStyle = color;
        ctx.globalAlpha = 1.0;

        // Determine a focal corner for the slashes to originate from
        const originX = random() > 0.5 ? -width * 0.3 : width * 1.3;
        const originY = random() > 0.5 ? -height * 0.3 : height * 1.3;

        for (let j = 0; j < numSlashes; j++) {
          ctx.globalCompositeOperation = getBlendMode(i * 10 + j);
          ctx.beginPath();
          
          // Spread them out slightly
          const startX = originX + (random() - 0.5) * width * 0.8;
          const startY = originY + (random() - 0.5) * height * 0.8;
          
          ctx.moveTo(startX, startY);

          // Tip reach is scaled by dominance
          const reach = 0.3 + 0.7 * dominance;
          const targetTipX = width * (0.2 + random() * 0.6);
          const targetTipY = height * (0.2 + random() * 0.6);
          const tipX = startX + (targetTipX - startX) * reach;
          const tipY = startY + (targetTipY - startY) * reach;

          // Control points determine the curve of the blade
          const cpOffset = baseDim * 0.5;
          const cp1x = (startX + tipX) / 2 + (random() - 0.5) * cpOffset;
          const cp1y = (startY + tipY) / 2 + (random() - 0.5) * cpOffset;
          
          // Top edge of the blade
          ctx.quadraticCurveTo(cp1x, cp1y, tipX, tipY);
          
          // Bottom edge of the blade (returns to an offset origin to make it thick at the base)
          // Thickness/base width scaled by dominance
          const baseWidth = baseDim * (0.15 + random() * 0.25) * dominance;
          const endX = startX + (random() - 0.5) * baseWidth;
          const endY = startY + (random() - 0.5) * baseWidth;
          
          const cp2x = (endX + tipX) / 2 + (random() - 0.5) * cpOffset;
          const cp2y = (endY + tipY) / 2 + (random() - 0.5) * cpOffset;

          ctx.quadraticCurveTo(cp2x, cp2y, endX, endY);
          ctx.fill();
        }
      }
    } else {
      // THEME 2: MONUMENTAL ARCHES / PORTALS
      ctx.fillStyle = colors[0] || '#000';
      ctx.fillRect(0, 0, width, height);

      // Draw concentric arches
      let currentW = width * (1.2 + random() * 0.5);
      let currentH = height * (1.2 + random() * 0.5);
      
      // Usually ground them at the bottom
      const archY = height * 1.1;

      for (let i = 1; i < colors.length; i++) {
        const color = colors[i];
        const dominance = (colors.length - i) / (colors.length - 1 || 1);
        const archesCount = Math.max(1, Math.round(dominance * 2)); // More nested arches for dominant colors

        for (let a = 0; a < archesCount; a++) {
          ctx.globalCompositeOperation = getBlendMode(i * 10 + a);
          ctx.fillStyle = color;
          
          ctx.beginPath();
          // Slightly offset center X for nested arches, spread wider for dominant colors
          const centerSpread = 0.3 * dominance;
          const centerX = width * (0.5 + (random() - 0.5) * centerSpread);
          
          ctx.moveTo(centerX - currentW/2, archY);
          ctx.lineTo(centerX - currentW/2, archY - currentH * 0.5);
          // The dome
          ctx.bezierCurveTo(
            centerX - currentW/2, archY - currentH, 
            centerX + currentW/2, archY - currentH, 
            centerX + currentW/2, archY - currentH * 0.5
          );
          ctx.lineTo(centerX + currentW/2, archY);
          ctx.fill();

          // Shrink for the next inner arch
          currentW *= (0.45 + random() * 0.25);
          currentH *= (0.55 + random() * 0.25);
        }
      }
      
      // Maybe one rogue blade cutting through
      if (random() > 0.5 && colors.length > 2) {
        const rogueColorIndex = 1 + Math.floor(random() * (colors.length - 1));
        const rogueDominance = (colors.length - rogueColorIndex) / (colors.length - 1 || 1);
        
        ctx.globalCompositeOperation = getBlendMode(99);
        ctx.fillStyle = colors[rogueColorIndex] || colors[colors.length - 1];
        
        ctx.beginPath();
        // Start position and height reflect the rogue color's dominance
        const startY = height * (0.4 + 0.3 * (1 - rogueDominance));
        const endY = height * (0.6 + 0.3 * rogueDominance);
        ctx.moveTo(-width * 0.2, startY);
        ctx.quadraticCurveTo(width * 0.5, -height * 0.1, width * 1.2, endY);
        ctx.lineTo(width * 1.2, height * 1.2);
        ctx.lineTo(-width * 0.2, height * 1.2);
        ctx.fill();
      }
    }
    
    ctx.globalAlpha = 1.0;

    // 3. Reset filter for overlay
    ctx.filter = 'none';

    // Reset composite operation
    ctx.globalCompositeOperation = 'source-over';

    // 4. Draw Edge Ring (if enabled) as the top layer with a separate blur and plus-lighter blend mode
    if (showRing) {
      ctx.globalCompositeOperation = 'plus-lighter';
      
      // Apply blur filter just for the edge frame stroke
      const ringBlurAmount = Math.max(width, height) * 0.15 * (blurStrength / 100);
      ctx.filter = isBlurred && blurStrength > 0 ? `blur(${ringBlurAmount}px)` : 'none';
      
      ctx.strokeStyle = colors[0] || '#000000';
      
      // Calculate a responsive line width (e.g. 12% of the canvas smaller dimension)
      const strokeThickness = Math.min(width, height) * 0.12; 
      ctx.lineWidth = strokeThickness;
      
      // Draw strokeRect centered on the stroke line (insetting by half thickness)
      ctx.strokeRect(
        strokeThickness / 2, 
        strokeThickness / 2, 
        width - strokeThickness, 
        height - strokeThickness
      );
      
      // Reset filter and composite operation after drawing
      ctx.filter = 'none';
      ctx.globalCompositeOperation = 'source-over';
    }

    if (onRender) {
      onRender(canvas.toDataURL('image/png'));
    }
  }, [colors, width, height, seed, glassIntensity, isBlurred, blurStrength, blendMode, onRender, showRing]);

  // Visual scaling logic so it fits the screen's height
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
      <canvas 
        ref={canvasRef} 
        style={{
          width: '100%',
          height: '100%'
        }}
      />
    </div>
  );
});

export default GradientCanvas;
