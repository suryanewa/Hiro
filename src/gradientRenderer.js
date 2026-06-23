function hashSeed(value) {
  const text = String(value ?? 'hiro');
  let hash = 2166136261;

  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function createRandom(seed) {
  let state = hashSeed(seed);

  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function numberOrFallback(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function pick(random, items) {
  return items[Math.floor(random() * items.length)] ?? items[0];
}

function dominanceFor(index, total) {
  if (total <= 1) return 1;
  return 1 - (index / total) * 0.78;
}

function drawRibbon(ctx, random, {
  width,
  height,
  color,
  dominance,
  baseDim,
  index,
  getBlendMode,
}) {
  const fromBottom = random() > 0.5;
  const baseY = fromBottom ? height * (1.08 + random() * 0.28) : -height * (0.08 + random() * 0.28);
  const reach = height * (0.28 + dominance * 0.86);
  const thickness = baseDim * (0.08 + dominance * 0.22);
  const drift = (random() - 0.5) * height * 0.35;
  const side = fromBottom ? -1 : 1;
  const startX = -width * (0.18 + random() * 0.28);
  const endX = width * (1.12 + random() * 0.32);
  const tipY = baseY + side * reach + drift;

  ctx.globalCompositeOperation = getBlendMode(index);
  ctx.globalAlpha = 0.66 + dominance * 0.32;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(startX, baseY);
  ctx.bezierCurveTo(
    width * (0.12 + random() * 0.26),
    baseY + side * reach * (0.35 + random() * 0.4),
    width * (0.52 + random() * 0.28),
    tipY - side * reach * (0.16 + random() * 0.28),
    endX,
    tipY,
  );
  ctx.lineTo(endX, tipY + side * thickness);
  ctx.bezierCurveTo(
    width * (0.55 + random() * 0.34),
    tipY + side * thickness * (0.45 + random() * 0.6),
    width * (0.16 + random() * 0.28),
    baseY + side * thickness * (0.45 + random() * 0.7),
    startX,
    baseY + side * thickness,
  );
  ctx.fill();
}

function drawVeil(ctx, random, {
  width,
  height,
  color,
  dominance,
  baseDim,
  index,
  getBlendMode,
}) {
  const cornerX = random() > 0.5 ? -width * 0.28 : width * 1.28;
  const cornerY = random() > 0.5 ? -height * 0.24 : height * 1.24;
  const targetX = width * (0.18 + random() * 0.64);
  const targetY = height * (0.16 + random() * 0.68);
  const spread = baseDim * (0.22 + dominance * 0.36);
  const bend = baseDim * (0.22 + random() * 0.42);

  ctx.globalCompositeOperation = getBlendMode(index);
  ctx.globalAlpha = 0.5 + dominance * 0.34;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cornerX, cornerY);
  ctx.quadraticCurveTo(
    (cornerX + targetX) / 2 + (random() - 0.5) * bend,
    (cornerY + targetY) / 2 + (random() - 0.5) * bend,
    targetX,
    targetY,
  );
  ctx.quadraticCurveTo(
    targetX + (random() - 0.5) * spread,
    targetY + (random() - 0.5) * spread,
    cornerX + (random() - 0.5) * spread,
    cornerY + (random() - 0.5) * spread,
  );
  ctx.fill();
}

function drawBloom(ctx, random, {
  width,
  height,
  color,
  dominance,
  baseDim,
  index,
  getBlendMode,
}) {
  const centerX = width * (0.18 + random() * 0.64);
  const centerY = height * (0.16 + random() * 0.68);
  const radiusX = baseDim * (0.12 + dominance * 0.28);
  const radiusY = baseDim * (0.10 + dominance * 0.24);
  const petals = 4 + Math.floor(random() * 4);
  const startAngle = random() * Math.PI * 2;

  ctx.globalCompositeOperation = getBlendMode(index);
  ctx.globalAlpha = 0.42 + dominance * 0.34;
  ctx.fillStyle = color;

  for (let petal = 0; petal < petals; petal++) {
    const angle = startAngle + (Math.PI * 2 * petal) / petals;
    const tipX = centerX + Math.cos(angle) * radiusX * (0.72 + random() * 0.5);
    const tipY = centerY + Math.sin(angle) * radiusY * (0.72 + random() * 0.5);
    const leftAngle = angle - Math.PI * (0.34 + random() * 0.12);
    const rightAngle = angle + Math.PI * (0.34 + random() * 0.12);

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.bezierCurveTo(
      centerX + Math.cos(leftAngle) * radiusX,
      centerY + Math.sin(leftAngle) * radiusY,
      tipX - Math.cos(angle) * radiusX * 0.2,
      tipY - Math.sin(angle) * radiusY * 0.2,
      tipX,
      tipY,
    );
    ctx.bezierCurveTo(
      tipX - Math.cos(angle) * radiusX * 0.2,
      tipY - Math.sin(angle) * radiusY * 0.2,
      centerX + Math.cos(rightAngle) * radiusX,
      centerY + Math.sin(rightAngle) * radiusY,
      centerX,
      centerY,
    );
    ctx.fill();
  }
}

function drawArch(ctx, random, {
  width,
  height,
  color,
  dominance,
  baseDim,
  index,
  getBlendMode,
}) {
  const archY = height * (1.02 + random() * 0.28);
  const archW = width * (0.45 + dominance * 0.92);
  const archH = height * (0.44 + dominance * 1.05);
  const centerX = width * (0.5 + (random() - 0.5) * 0.46);
  const shoulder = baseDim * (0.05 + random() * 0.08);

  ctx.globalCompositeOperation = getBlendMode(index);
  ctx.globalAlpha = 0.58 + dominance * 0.34;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(centerX - archW / 2, archY);
  ctx.lineTo(centerX - archW / 2, archY - archH * 0.44);
  ctx.bezierCurveTo(
    centerX - archW / 2 + shoulder,
    archY - archH,
    centerX + archW / 2 - shoulder,
    archY - archH,
    centerX + archW / 2,
    archY - archH * 0.44,
  );
  ctx.lineTo(centerX + archW / 2, archY);
  ctx.fill();
}

function drawFacet(ctx, random, {
  width,
  height,
  color,
  dominance,
  baseDim,
  index,
  getBlendMode,
}) {
  const slant = random() > 0.5 ? 1 : -1;
  const originX = slant > 0 ? -width * (0.1 + random() * 0.26) : width * (1.1 + random() * 0.26);
  const originY = height * (-0.08 + random() * 1.16);
  const length = baseDim * (0.55 + dominance * 0.7);
  const thickness = baseDim * (0.08 + dominance * 0.18);
  const tipX = originX + slant * length;
  const tipY = originY + (random() - 0.5) * height * 0.72;

  ctx.globalCompositeOperation = getBlendMode(index);
  ctx.globalAlpha = 0.44 + dominance * 0.28;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(originX, originY);
  ctx.lineTo(tipX, tipY);
  ctx.quadraticCurveTo(
    (originX + tipX) / 2 + (random() - 0.5) * thickness,
    (originY + tipY) / 2 + (random() - 0.5) * thickness,
    originX + slant * thickness * (0.35 + random()),
    originY + thickness * (random() - 0.5),
  );
  ctx.fill();
}

function drawAccentSweep(ctx, random, {
  width,
  height,
  colors,
  baseDim,
  getBlendMode,
}) {
  if (colors.length < 3 || random() < 0.28) return;

  const color = colors[1 + Math.floor(random() * (colors.length - 1))] ?? colors[colors.length - 1];
  const startY = height * (0.2 + random() * 0.55);
  const endY = height * (0.28 + random() * 0.55);
  const thickness = baseDim * (0.03 + random() * 0.08);

  ctx.globalCompositeOperation = getBlendMode(900);
  ctx.globalAlpha = 0.28 + random() * 0.22;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-width * 0.22, startY);
  ctx.bezierCurveTo(
    width * (0.18 + random() * 0.18),
    startY - height * (0.28 + random() * 0.22),
    width * (0.62 + random() * 0.22),
    endY + height * (0.2 + random() * 0.22),
    width * 1.22,
    endY,
  );
  ctx.lineTo(width * 1.22, endY + thickness);
  ctx.bezierCurveTo(
    width * (0.62 + random() * 0.22),
    endY + thickness + height * (0.16 + random() * 0.18),
    width * (0.18 + random() * 0.18),
    startY + thickness - height * (0.18 + random() * 0.2),
    -width * 0.22,
    startY + thickness,
  );
  ctx.fill();
}

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
  const safeWidth = Math.max(1, Math.round(numberOrFallback(width, 1)));
  const safeHeight = Math.max(1, Math.round(numberOrFallback(height, 1)));
  const safeColors = Array.isArray(colors) && colors.length > 0 ? colors : ['#000000'];
  const safeBlurStrength = clamp(numberOrFallback(blurStrength, 100), 0, 100);
  const random = createRandom(seed);
  const baseDim = Math.max(safeWidth, safeHeight);
  const motifs = [drawRibbon, drawVeil, drawBloom, drawArch, drawFacet];
  const motifOffset = Math.floor(random() * motifs.length);
  const secondaryMotifOffset = Math.floor(random() * motifs.length);

  const getBlendMode = (index) => {
    if (blendMode === 'dynamic') {
      return pick(createRandom(`${seed}:${index}`), [
        'source-over',
        'screen',
        'overlay',
        'color-dodge',
        'exclusion',
        'multiply',
        'soft-light',
      ]);
    }

    return blendMode;
  };

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, safeWidth, safeHeight);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.filter = 'none';
  ctx.fillStyle = safeColors[0] || '#000000';
  ctx.fillRect(0, 0, safeWidth, safeHeight);

  const blurAmount = baseDim * 0.13 * (safeBlurStrength / 100);
  ctx.filter = isBlurred && safeBlurStrength > 0 ? `blur(${blurAmount}px)` : 'none';

  safeColors.forEach((color, colorIndex) => {
    const dominance = dominanceFor(colorIndex, safeColors.length);
    const layerCount = Math.max(1, Math.round(1 + dominance * 3 + random() * 2));

    for (let layer = 0; layer < layerCount; layer++) {
      const motifIndex = (colorIndex + layer + motifOffset) % motifs.length;
      const secondaryMotifIndex = (colorIndex * 2 + layer + secondaryMotifOffset) % motifs.length;
      const motif = random() > 0.28 ? motifs[motifIndex] : motifs[secondaryMotifIndex];

      motif(ctx, random, {
        width: safeWidth,
        height: safeHeight,
        color,
        dominance,
        baseDim,
        index: colorIndex * 100 + layer,
        getBlendMode,
      });
    }
  });

  drawAccentSweep(ctx, random, {
    width: safeWidth,
    height: safeHeight,
    colors: safeColors,
    baseDim,
    getBlendMode,
  });

  ctx.globalAlpha = 1.0;
  ctx.filter = 'none';
  ctx.globalCompositeOperation = 'source-over';

  if (showRing) {
    const maxRingBlur = Math.min(safeWidth, safeHeight) * 0.05;
    const ringBlurAmount = isBlurred && safeBlurStrength > 0
      ? Math.min(maxRingBlur, baseDim * 0.13 * (safeBlurStrength / 100))
      : 0;
    ctx.filter = ringBlurAmount > 0 ? `blur(${ringBlurAmount}px)` : 'none';

    ctx.strokeStyle = safeColors[0] || '#000000';
    ctx.lineWidth = Math.min(safeWidth, safeHeight) * 0.12;
    ctx.strokeRect(0, 0, safeWidth, safeHeight);

    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'source-over';
  }
}
