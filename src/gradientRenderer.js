export function renderGradient(ctx, {
  colors,
  width,
  height,
  seed,
  isBlurred = true,
  blurStrength = 100,
  blendMode = 'dynamic',
  showRing = false,
}) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);

  let s = seed;
  const random = () => {
    const x = Math.sin(s++) * 10000;
    return x - Math.floor(x);
  };

  const getBlendMode = (index) => {
    if (blendMode === 'dynamic') {
      const modes = ['source-over', 'screen', 'overlay', 'color-dodge', 'exclusion', 'multiply', 'soft-light'];
      const hash = Math.sin(seed + index) * 10000;
      const val = hash - Math.floor(hash);
      return modes[Math.floor(val * modes.length)];
    }
    return blendMode;
  };

  ctx.fillStyle = colors[0] || '#000000';
  ctx.fillRect(0, 0, width, height);

  const blurAmount = Math.max(width, height) * 0.15 * (blurStrength / 100);
  ctx.filter = isBlurred && blurStrength > 0 ? `blur(${blurAmount}px)` : 'none';

  const baseDim = Math.max(width, height);
  const theme = Math.floor(random() * 3);

  if (theme === 0) {
    colors.forEach((color, i) => {
      const dominance = (colors.length - i) / colors.length;
      const wavesCount = Math.max(1, Math.round(dominance * 3));

      for (let w = 0; w < wavesCount; w++) {
        ctx.globalCompositeOperation = getBlendMode(i * 10 + w);
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = color;
        ctx.beginPath();

        const isBottom = random() > 0.5;
        const baseY = isBottom ? height * 1.2 : -height * 0.2;

        ctx.moveTo(-width * 0.2, baseY);

        const reach = height * (0.4 + 0.8 * dominance);
        const cp1x = width * (0.2 + random() * 0.6);
        const cp1y = isBottom ? height * 1.2 - reach * (0.3 + random() * 0.7) : -height * 0.2 + reach * (0.3 + random() * 0.7);
        const cp2x = width * (0.4 + random() * 0.6);
        const cp2y = isBottom ? height * 1.2 - reach * (0.3 + random() * 0.7) : -height * 0.2 + reach * (0.3 + random() * 0.7);
        const endY = isBottom ? height * 1.2 - reach * (0.3 + random() * 0.7) : -height * 0.2 + reach * (0.3 + random() * 0.7);

        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, width * 1.2, endY);
        ctx.lineTo(width * 1.2, baseY);
        ctx.lineTo(-width * 0.2, baseY);
        ctx.fill();
      }
    });
  } else if (theme === 1) {
    ctx.fillStyle = colors[0] || '#000';
    ctx.fillRect(0, 0, width, height);

    for (let i = 1; i < colors.length; i++) {
      const color = colors[i];
      const dominance = (colors.length - i) / (colors.length - 1 || 1);
      const numSlashes = Math.max(1, Math.round(dominance * 3));

      ctx.fillStyle = color;
      ctx.globalAlpha = 1.0;

      const originX = random() > 0.5 ? -width * 0.3 : width * 1.3;
      const originY = random() > 0.5 ? -height * 0.3 : height * 1.3;

      for (let j = 0; j < numSlashes; j++) {
        ctx.globalCompositeOperation = getBlendMode(i * 10 + j);
        ctx.beginPath();

        const startX = originX + (random() - 0.5) * width * 0.8;
        const startY = originY + (random() - 0.5) * height * 0.8;

        ctx.moveTo(startX, startY);

        const reach = 0.3 + 0.7 * dominance;
        const targetTipX = width * (0.2 + random() * 0.6);
        const targetTipY = height * (0.2 + random() * 0.6);
        const tipX = startX + (targetTipX - startX) * reach;
        const tipY = startY + (targetTipY - startY) * reach;

        const cpOffset = baseDim * 0.5;
        const cp1x = (startX + tipX) / 2 + (random() - 0.5) * cpOffset;
        const cp1y = (startY + tipY) / 2 + (random() - 0.5) * cpOffset;

        ctx.quadraticCurveTo(cp1x, cp1y, tipX, tipY);

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
    ctx.fillStyle = colors[0] || '#000';
    ctx.fillRect(0, 0, width, height);

    let currentW = width * (1.2 + random() * 0.5);
    let currentH = height * (1.2 + random() * 0.5);
    const archY = height * 1.1;

    for (let i = 1; i < colors.length; i++) {
      const color = colors[i];
      const dominance = (colors.length - i) / (colors.length - 1 || 1);
      const archesCount = Math.max(1, Math.round(dominance * 2));

      for (let a = 0; a < archesCount; a++) {
        ctx.globalCompositeOperation = getBlendMode(i * 10 + a);
        ctx.fillStyle = color;

        ctx.beginPath();
        const centerSpread = 0.3 * dominance;
        const centerX = width * (0.5 + (random() - 0.5) * centerSpread);

        ctx.moveTo(centerX - currentW / 2, archY);
        ctx.lineTo(centerX - currentW / 2, archY - currentH * 0.5);
        ctx.bezierCurveTo(
          centerX - currentW / 2, archY - currentH,
          centerX + currentW / 2, archY - currentH,
          centerX + currentW / 2, archY - currentH * 0.5
        );
        ctx.lineTo(centerX + currentW / 2, archY);
        ctx.fill();

        currentW *= (0.45 + random() * 0.25);
        currentH *= (0.55 + random() * 0.25);
      }
    }

    if (random() > 0.5 && colors.length > 2) {
      const rogueColorIndex = 1 + Math.floor(random() * (colors.length - 1));
      const rogueDominance = (colors.length - rogueColorIndex) / (colors.length - 1 || 1);

      ctx.globalCompositeOperation = getBlendMode(99);
      ctx.fillStyle = colors[rogueColorIndex] || colors[colors.length - 1];

      ctx.beginPath();
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
  ctx.filter = 'none';
  ctx.globalCompositeOperation = 'source-over';

  if (showRing) {
    ctx.globalCompositeOperation = 'source-over';

    const maxRingBlur = Math.min(width, height) * 0.05;
    const ringBlurAmount = isBlurred && blurStrength > 0
      ? Math.min(maxRingBlur, Math.max(width, height) * 0.15 * (blurStrength / 100))
      : 0;
    ctx.filter = ringBlurAmount > 0 ? `blur(${ringBlurAmount}px)` : 'none';

    ctx.strokeStyle = colors[0] || '#000000';
    const strokeThickness = Math.min(width, height) * 0.12;
    ctx.lineWidth = strokeThickness;
    ctx.strokeRect(0, 0, width, height);

    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'source-over';
  }
}
