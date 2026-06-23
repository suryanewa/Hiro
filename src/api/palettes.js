import { generateRandomColorRamp } from 'fettepalette';
import { generateColorRampWithCurve } from 'rampensau';
import { Poline, positionFunctions, randomHSLPair } from 'poline';
import { rybHsl2rgb } from 'rybitten';
import { PALETTE_MOOD_OPTIONS } from './constants.js';
import { randomChoice, shuffleArray, withMathRandom } from './random.js';

const MOOD_VALUES = PALETTE_MOOD_OPTIONS
  .map((option) => option.value)
  .filter((value) => value !== 'random');

const MOOD_PROFILES = Object.freeze({
  neon: {
    anchors: ['#00f5ff', '#ff2bd6', '#8b5cf6', '#00ff85', '#fff500', '#ff5f1f'],
    chromaBoost: 1.2,
    hueJitter: 16,
    lightnessJitter: 0.08,
  },
  jewel: {
    anchors: ['#0f766e', '#1d4ed8', '#7e22ce', '#be123c', '#b45309', '#059669'],
    chromaBoost: 1.05,
    hueJitter: 12,
    lightnessJitter: 0.06,
  },
  candy: {
    anchors: ['#ff7ab6', '#7dd3fc', '#c084fc', '#fef08a', '#86efac', '#fb7185'],
    chromaBoost: 1.08,
    hueJitter: 14,
    lightnessJitter: 0.05,
  },
  cyberpunk: {
    anchors: ['#020617', '#00e5ff', '#f000ff', '#fde047', '#7c3aed', '#22c55e'],
    chromaBoost: 1.22,
    hueJitter: 18,
    lightnessJitter: 0.09,
  },
  sunset: {
    anchors: ['#7c2d12', '#ea580c', '#facc15', '#db2777', '#6d28d9', '#fdf2f8'],
    chromaBoost: 1,
    hueJitter: 10,
    lightnessJitter: 0.07,
  },
  mineral: {
    anchors: ['#0f172a', '#155e75', '#14b8a6', '#a3e635', '#c084fc', '#f8fafc'],
    chromaBoost: 0.92,
    hueJitter: 10,
    lightnessJitter: 0.06,
  },
  editorial: {
    anchors: ['#111827', '#f9fafb', '#ef4444', '#2563eb', '#f59e0b', '#10b981'],
    chromaBoost: 0.98,
    hueJitter: 8,
    lightnessJitter: 0.05,
  },
  vapor: {
    anchors: ['#312e81', '#8b5cf6', '#f0abfc', '#67e8f9', '#fb7185', '#fef3c7'],
    chromaBoost: 1.05,
    hueJitter: 12,
    lightnessJitter: 0.07,
  },
  botanical: {
    anchors: ['#052e16', '#15803d', '#84cc16', '#facc15', '#14b8a6', '#f0fdf4'],
    chromaBoost: 0.95,
    hueJitter: 9,
    lightnessJitter: 0.06,
  },
  'monochrome-luxe': {
    anchors: ['#030712', '#1f2937', '#f8fafc', '#d4af37', '#7f1d1d', '#334155'],
    chromaBoost: 0.85,
    hueJitter: 5,
    lightnessJitter: 0.04,
  },
});

export const rgbToHex = (r, g, b) => {
  const f = (x) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${f(r)}${f(g)}${f(b)}`;
};

export const hexToRgbVals = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : { r: 0, g: 0, b: 0 };
};

const rgbChannelToLinear = (value) => {
  const channel = value / 255;
  return channel <= 0.03928
    ? channel / 12.92
    : Math.pow((channel + 0.055) / 1.055, 2.4);
};

const linearChannelToRgb = (value) => {
  const channel = value <= 0.0031308
    ? 12.92 * value
    : 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
  return Math.min(1, Math.max(0, channel));
};

const getRelativeLuminance = ({ r, g, b }) => (
  0.2126 * rgbChannelToLinear(r) +
  0.7152 * rgbChannelToLinear(g) +
  0.0722 * rgbChannelToLinear(b)
);

export const rgbToHslVals = ({ r, g, b }) => {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) {
    return { h: 0, s: 0, l: lightness };
  }

  const saturation = lightness > 0.5
    ? delta / (2 - max - min)
    : delta / (max + min);
  let hue;

  if (max === red) {
    hue = ((green - blue) / delta + (green < blue ? 6 : 0)) / 6;
  } else if (max === green) {
    hue = ((blue - red) / delta + 2) / 6;
  } else {
    hue = ((red - green) / delta + 4) / 6;
  }

  return { h: hue * 360, s: saturation, l: lightness };
};

const rgbToOklabVals = ({ r, g, b }) => {
  const red = rgbChannelToLinear(r);
  const green = rgbChannelToLinear(g);
  const blue = rgbChannelToLinear(b);
  const l = Math.cbrt(0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue);
  const m = Math.cbrt(0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue);
  const s = Math.cbrt(0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue);

  return {
    l: 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  };
};

export const rgbToOklchVals = (rgb) => {
  const lab = rgbToOklabVals(rgb);
  const hue = Math.atan2(lab.b, lab.a) * 180 / Math.PI;
  return {
    l: lab.l,
    c: Math.sqrt(lab.a * lab.a + lab.b * lab.b),
    h: hue < 0 ? hue + 360 : hue,
  };
};

const oklabToRgbVals = ({ l, a, b }) => {
  const lPrime = l + 0.3963377774 * a + 0.2158037573 * b;
  const mPrime = l - 0.1055613458 * a - 0.0638541728 * b;
  const sPrime = l - 0.0894841775 * a - 1.2914855480 * b;
  const l3 = lPrime * lPrime * lPrime;
  const m3 = mPrime * mPrime * mPrime;
  const s3 = sPrime * sPrime * sPrime;

  return {
    r: Math.round(linearChannelToRgb(4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3) * 255),
    g: Math.round(linearChannelToRgb(-1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3) * 255),
    b: Math.round(linearChannelToRgb(-0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3) * 255),
  };
};

const oklchToHex = ({ l, c, h }) => {
  const radians = h * Math.PI / 180;
  const rgb = oklabToRgbVals({
    l,
    a: Math.cos(radians) * c,
    b: Math.sin(radians) * c,
  });
  return rgbToHex(rgb.r / 255, rgb.g / 255, rgb.b / 255);
};

const hslToHex = ({ h, s, l }) => {
  const hue = (((h % 360) + 360) % 360) / 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (offset) => {
    let t = hue + offset;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  return rgbToHex(channel(1 / 3), channel(0), channel(-1 / 3));
};

const hueBetween = (hue, start, end) => {
  const normalized = ((hue % 360) + 360) % 360;
  return start <= end
    ? normalized >= start && normalized <= end
    : normalized >= start || normalized <= end;
};

const circularHueDistance = (a, b) => {
  const diff = Math.abs((((a - b) % 360) + 540) % 360 - 180);
  return diff;
};

const paletteToColorMetrics = (palette) => palette.map((hex) => {
  const rgb = hexToRgbVals(hex);
  const hsl = rgbToHslVals(rgb);
  const oklch = rgbToOklchVals(rgb);
  return {
    hex,
    rgb,
    ...hsl,
    oklch,
    luminance: getRelativeLuminance(rgb),
  };
});

const mixRgb = (a, b, t) => ({
  r: Math.round(a.r + (b.r - a.r) * t),
  g: Math.round(a.g + (b.g - a.g) * t),
  b: Math.round(a.b + (b.b - a.b) * t),
});

const scoreGradientBlends = (colors) => {
  if (colors.length < 2) return { blendScore: 0, collapseCount: 0 };

  const samples = [];
  for (let i = 0; i < colors.length - 1; i++) {
    for (const t of [0.25, 0.5, 0.75]) {
      samples.push(paletteToColorMetrics([rgbToHex(
        mixRgb(colors[i].rgb, colors[i + 1].rgb, t).r / 255,
        mixRgb(colors[i].rgb, colors[i + 1].rgb, t).g / 255,
        mixRgb(colors[i].rgb, colors[i + 1].rgb, t).b / 255,
      )])[0]);
    }
  }

  const collapseCount = samples.filter((color) => (
    color.oklch.c < 0.045 ||
    (color.s < 0.28 && color.l > 0.18 && color.l < 0.84) ||
    (hueBetween(color.h, 25, 72) && color.s < 0.5 && color.l > 0.2 && color.l < 0.72)
  )).length;
  const avgBlendChroma = samples.reduce((sum, color) => sum + color.oklch.c, 0) / samples.length;
  const blendLightnessSpan = Math.max(...samples.map((color) => color.oklch.l)) -
    Math.min(...samples.map((color) => color.oklch.l));

  return {
    blendScore: avgBlendChroma * 1.8 + blendLightnessSpan * 0.5 - collapseCount * 0.18,
    collapseCount,
  };
};

export const scorePaletteVividness = (palette) => {
  const colors = paletteToColorMetrics(palette);

  if (colors.length === 0) {
    return { score: 0, vivid: false, muddyCount: 0, dullCount: 0 };
  }

  const saturations = colors.map((color) => color.s);
  const luminances = colors.map((color) => color.luminance);
  const chromas = colors.map((color) => color.oklch.c);
  const oklchLightnesses = colors.map((color) => color.oklch.l);
  const avgSaturation = saturations.reduce((sum, value) => sum + value, 0) / saturations.length;
  const avgChroma = chromas.reduce((sum, value) => sum + value, 0) / chromas.length;
  const maxSaturation = Math.max(...saturations);
  const minSaturation = Math.min(...saturations);
  const lightnessSpan = Math.max(...colors.map((color) => color.l)) - Math.min(...colors.map((color) => color.l));
  const perceptualLightnessSpan = Math.max(...oklchLightnesses) - Math.min(...oklchLightnesses);
  const luminanceSpan = Math.max(...luminances) - Math.min(...luminances);
  const hueDistances = colors.flatMap((color, index) => (
    colors.slice(index + 1).map((other) => circularHueDistance(color.oklch.h, other.oklch.h))
  ));
  const hueSpread = hueDistances.length ? Math.max(...hueDistances) / 180 : 0;
  const closeHuePairs = hueDistances.filter((distance) => distance < 16).length;
  const muddyCount = colors.filter((color) => {
    const dirtyYellowBrown = hueBetween(color.h, 34, 66) && color.l > 0.22 && color.l < 0.74 && color.s < 0.82;
    const oliveBrown = hueBetween(color.h, 58, 92) && color.l > 0.2 && color.l < 0.58 && color.s < 0.74;
    const lowChromaBrown = hueBetween(color.h, 18, 48) && color.l > 0.18 && color.l < 0.62 && color.s < 0.62;
    return dirtyYellowBrown || oliveBrown || lowChromaBrown;
  }).length;
  const dullCount = colors.filter((color) => (
    color.s < 0.36 ||
    color.oklch.c < 0.055 ||
    (color.s < 0.48 && color.l > 0.2 && color.l < 0.82)
  )).length;
  const { blendScore, collapseCount } = scoreGradientBlends(colors);
  const score = (
    avgSaturation * 0.38 +
    maxSaturation * 0.24 +
    minSaturation * 0.12 +
    lightnessSpan * 0.12 +
    luminanceSpan * 0.14 +
    avgChroma * 1.1 +
    perceptualLightnessSpan * 0.28 +
    hueSpread * 0.18 +
    blendScore -
    muddyCount * 0.35 -
    dullCount * 0.2 -
    collapseCount * 0.22 -
    closeHuePairs * 0.05
  );

  return {
    score,
    vivid: avgSaturation >= 0.52 &&
      maxSaturation >= 0.72 &&
      minSaturation >= 0.32 &&
      avgChroma >= 0.09 &&
      lightnessSpan >= 0.14 &&
      perceptualLightnessSpan >= 0.13 &&
      luminanceSpan >= 0.18 &&
      muddyCount === 0 &&
      dullCount === 0 &&
      collapseCount === 0,
    muddyCount,
    dullCount,
    collapseCount,
  };
};

export const isVividPalette = (palette) => scorePaletteVividness(palette).vivid;

function polishVividPalette(palette) {
  return palette.map((hex, index) => {
    const hsl = rgbToHslVals(hexToRgbVals(hex));
    let h = hsl.h;
    let s = Math.max(0.7, hsl.s);
    let l = Math.min(0.84, Math.max(0.18, hsl.l));

    if (
      (hueBetween(h, 34, 66) && l > 0.22 && l < 0.74 && s < 0.9) ||
      (hueBetween(h, 58, 92) && l > 0.2 && l < 0.58 && s < 0.82) ||
      (hueBetween(h, 18, 48) && l > 0.18 && l < 0.62 && s < 0.72)
    ) {
      h = index % 2 === 0 ? h - 36 : h + 92;
      s = Math.max(0.82, s);
      l = index % 2 === 0 ? Math.max(0.48, l) : Math.min(0.38, l);
    }

    if (index === palette.length - 1) {
      l = l > 0.5 ? Math.min(0.94, l + 0.08) : Math.max(0.12, l - 0.08);
    }

    return hslToHex({ h, s: Math.min(1, s), l });
  });
}

function resolveMood(mood, random = Math.random) {
  if (!mood || mood === 'random') return randomChoice(MOOD_VALUES, random);
  return MOOD_PROFILES[mood] ? mood : randomChoice(MOOD_VALUES, random);
}

function mutateHexByMood(hex, profile, random) {
  const hsl = rgbToHslVals(hexToRgbVals(hex));
  const hue = hsl.h + (random() * 2 - 1) * profile.hueJitter;
  const saturation = Math.min(1, Math.max(0.2, hsl.s * profile.chromaBoost + (random() * 0.12 - 0.04)));
  const lightness = Math.min(0.96, Math.max(0.08, hsl.l + (random() * 2 - 1) * profile.lightnessJitter));
  return hslToHex({ h: hue, s: saturation, l: lightness });
}

function generateMoodPalette(count, vibrancy = 'vibrant', random = Math.random, mood = 'random') {
  const moodName = resolveMood(mood, random);
  const profile = MOOD_PROFILES[moodName];
  const anchors = shuffleArray(profile.anchors, random);
  const colors = [];

  for (let i = 0; i < count; i++) {
    const base = anchors[i % anchors.length];
    colors.push(mutateHexByMood(base, profile, random));
  }

  if (vibrancy === 'subtle') {
    return rebalancePalette(colors.map((hex) => {
      const oklch = rgbToOklchVals(hexToRgbVals(hex));
      return oklchToHex({
        h: oklch.h,
        c: Math.max(0.035, oklch.c * 0.72),
        l: Math.min(0.9, Math.max(0.18, oklch.l + (random() * 0.08 - 0.02))),
      });
    }), random);
  }

  return rebalancePalette(colors, random);
}

function rebalancePalette(palette, random = Math.random) {
  if (palette.length < 3) return palette;

  const colors = paletteToColorMetrics(palette);
  const darkest = colors.reduce((best, color) => color.oklch.l < best.oklch.l ? color : best, colors[0]);
  const lightest = colors.reduce((best, color) => color.oklch.l > best.oklch.l ? color : best, colors[0]);
  const chromatic = colors.reduce((best, color) => color.oklch.c > best.oklch.c ? color : best, colors[0]);
  const balanced = [...palette];

  if (Math.max(...colors.map((color) => color.oklch.l)) - Math.min(...colors.map((color) => color.oklch.l)) < 0.28) {
    balanced[0] = oklchToHex({
      h: darkest.oklch.h,
      c: Math.min(0.28, Math.max(0.06, darkest.oklch.c * 1.05)),
      l: Math.max(0.08, darkest.oklch.l - 0.18),
    });
    balanced[balanced.length - 1] = oklchToHex({
      h: lightest.oklch.h,
      c: Math.min(0.18, Math.max(0.035, lightest.oklch.c * 0.8)),
      l: Math.min(0.94, lightest.oklch.l + 0.16),
    });
  }

  if (Math.max(...colors.map((color) => color.oklch.c)) < 0.12) {
    const accentIndex = Math.max(1, Math.floor(random() * balanced.length));
    balanced[accentIndex] = oklchToHex({
      h: (chromatic.oklch.h + 120 + random() * 80) % 360,
      c: 0.18 + random() * 0.08,
      l: 0.56 + random() * 0.18,
    });
  }

  return balanced;
}

export const generateHarmonicPalette = (count, vibrancy = 'vibrant', random = Math.random) => {
  const baseHue = Math.floor(random() * 360);
  const baseSat = 65 + Math.floor(random() * 25);
  const baseLight = 40 + Math.floor(random() * 25);
  const newColors = [];

  let scheme;
  if (vibrancy === 'subtle') {
    scheme = random() > 0.5 ? 'mono' : 'close-analogous';
  } else if (vibrancy === 'normal') {
    scheme = randomChoice(['analogous', 'triadic', 'split', 'mono'], random);
  } else {
    scheme = randomChoice(['triadic', 'split', 'complementary'], random);
  }

  for (let i = 0; i < count; i++) {
    let h;
    let s;
    let l;

    if (vibrancy === 'subtle') {
      if (scheme === 'mono') {
        h = (baseHue + (random() * 6 - 3)) % 360;
        s = Math.max(30, Math.min(100, baseSat + (random() * 8 - 4)));
        l = Math.max(20, Math.min(90, baseLight + (i * 6 - (count * 3))));
      } else {
        h = (baseHue + (i * (6 + random() * 6))) % 360;
        s = Math.max(30, Math.min(100, baseSat + (random() * 8 - 4)));
        l = Math.max(20, Math.min(90, baseLight + (random() * 8 - 4)));
      }
    } else if (vibrancy === 'normal') {
      s = 50 + random() * 35;
      l = 40 + random() * 30;

      if (scheme === 'mono') {
        h = (baseHue + (random() * 12 - 6)) % 360;
        s = Math.max(30, s - (i * 4));
        l = Math.max(25, Math.min(85, l + (i * 8) - 12));
      } else if (scheme === 'analogous') {
        h = (baseHue + (i * 25) + (random() * 10 - 5)) % 360;
      } else if (scheme === 'triadic') {
        h = (baseHue + (i * 120)) % 360;
        if (i >= 3) h = (h + 30) % 360;
      } else {
        if (i === 0) h = baseHue;
        else if (i % 2 === 1) h = (baseHue + 150) % 360;
        else h = (baseHue + 210) % 360;
      }

      if (i === count - 1 && random() > 0.5) {
        l = random() > 0.5 ? 20 + random() * 10 : 80 + random() * 10;
      }
    } else {
      s = 85 + random() * 15;
      l = 35 + random() * 25;

      if (scheme === 'complementary') {
        h = (i % 2 === 0) ? baseHue : (baseHue + 180) % 360;
        h = (h + (random() * 16 - 8)) % 360;
      } else if (scheme === 'triadic') {
        h = (baseHue + (i * 120) + (random() * 10 - 5)) % 360;
      } else {
        if (i === 0) h = baseHue;
        else if (i % 2 === 1) h = (baseHue + 140) % 360;
        else h = (baseHue + 220) % 360;
        h = (h + (random() * 20 - 10)) % 360;
      }

      if (i % 2 === 1) {
        l = Math.max(15, l - 15);
      } else {
        l = Math.min(85, l + 15);
      }

      if (i === count - 1) {
        l = random() > 0.5 ? 10 + random() * 10 : 90 + random() * 8;
        s = 90 + random() * 10;
      }
    }

    if (h < 0) h += 360;
    const rgb = rybHsl2rgb([h, s / 100, l / 100]);
    newColors.push(rgbToHex(rgb[0], rgb[1], rgb[2]));
  }

  return newColors;
};

export const generateFarbveloPalette = (count, vibrancy = 'vibrant', random = Math.random) => {
  const baseHue = Math.floor(random() * 360);
  const minHueDiffAngle = Math.floor(random() * (360 / count)) + 10;
  const numHues = Math.max(count, Math.round(360 / minHueDiffAngle));
  const hues = Array.from({ length: numHues }, (_, i) => (baseHue + i * minHueDiffAngle) % 360);

  let minSat;
  let maxSat;
  let baseSaturation;

  if (vibrancy === 'subtle') {
    baseSaturation = 10 + random() * 20;
    minSat = 20 + random() * 20;
    maxSat = minSat + 20;
  } else if (vibrancy === 'normal') {
    baseSaturation = 20 + random() * 30;
    minSat = 40 + random() * 20;
    maxSat = minSat + 30;
  } else {
    baseSaturation = 30 + random() * 40;
    minSat = 60 + random() * 20;
    maxSat = Math.min(100, minSat + 30);
  }

  const baseLightness = random() * (vibrancy === 'subtle' ? 40 : 20);
  const rangeLightness = 90 - baseLightness;
  const colorHues = [hues[0]];
  const colorSaturations = [baseSaturation];
  const colorLightnesses = [baseLightness + random() * 10];
  const remainingHues = [...hues];
  remainingHues.splice(0, 1);

  for (let i = 0; i < count - 2; i++) {
    const hueIdx = Math.floor(random() * remainingHues.length);
    const hue = remainingHues.splice(hueIdx, 1)[0] ?? hues[Math.floor(random() * hues.length)];
    const saturation = minSat + random() * (maxSat - minSat);
    const light = baseLightness + 15 + ((rangeLightness - 15) / Math.max(1, count - 2)) * i + random() * 10;

    colorHues.push(hue);
    colorSaturations.push(saturation);
    colorLightnesses.push(Math.min(95, light));
  }

  if (count > 1) {
    colorHues.push(remainingHues[0] ?? hues[0]);
    colorSaturations.push(baseSaturation);
    colorLightnesses.push(rangeLightness + random() * 10);
  }

  if (random() > 0.5 && count > 2) {
    const sortedLightnesses = [...colorLightnesses].sort((a, b) => a - b);
    const centerIndex = Math.floor(sortedLightnesses.length / 2);
    const reordered = new Array(sortedLightnesses.length);
    reordered[centerIndex] = sortedLightnesses[sortedLightnesses.length - 1];
    let leftIndex = centerIndex - 1;
    let rightIndex = centerIndex + 1;

    for (let i = sortedLightnesses.length - 2; i >= 0; i--) {
      if (leftIndex >= 0) {
        reordered[leftIndex] = sortedLightnesses[i];
        leftIndex--;
        i--;
      }
      if (i >= 0 && rightIndex < sortedLightnesses.length) {
        reordered[rightIndex] = sortedLightnesses[i];
        rightIndex++;
      }
    }

    colorLightnesses.splice(0, colorLightnesses.length, ...reordered);
  }

  const newColors = [];
  for (let i = 0; i < count; i++) {
    const rgb = rybHsl2rgb([colorHues[i], colorSaturations[i] / 100, colorLightnesses[i] / 100]);
    newColors.push(rgbToHex(rgb[0], rgb[1], rgb[2]));
  }

  return shuffleArray(newColors, random);
};

export const generateFettePalette = (count, vibrancy = 'vibrant', random = Math.random) => {
  const centerHue = random() * 360;
  const hueCycle = vibrancy === 'subtle' ? 0.05 + random() * 0.1 :
    vibrancy === 'normal' ? 0.3 + random() * 0.4 :
      0.6 + random() * 0.8;

  const curveAccent = vibrancy === 'subtle' ? 0 :
    vibrancy === 'normal' ? random() * 0.15 :
      random() * 0.3;

  const minSaturationLight = vibrancy === 'subtle'
    ? [0.1, 0.4]
    : vibrancy === 'normal'
      ? [0.4, 0.2]
      : [0.7, 0.05];

  const maxSaturationLight = vibrancy === 'subtle'
    ? [0.4, 0.8]
    : vibrancy === 'normal'
      ? [0.8, 0.85]
      : [1.0, 0.95];

  const curveMethod = randomChoice(['lamé', 'arc', 'pow', 'powY', 'powX'], random);
  const ramp = withMathRandom(random, () => generateRandomColorRamp({
    total: count,
    centerHue,
    hueCycle,
    curveAccent,
    curveMethod,
    minSaturationLight,
    maxSaturationLight,
    colorModel: 'hsl',
  }));

  return shuffleArray(ramp.base.slice(0, count), random).map(([h, s, l]) => {
    const rgb = rybHsl2rgb([h, s, l]);
    return rgbToHex(rgb[0], rgb[1], rgb[2]);
  });
};

export const generateRampensauPalette = (count, vibrancy = 'vibrant', random = Math.random) => {
  const hStart = random() * 360;
  const hCycles = vibrancy === 'subtle' ? (random() * 0.3) - 0.15 :
    vibrancy === 'normal' ? (random() * 0.8) - 0.4 :
      (random() * 1.5) + 0.5;

  const sRange = vibrancy === 'subtle'
    ? [0.15 + random() * 0.15, 0.3 + random() * 0.15]
    : vibrancy === 'normal'
      ? [0.4 + random() * 0.2, 0.7 + random() * 0.2]
      : [0.7 + random() * 0.2, 0.95 + random() * 0.05];

  const lRange = vibrancy === 'subtle'
    ? [0.35 + random() * 0.15, 0.7 + random() * 0.15]
    : vibrancy === 'normal'
      ? [0.15 + random() * 0.2, 0.8 + random() * 0.15]
      : [0.05 + random() * 0.1, 0.95 + random() * 0.05];

  const ramp = generateColorRampWithCurve({
    total: count,
    hStart,
    hCycles,
    sRange,
    lRange,
    curveMethod: randomChoice(['lamé', 'arc', 'pow', 'powY', 'powX'], random),
    curveAccent: 0.1 + random() * 1.5,
  });

  return shuffleArray(ramp, random).map(([h, s, l]) => {
    const rgb = rybHsl2rgb([h, s, l]);
    return rgbToHex(rgb[0], rgb[1], rgb[2]);
  });
};

export const generatePolinePalette = (count, vibrancy = 'vibrant', random = Math.random) => {
  let saturations;
  let lightnesses;

  if (vibrancy === 'subtle') {
    saturations = [0.15 + random() * 0.15, 0.3 + random() * 0.15];
    lightnesses = [0.35 + random() * 0.15, 0.7 + random() * 0.15];
  } else if (vibrancy === 'normal') {
    saturations = [0.3 + random() * 0.2, 0.55 + random() * 0.2];
    lightnesses = [0.15 + random() * 0.2, 0.8 + random() * 0.15];
  } else {
    saturations = [0.55 + random() * 0.2, 0.85 + random() * 0.15];
    lightnesses = [0.05 + random() * 0.15, 0.9 + random() * 0.08];
  }

  const startHue = random() * 360;
  let anchorColors;

  if (vibrancy === 'vibrant') {
    const h1 = startHue;
    const h2 = (startHue + 120 + random() * 120) % 360;
    anchorColors = [
      [h1, saturations[0] + random() * (saturations[1] - saturations[0]), lightnesses[0] + random() * (lightnesses[1] - lightnesses[0])],
      [h2, saturations[0] + random() * (saturations[1] - saturations[0]), lightnesses[0] + random() * (lightnesses[1] - lightnesses[0])],
    ];
  } else {
    anchorColors = withMathRandom(random, () => randomHSLPair(startHue, saturations, lightnesses));
  }

  const poline = withMathRandom(random, () => new Poline({
    anchorColors,
    numPoints: Math.max(0, count - 2),
    positionFunction: randomChoice(Object.values(positionFunctions), random),
  }));

  return shuffleArray(poline.colors.slice(0, count), random).map(([h, s, l]) => {
    const rgb = rybHsl2rgb([h, s, l]);
    return rgbToHex(rgb[0], rgb[1], rgb[2]);
  });
};

export const generateRandomPalette = (count, vibrancy = 'vibrant', random = Math.random, mood = 'random') => {
  if (mood && mood !== 'random' && random() < 0.72) {
    return generateMoodPalette(count, vibrancy, random, mood);
  }

  const r = random();
  const palette = r < 0.16 ? generateHarmonicPalette(count, vibrancy, random) :
    r < 0.32 ? generateFarbveloPalette(count, vibrancy, random) :
      r < 0.48 ? generateFettePalette(count, vibrancy, random) :
        r < 0.64 ? generateRampensauPalette(count, vibrancy, random) :
          r < 0.8 ? generatePolinePalette(count, vibrancy, random) :
            generateMoodPalette(count, vibrancy, random, mood);

  return rebalancePalette(palette, random);
};

export const calculatePaletteDistance = (pal1, pal2) => {
  const colors1 = paletteToColorMetrics(pal1);
  const colors2 = paletteToColorMetrics(pal2);

  const distDirection = (a, b) => {
    let totalDist = 0;
    a.forEach((c1) => {
      let minDist = Infinity;
      b.forEach((c2) => {
        const d = Math.sqrt(
          Math.pow((c1.oklch.l - c2.oklch.l) * 180, 2) +
          Math.pow((c1.oklch.c - c2.oklch.c) * 420, 2) +
          Math.pow(circularHueDistance(c1.oklch.h, c2.oklch.h) * 1.15, 2),
        );
        if (d < minDist) minDist = d;
      });
      totalDist += minDist;
    });
    return totalDist / a.length;
  };

  return (distDirection(colors1, colors2) + distDirection(colors2, colors1)) / 2;
};

const normalizePaletteHistory = (previousPalettes) => {
  if (!previousPalettes) return [];
  const palettes = Array.isArray(previousPalettes[0]) ? previousPalettes : [previousPalettes];
  return palettes.filter((palette) => Array.isArray(palette) && palette.length > 0);
};

const calculateHistoryDistance = (candidate, previousPalettes) => {
  const history = normalizePaletteHistory(previousPalettes);
  if (history.length === 0) return 180;
  return Math.min(...history.map((palette) => calculatePaletteDistance(candidate, palette)));
};

export const generateVividPalette = (
  count,
  vibrancy = 'vibrant',
  random = Math.random,
  previousColors = null,
  maxAttempts = 12,
  mood = 'random',
) => {
  let bestPalette = generateRandomPalette(count, vibrancy === 'subtle' ? 'normal' : vibrancy, random, mood);
  let bestScore = -Infinity;
  const attempts = Math.max(1, maxAttempts);
  const history = normalizePaletteHistory(previousColors);

  for (let i = 0; i < attempts; i++) {
    const candidate = i === 0
      ? bestPalette
      : generateRandomPalette(count, vibrancy === 'subtle' ? 'normal' : vibrancy, random, mood);
    const vividness = scorePaletteVividness(candidate);
    const distance = calculateHistoryDistance(candidate, history);
    const score = vividness.score + Math.min(180, distance) / 900;

    if (score > bestScore) {
      bestScore = score;
      bestPalette = candidate;
    }

    if (vividness.vivid && (history.length === 0 || distance > 110)) {
      return candidate;
    }
  }

  const polished = polishVividPalette(bestPalette);
  if (isVividPalette(polished)) return polished;

  return shuffleArray([
    '#ff2d75',
    '#00d4ff',
    '#7c3cff',
    '#00e676',
    '#ff6a00',
    '#1748ff',
  ].slice(0, count), random);
};

export const generateDifferentPalette = (
  count,
  vibrancy,
  previousColors,
  maxAttempts = 6,
  random = Math.random,
  mood = 'random',
) => {
  const history = normalizePaletteHistory(previousColors);
  if (history.length === 0) return generateRandomPalette(count, vibrancy, random, mood);

  let bestPalette = generateRandomPalette(count, vibrancy, random, mood);
  let maxDistance = -1;

  for (let i = 0; i < maxAttempts; i++) {
    const candidate = generateRandomPalette(count, vibrancy, random, mood);
    const distance = calculateHistoryDistance(candidate, history);

    if (distance > 130) {
      return candidate;
    }
    if (distance > maxDistance) {
      maxDistance = distance;
      bestPalette = candidate;
    }
  }

  return bestPalette;
};
