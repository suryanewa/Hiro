import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { Download, RefreshCw, Plus, Trash2, Monitor, Smartphone, Square, Layout, Check, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ColorPicker,
  DialogTrigger,
  Button as AriaButton,
  ColorSwatch,
  Popover,
  Dialog,
  ColorArea,
  ColorThumb,
  ColorSlider,
  SliderTrack,
  ColorField,
  Label,
  Input,
  ColorSwatchPicker,
  ColorSwatchPickerItem,
  parseColor
} from 'react-aria-components';
import { Slider as SliderPrimitive } from '@base-ui/react/slider';
import GradientCanvas, { RAPID_PREVIEW_MAX_DIMENSION } from './GradientCanvas';
import ShaderPreview from './ShaderPreview';
import { exportBackground } from './exportBackground';
import { 
  paperTexturePresets, 
  flutedGlassPresets, 
  waterPresets, 
  imageDitheringPresets, 
  halftoneDotsPresets, 
  halftoneCmykPresets 
} from '@paper-design/shaders-react';
import { rybHsl2rgb } from 'rybitten';
import { generateRandomColorRamp } from 'fettepalette';
import { generateColorRampWithCurve } from 'rampensau';
import { Poline, positionFunctions, randomHSLPair } from 'poline';

const DEFAULT_COLORS = ['#0f172a', '#3b82f6', '#8b5cf6', '#000000'];

const RATIOS = [
  { label: '16:9', width: 1920, height: 1080, icon: Monitor },
  { label: '1:1', width: 1080, height: 1080, icon: Square },
  { label: '9:16', width: 1080, height: 1920, icon: Smartphone },
  { label: 'Web', width: 1440, height: 900, icon: Layout },
];

const BLEND_MODES = [
  { label: 'Normal', value: 'source-over' },
  { label: 'Dynamic (Mix)', value: 'dynamic' },
  { label: 'Screen (Glowing)', value: 'screen' },
  { label: 'Multiply (Deep)', value: 'multiply' },
  { label: 'Overlay (Contrast)', value: 'overlay' },
  { label: 'Color Dodge (Vibrant)', value: 'color-dodge' },
  { label: 'Exclusion (Experimental)', value: 'exclusion' },
];

const VIBRANCY_OPTIONS = [
  { label: 'Subtle', value: 'subtle' },
  { label: 'Normal', value: 'normal' },
  { label: 'Vibrant', value: 'vibrant' }
];

const SHADER_OPTIONS = [
  { label: 'None', value: 'none' },
  { label: 'Paper Texture', value: 'paper-texture' },
  { label: 'Fluted Glass', value: 'fluted-glass' },
  { label: 'Water', value: 'water' },
  { label: 'Image Dithering', value: 'image-dithering' },
  { label: 'Halftone Dots', value: 'halftone-dots' },
  { label: 'Halftone CMYK', value: 'halftone-cmyk' }
];

const SHADER_PRESETS = {
  'paper-texture': paperTexturePresets.filter(p => p.name !== 'Cardboard' && p.name !== 'Details' && p.name !== 'Abstract'),
  'fluted-glass': flutedGlassPresets.filter(p => p.name !== 'Abstract' && p.name !== 'Folds'),
  'water': waterPresets.filter(p => p.name !== 'Slow-mo' && p.name !== 'Abstract'),
  'image-dithering': imageDitheringPresets.filter(p => p.name !== 'Default' && p.name !== 'Noise' && p.name !== 'Retro'),
  'halftone-dots': halftoneDotsPresets.filter(p => p.name !== 'Default' && p.name !== 'LED screen' && p.name !== 'Round and square'),
  'halftone-cmyk': halftoneCmykPresets.filter(p => p.name !== 'Newspaper' && p.name !== 'Drops')
};

const rgbToHex = (r, g, b) => {
  const f = x => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${f(r)}${f(g)}${f(b)}`;
};

const generateHarmonicPalette = (count, vibrancy = 'vibrant') => {
  const baseHue = Math.floor(Math.random() * 360);
  const baseSat = 65 + Math.floor(Math.random() * 25); // 65-90% base saturation
  const baseLight = 40 + Math.floor(Math.random() * 25); // 40-65% base lightness
  
  const newColors = [];
  
  let scheme;
  if (vibrancy === 'subtle') {
    // Monochromatic or very close Analogous
    scheme = Math.random() > 0.5 ? 'mono' : 'close-analogous';
  } else if (vibrancy === 'normal') {
    const schemes = ['analogous', 'triadic', 'split', 'mono'];
    scheme = schemes[Math.floor(Math.random() * schemes.length)];
  } else {
    // Vibrant gets high-contrast schemes
    const schemes = ['triadic', 'split', 'complementary'];
    scheme = schemes[Math.floor(Math.random() * schemes.length)];
  }

  for (let i = 0; i < count; i++) {
    let h, s, l;

    if (vibrancy === 'subtle') {
      if (scheme === 'mono') {
        h = (baseHue + (Math.random() * 6 - 3)) % 360;
        s = Math.max(30, Math.min(100, baseSat + (Math.random() * 8 - 4)));
        l = Math.max(20, Math.min(90, baseLight + (i * 6 - (count * 3))));
      } else {
        h = (baseHue + (i * (6 + Math.random() * 6))) % 360; // 6-12 degree shift per color
        s = Math.max(30, Math.min(100, baseSat + (Math.random() * 8 - 4)));
        l = Math.max(20, Math.min(90, baseLight + (Math.random() * 8 - 4)));
      }
    } else if (vibrancy === 'normal') {
      s = 50 + Math.random() * 35; // 50-85%
      l = 40 + Math.random() * 30; // 40-70%
      
      if (scheme === 'mono') {
        h = (baseHue + (Math.random() * 12 - 6)) % 360;
        s = Math.max(30, s - (i * 4));
        l = Math.max(25, Math.min(85, l + (i * 8) - 12));
      } else if (scheme === 'analogous') {
        h = (baseHue + (i * 25) + (Math.random() * 10 - 5)) % 360;
      } else if (scheme === 'triadic') {
        h = (baseHue + (i * 120)) % 360;
        if (i >= 3) h = (h + 30) % 360;
      } else {
        if (i === 0) h = baseHue;
        else if (i % 2 === 1) h = (baseHue + 150) % 360;
        else h = (baseHue + 210) % 360;
      }

      if (i === count - 1 && Math.random() > 0.5) {
         l = Math.random() > 0.5 ? 20 + Math.random() * 10 : 80 + Math.random() * 10;
      }
    } else {
      s = 85 + Math.random() * 15; // 85-100%
      l = 35 + Math.random() * 25; // 35-60%
      
      if (scheme === 'complementary') {
        h = (i % 2 === 0) ? baseHue : (baseHue + 180) % 360;
        h = (h + (Math.random() * 16 - 8)) % 360;
      } else if (scheme === 'triadic') {
        h = (baseHue + (i * 120) + (Math.random() * 10 - 5)) % 360;
      } else {
        if (i === 0) h = baseHue;
        else if (i % 2 === 1) h = (baseHue + 140) % 360;
        else h = (baseHue + 220) % 360;
        h = (h + (Math.random() * 20 - 10)) % 360;
      }
      
      // Dynamic contrast for vibrant
      if (i % 2 === 1) {
        l = Math.max(15, l - 15);
      } else {
        l = Math.min(85, l + 15);
      }
      
      if (i === count - 1) {
         l = Math.random() > 0.5 ? 10 + Math.random() * 10 : 90 + Math.random() * 8;
         s = 90 + Math.random() * 10;
      }
    }
    
    if (h < 0) h += 360;
    const rgb = rybHsl2rgb([h, s / 100, l / 100]);
    newColors.push(rgbToHex(rgb[0], rgb[1], rgb[2]));
  }
  return newColors;
};

const shuffleArray = (array) => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

const generateFarbveloPalette = (count, vibrancy = 'vibrant') => {
  const baseHue = Math.floor(Math.random() * 360);
  const minHueDiffAngle = Math.floor(Math.random() * (360 / count)) + 10;
  const numHues = Math.max(count, Math.round(360 / minHueDiffAngle));
  const hues = Array.from({ length: numHues }, (_, i) => (baseHue + i * minHueDiffAngle) % 360);
  
  let minSat, maxSat, minLight, maxLight, baseSaturation;
  if (vibrancy === 'subtle') {
    baseSaturation = 10 + Math.random() * 20;
    minSat = 20 + Math.random() * 20;
    maxSat = minSat + 20;
    minLight = 50 + Math.random() * 20;
    maxLight = minLight + 20;
  } else if (vibrancy === 'normal') {
    baseSaturation = 20 + Math.random() * 30;
    minSat = 40 + Math.random() * 20;
    maxSat = minSat + 30;
    minLight = 30 + Math.random() * 20;
    maxLight = minLight + 40;
  } else { // vibrant
    baseSaturation = 30 + Math.random() * 40;
    minSat = 60 + Math.random() * 20;
    maxSat = Math.min(100, minSat + 30);
    minLight = 20 + Math.random() * 20;
    maxLight = Math.min(95, minLight + 50);
  }

  const baseLightness = Math.random() * (vibrancy === 'subtle' ? 40 : 20);
  const rangeLightness = 90 - baseLightness;

  const colorHues = [];
  const colorSaturations = [];
  const colorLightnesses = [];

  colorHues.push(hues[0]);
  colorSaturations.push(baseSaturation);
  colorLightnesses.push(baseLightness + Math.random() * 10);

  const remainingHues = [...hues];
  remainingHues.splice(0, 1);

  for (let i = 0; i < count - 2; i++) {
    const hueIdx = Math.floor(Math.random() * remainingHues.length);
    const hue = remainingHues.splice(hueIdx, 1)[0] ?? hues[Math.floor(Math.random() * hues.length)];
    const saturation = minSat + Math.random() * (maxSat - minSat);
    const light = baseLightness + 15 + ((rangeLightness - 15) / Math.max(1, count - 2)) * i + Math.random() * 10;
    
    colorHues.push(hue);
    colorSaturations.push(saturation);
    colorLightnesses.push(Math.min(95, light));
  }

  if (count > 1) {
    colorHues.push(remainingHues[0] ?? hues[0]);
    colorSaturations.push(baseSaturation);
    colorLightnesses.push(rangeLightness + Math.random() * 10);
  }

  const arrangement = Math.random() > 0.5 ? 'lightCenter' : 'default';
  if (arrangement === 'lightCenter' && count > 2) {
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
  
  return shuffleArray(newColors);
};

const generateFettePalette = (count, vibrancy = 'vibrant') => {
  const centerHue = Math.random() * 360;
  const hueCycle = vibrancy === 'subtle' ? 0.05 + Math.random() * 0.1 :
                   vibrancy === 'normal' ? 0.3 + Math.random() * 0.4 :
                                          0.6  + Math.random() * 0.8;

  const curveAccent = vibrancy === 'subtle' ? 0 :
                      vibrancy === 'normal' ? Math.random() * 0.15 :
                                             Math.random() * 0.3;

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

  const curveMethods = ['lamé', 'arc', 'pow', 'powY', 'powX'];
  const curveMethod = curveMethods[Math.floor(Math.random() * curveMethods.length)];

  const ramp = generateRandomColorRamp({
    total: count,
    centerHue,
    hueCycle,
    curveAccent,
    curveMethod,
    minSaturationLight,
    maxSaturationLight,
    colorModel: 'hsl',
  });

  // base colors are the mid-tones – closest to what the existing generators produce
  const baseHSL = ramp.base.slice(0, count);

  return shuffleArray(baseHSL).map(([h, s, l]) => {
    // fettepalette returns HSL with s and l as 0–1 fractions
    const rgb = rybHsl2rgb([h, s, l]);
    return rgbToHex(rgb[0], rgb[1], rgb[2]);
  });
};

const generateRampensauPalette = (count, vibrancy = 'vibrant') => {
  const hStart = Math.random() * 360;
  // hCycles: how much the hue rotates across the ramp
  const hCycles = vibrancy === 'subtle' ? (Math.random() * 0.3) - 0.15 :
                  vibrancy === 'normal' ? (Math.random() * 0.8) - 0.4 :
                                         (Math.random() * 1.5) + 0.5;

  // sRange: [minSat, maxSat] as 0–1 fractions
  const sRange = vibrancy === 'subtle'
    ? [0.15 + Math.random() * 0.15, 0.3 + Math.random() * 0.15]
    : vibrancy === 'normal'
    ? [0.4 + Math.random() * 0.2, 0.7 + Math.random() * 0.2]
    : [0.7 + Math.random() * 0.2, 0.95 + Math.random() * 0.05];

  // lRange: [minLight, maxLight] spanning dark→light across the ramp
  const lRange = vibrancy === 'subtle'
    ? [0.35 + Math.random() * 0.15, 0.7 + Math.random() * 0.15]
    : vibrancy === 'normal'
    ? [0.15 + Math.random() * 0.2, 0.8 + Math.random() * 0.15]
    : [0.05 + Math.random() * 0.1, 0.95 + Math.random() * 0.05];

  const curveMethods = ['lamé', 'arc', 'pow', 'powY', 'powX'];
  const curveMethod = curveMethods[Math.floor(Math.random() * curveMethods.length)];
  const curveAccent = 0.1 + Math.random() * 1.5;

  const ramp = generateColorRampWithCurve({
    total: count,
    hStart,
    hCycles,
    sRange,
    lRange,
    curveMethod,
    curveAccent,
  });

  return shuffleArray(ramp).map(([h, s, l]) => {
    const rgb = rybHsl2rgb([h, s, l]);
    return rgbToHex(rgb[0], rgb[1], rgb[2]);
  });
};

const generatePolinePalette = (count, vibrancy = 'vibrant') => {
  let saturations, lightnesses;
  if (vibrancy === 'subtle') {
    saturations = [0.15 + Math.random() * 0.15, 0.3 + Math.random() * 0.15];
    lightnesses = [0.35 + Math.random() * 0.15, 0.7 + Math.random() * 0.15];
  } else if (vibrancy === 'normal') {
    saturations = [0.3 + Math.random() * 0.2, 0.55 + Math.random() * 0.2];
    lightnesses = [0.15 + Math.random() * 0.2, 0.8 + Math.random() * 0.15];
  } else {
    saturations = [0.55 + Math.random() * 0.2, 0.85 + Math.random() * 0.15];
    lightnesses = [0.05 + Math.random() * 0.15, 0.9 + Math.random() * 0.08];
  }

  const startHue = Math.random() * 360;
  
  let anchorColors;
  if (vibrancy === 'vibrant') {
    const h1 = startHue;
    const h2 = (startHue + 120 + Math.random() * 120) % 360;
    anchorColors = [
      [h1, saturations[0] + Math.random() * (saturations[1] - saturations[0]), lightnesses[0] + Math.random() * (lightnesses[1] - lightnesses[0])],
      [h2, saturations[0] + Math.random() * (saturations[1] - saturations[0]), lightnesses[0] + Math.random() * (lightnesses[1] - lightnesses[0])]
    ];
  } else {
    anchorColors = randomHSLPair(startHue, saturations, lightnesses);
  }

  const funcs = Object.values(positionFunctions);
  const positionFunction = funcs[Math.floor(Math.random() * funcs.length)];

  const poline = new Poline({
    anchorColors,
    numPoints: Math.max(0, count - 2),
    positionFunction,
  });

  return shuffleArray(poline.colors.slice(0, count)).map(([h, s, l]) => {
    const rgb = rybHsl2rgb([h, s, l]);
    return rgbToHex(rgb[0], rgb[1], rgb[2]);
  });
};

const generateRandomPalette = (count, vibrancy = 'vibrant') => {
  const r = Math.random();
  if (r < 0.2) return generateHarmonicPalette(count, vibrancy);
  if (r < 0.4) return generateFarbveloPalette(count, vibrancy);
  if (r < 0.6) return generateFettePalette(count, vibrancy);
  if (r < 0.8) return generateRampensauPalette(count, vibrancy);
  return generatePolinePalette(count, vibrancy);
};

const hexToRgbVals = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

const calculatePaletteDistance = (pal1, pal2) => {
  const rgb1 = pal1.map(hexToRgbVals);
  const rgb2 = pal2.map(hexToRgbVals);
  
  const distDirection = (a, b) => {
    let totalDist = 0;
    a.forEach(c1 => {
      let minDist = Infinity;
      b.forEach(c2 => {
        const d = Math.sqrt(Math.pow(c1.r - c2.r, 2) + Math.pow(c1.g - c2.g, 2) + Math.pow(c1.b - c2.b, 2));
        if (d < minDist) minDist = d;
      });
      totalDist += minDist;
    });
    return totalDist / a.length;
  };
  
  return (distDirection(rgb1, rgb2) + distDirection(rgb2, rgb1)) / 2;
};

const generateDifferentPalette = (count, vibrancy, previousColors, maxAttempts = 6) => {
  if (!previousColors || previousColors.length === 0) return generateRandomPalette(count, vibrancy);

  let bestPalette = generateRandomPalette(count, vibrancy);
  let maxDistance = -1;

  for (let i = 0; i < maxAttempts; i++) {
    const candidate = generateRandomPalette(count, vibrancy);
    const distance = calculatePaletteDistance(candidate, previousColors);
    
    // 130 is a very high distance in RGB space, meaning practically opposite colors
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

function TakiSlider({ value, min = 0, max = 100, step = 1, onChange }) {
  return (
    <div className="taki-slider-control">
      <SliderPrimitive.Root
        className="taki-slider-root"
        value={value}
        min={min}
        max={max}
        step={step}
        thumbAlignment="edge"
        onValueChange={(val) => {
          const num = Array.isArray(val) ? val[0] : val;
          if (typeof num === 'number' && !isNaN(num)) {
            onChange(num);
          }
        }}
      >
        <SliderPrimitive.Control className="taki-slider-wrapper">
          <SliderPrimitive.Track className="taki-slider-track">
            <SliderPrimitive.Indicator className="taki-slider-indicator" />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb className="taki-slider-thumb hidden-thumb" />
        </SliderPrimitive.Control>
      </SliderPrimitive.Root>
    </div>
  );
}

function TakiSwitch({ checked, onChange, label }) {
  return (
    <div className="taki-switch-row" onClick={() => onChange(!checked)}>
      <span className="control-label">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`taki-switch ${checked ? 'checked' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onChange(!checked);
        }}
      >
        <span className="taki-switch-thumb" />
      </button>
    </div>
  );
}

function HexPicker({ value, onChange }) {
  const color = React.useMemo(() => {
    try {
      return parseColor(value);
    } catch {
      return parseColor("#000000");
    }
  }, [value]);

  const handleChange = (newColor) => {
    onChange(newColor.toString("hex"));
  };

  return (
    <ColorPicker value={color} onChange={handleChange}>
      <DialogTrigger>
        <AriaButton className="color-picker-trigger-btn">
          <ColorSwatch className="color-picker-trigger-swatch" />
        </AriaButton>
        <Popover placement="bottom start" crossOffset={-13} className="color-picker-popover">
          <Dialog className="color-picker-dialog">
            <div>
              <ColorArea
                colorSpace="hsb"
                xChannel="saturation"
                yChannel="brightness"
                className="color-picker-area"
              >
                <ColorThumb className="color-picker-thumb" />
              </ColorArea>
              <ColorSlider colorSpace="hsb" channel="hue" className="color-picker-slider">
                <SliderTrack className="color-picker-track">
                  <ColorThumb className="color-picker-thumb" style={{ top: '50%' }} />
                </SliderTrack>
              </ColorSlider>
            </div>
            <ColorField colorSpace="hsb" className="color-field-container">
              <Label className="color-field-label">Hex</Label>
              <Input className="color-field-input" />
            </ColorField>
            <ColorSwatchPicker className="color-picker-swatchpicker">
              {['#F00', '#f90', '#0F0', '#08f', '#00f'].map((c) => (
                <ColorSwatchPickerItem key={c} color={c} className="color-picker-swatchpicker-item">
                  <ColorSwatch className="color-picker-swatchpicker-swatch" />
                </ColorSwatchPickerItem>
              ))}
            </ColorSwatchPicker>
          </Dialog>
        </Popover>
      </DialogTrigger>
    </ColorPicker>
  );
}

function AnimatedSelect({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find(o => o.value === value)?.label || value;

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="setting-row">
        <label className="control-label">{label}</label>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', 
            color: 'var(--text-muted)', border: 'none', background: 'transparent', 
            cursor: 'pointer', padding: 0, fontFamily: 'inherit',
            transition: 'color 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-main)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {!open && (
              <motion.span
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                style={{ color: 'inherit' }}
              >
                {selectedLabel}
              </motion.span>
            )}
          </AnimatePresence>
          <ChevronDown
            size={16}
            style={{
              transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)'
            }}
          />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.65, 0, 0.35, 1] }}
            style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                style={{
                  display: 'flex', width: '100%', cursor: 'pointer', alignItems: 'center', 
                  justifyContent: 'space-between', padding: '6px 0', fontSize: '14px',
                  background: 'transparent', border: 'none', fontFamily: 'inherit',
                  color: value === opt.value ? 'var(--text-main)' : 'var(--text-muted)',
                  fontWeight: value === opt.value ? '500' : '400',
                  transition: 'color 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-main)'}
                onMouseLeave={(e) => e.currentTarget.style.color = value === opt.value ? 'var(--text-main)' : 'var(--text-muted)'}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                <span>{opt.label}</span>
                {value === opt.value && (
                  <Check size={16} color="var(--accent)" />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
function App() {
  const [colors, setColors] = useState([...DEFAULT_COLORS]);
  const [activeRatio, setActiveRatio] = useState(RATIOS[0]);
  const [seed, setSeed] = useState(Math.random());
  const [isBlurred, setIsBlurred] = useState(true);
  const [blurStrength, setBlurStrength] = useState(100);
  const [blendMode, setBlendMode] = useState('source-over');
  const [vibrancy, setVibrancy] = useState('vibrant');
  const [activeShader, setActiveShader] = useState('none');
  const [activePreset, setActivePreset] = useState('');
  const [hoveredRatio, setHoveredRatio] = useState(null);
  const [hoveredPreset, setHoveredPreset] = useState(null);
  const [gradientDataUrl, setGradientDataUrl] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [showRing, setShowRing] = useState(false);
  const [isRapidRandomizing, setIsRapidRandomizing] = useState(false);
  const [renderGeneration, setRenderGeneration] = useState(0);
  
  const canvasRef = useRef(null);
  const shaderRef = useRef(null);
  const containerRef = useRef(null);
  const zoomAnchorRef = useRef(null);
  const layoutRef = useRef({ wrapperWidth: 0, wrapperHeight: 0 });
  const wheelZoomRef = useRef({ pendingDelta: 0, rafId: 0 });
  const scrollStateRef = useRef(null);
  const prevZoomRef = useRef(1);
  const PREVIEW_PADDING = 48;
  const PREVIEW_VERTICAL_MARGIN = 48;
  const [containerHeight, setContainerHeight] = useState(() => {
    if (typeof window !== 'undefined') {
      return Math.max(400, window.innerHeight - 150);
    }
    return 600;
  });

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.height > 0) {
          setContainerHeight(entry.contentRect.height);
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const generateHarmonicColors = (baseHue, count, vibrancyType) => {
    const newColors = [];
    let s = 80;
    let l = 50;

    for (let i = 0; i < count; i++) {
      let h = baseHue;
      if (vibrancyType === 'pastel') {
        s = 55 + Math.random() * 15;
        l = 75 + Math.random() * 15;
        h = (baseHue + (i * (360 / count))) % 360;
      } else if (vibrancyType === 'monochrome') {
        s = 10 + Math.random() * 20;
        l = 15 + (i * (75 / count));
      } else if (vibrancyType === 'neon') {
        s = 95 + Math.random() * 5;
        l = 45 + Math.random() * 10;
        h = (baseHue + (i * 45)) % 360;
      } else { // vibrant
        s = 75 + Math.random() * 20;
        l = 40 + Math.random() * 20;
        if (count === 2) {
          if (i === 1) h = (baseHue + 180) % 360;
        } else if (count === 3) {
          if (i === 1) h = (baseHue + 120) % 360;
          else if (i === 2) h = (baseHue + 240) % 360;
        } else {
          if (i === 1) h = (baseHue + 90) % 360;
          else if (i === 2) h = (baseHue + 180) % 360;
          else h = (baseHue + 220) % 360;
          h = (h + (Math.random() * 20 - 10)) % 360;
        }
        
        // Dynamic contrast for vibrant
        if (i % 2 === 1) {
          l = Math.max(15, l - 15);
        } else {
          l = Math.min(85, l + 15);
        }
        
        if (i === count - 1) {
           l = Math.random() > 0.5 ? 10 + Math.random() * 10 : 90 + Math.random() * 8;
           s = 90 + Math.random() * 10;
        }
      }
      
      if (h < 0) h += 360;
      const rgb = rybHsl2rgb([h, s / 100, l / 100]);
      newColors.push(rgbToHex(rgb[0], rgb[1], rgb[2]));
    }
    return newColors;
  };

  const handleColorChange = (index, value) => {
    const newColors = [...colors];
    newColors[index] = value;
    setColors(newColors);
  };

  useEffect(() => {
    zoomAnchorRef.current = null;
    scrollStateRef.current = null;
    setZoom(1);
  }, [activeRatio]);

  const handleShaderChange = (shaderType) => {
    setActiveShader(shaderType);
    if (shaderType !== 'none') {
      const presets = SHADER_PRESETS[shaderType];
      if (presets && presets.length > 0) {
        setActivePreset(presets[0].name);
      }
    } else {
      setActivePreset('');
    }
  };

  const addColor = () => {
    if (colors.length < 6) {
      setColors([...colors, '#ffffff']);
    }
  };

  const removeColor = (index) => {
    if (colors.length > 2) {
      const newColors = colors.filter((_, i) => i !== index);
      setColors(newColors);
    }
  };

  const randomizePalette = () => {
    const randomVibrancy = ['vibrant', 'pastel', 'monochrome', 'neon'][Math.floor(Math.random() * 4)];
    const randomCount = Math.floor(Math.random() * 5) + 2; // Between 2 and 6 colors
    setColors(prevColors => generateDifferentPalette(randomCount, randomVibrancy, prevColors));
  };

  const spaceHoldRef = useRef(null);
  const isSpaceHeldRef = useRef(false);
  const spaceDownAtRef = useRef(0);
  const rapidActivateTimerRef = useRef(null);
  const wasRapidDuringHoldRef = useRef(false);
  const rapidEndTimerRef = useRef(null);
  const pendingGradientUrlRef = useRef(null);
  const pendingGradientGenerationRef = useRef(0);
  const gradientFeedRafRef = useRef(null);
  const isRapidRandomizingRef = useRef(false);
  const renderGenerationRef = useRef(0);
  isRapidRandomizingRef.current = isRapidRandomizing;
  renderGenerationRef.current = renderGeneration;

  const randomize = useCallback((fast = false, { enableRapid = true } = {}) => {
    if (gradientFeedRafRef.current) {
      cancelAnimationFrame(gradientFeedRafRef.current);
      gradientFeedRafRef.current = null;
    }

    renderGenerationRef.current += 1;
    setRenderGeneration(renderGenerationRef.current);

    if (enableRapid) {
      setIsRapidRandomizing(true);

      if (!isSpaceHeldRef.current) {
        if (rapidEndTimerRef.current) {
          clearTimeout(rapidEndTimerRef.current);
        }
        rapidEndTimerRef.current = window.setTimeout(() => {
          setIsRapidRandomizing(false);
          renderGenerationRef.current += 1;
          setRenderGeneration(renderGenerationRef.current);
          rapidEndTimerRef.current = null;
        }, fast ? 150 : 350);
      }
    }

    setSeed(Math.random());
    setBlurStrength(Math.floor(Math.random() * 26) + 50);
    setIsBlurred(true);

    if (fast) {
      setColors(() => generateRandomPalette(
        Math.floor(Math.random() * 5) + 2,
        vibrancy,
      ));

      // Changing shader type remounts WebGL — only shuffle it occasionally while holding space.
      if (Math.random() < 0.22) {
        const shaderTypes = ['none', 'paper-texture', 'fluted-glass', 'water', 'image-dithering', 'halftone-dots', 'halftone-cmyk'];
        const randomShader = shaderTypes[Math.floor(Math.random() * shaderTypes.length)];
        setActiveShader(randomShader);

        if (randomShader !== 'none') {
          const presets = SHADER_PRESETS[randomShader];
          if (presets && presets.length > 0) {
            const randomPreset = presets[Math.floor(Math.random() * presets.length)];
            setActivePreset(randomPreset.name);
          }
        } else {
          setActivePreset('');
        }
      }
      return;
    }

    const vibrancyOptions = ['subtle', 'normal', 'vibrant'];
    const randomVibrancy = vibrancyOptions[Math.floor(Math.random() * vibrancyOptions.length)];
    setVibrancy(randomVibrancy);

    const randomCount = Math.floor(Math.random() * 5) + 2;
    setColors((prevColors) => generateDifferentPalette(randomCount, randomVibrancy, prevColors));

    const shaderTypes = ['none', 'paper-texture', 'fluted-glass', 'water', 'image-dithering', 'halftone-dots', 'halftone-cmyk'];
    const randomShader = shaderTypes[Math.floor(Math.random() * shaderTypes.length)];
    setActiveShader(randomShader);

    if (randomShader !== 'none') {
      const presets = SHADER_PRESETS[randomShader];
      if (presets && presets.length > 0) {
        const randomPreset = presets[Math.floor(Math.random() * presets.length)];
        setActivePreset(randomPreset.name);
      }
    } else {
      setActivePreset('');
    }
  }, [vibrancy]);

  const randomizeRef = useRef(randomize);
  randomizeRef.current = randomize;

  const handleGradientRender = useCallback((dataUrl, generation) => {
    if (generation !== renderGenerationRef.current) return;

    if (isRapidRandomizingRef.current) {
      pendingGradientUrlRef.current = dataUrl;
      pendingGradientGenerationRef.current = generation;
      if (gradientFeedRafRef.current) return;

      gradientFeedRafRef.current = requestAnimationFrame(() => {
        gradientFeedRafRef.current = null;
        if (pendingGradientGenerationRef.current !== renderGenerationRef.current) return;
        setGradientDataUrl(pendingGradientUrlRef.current);
      });
      return;
    }

    setGradientDataUrl(dataUrl);
  }, []);

  const RAPID_RANDOMIZE_MS = 80;
  const RAPID_ACTIVATE_MS = 150;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        if (e.repeat || isSpaceHeldRef.current) return;

        isSpaceHeldRef.current = true;
        wasRapidDuringHoldRef.current = false;
        spaceDownAtRef.current = Date.now();

        // One full-quality generation on press — rapid mode only after sustained hold.
        randomizeRef.current(true, { enableRapid: false });

        if (rapidActivateTimerRef.current) {
          clearTimeout(rapidActivateTimerRef.current);
        }
        rapidActivateTimerRef.current = window.setTimeout(() => {
          rapidActivateTimerRef.current = null;
          if (!isSpaceHeldRef.current) return;

          wasRapidDuringHoldRef.current = true;
          setIsRapidRandomizing(true);
          spaceHoldRef.current = window.setInterval(() => {
            randomizeRef.current(true);
          }, RAPID_RANDOMIZE_MS);
        }, RAPID_ACTIVATE_MS);
        return;
      }
      // Keyboard zoom shortcuts: Cmd/Ctrl + =/+/ -/_/0
      if ((e.metaKey || e.ctrlKey) && (e.key === '=' || e.key === '+' || e.key === '-' || e.key === '_' || e.key === '0')) {
        e.preventDefault();
        const container = containerRef.current;
        if (container) {
          const { clientWidth, clientHeight, scrollLeft, scrollTop } = container;
          const layout = layoutRef.current;
          zoomAnchorRef.current = {
            contentX: scrollLeft + clientWidth / 2,
            contentY: scrollTop + clientHeight / 2,
            viewportX: clientWidth / 2,
            viewportY: clientHeight / 2,
            scrollWidth: Math.max(clientWidth, layout.wrapperWidth),
            scrollHeight: Math.max(clientHeight, layout.wrapperHeight),
          };
        }
        if (e.key === '0') {
          zoomAnchorRef.current = null;
          setZoom(1);
        } else if (e.key === '=' || e.key === '+') {
          setZoom(prev => Math.min(4.0, prev + 0.25));
        } else if (e.key === '-' || e.key === '_') {
          setZoom(prev => Math.max(0.25, prev - 0.25));
        }
      }
    };
    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        isSpaceHeldRef.current = false;

        if (rapidActivateTimerRef.current) {
          clearTimeout(rapidActivateTimerRef.current);
          rapidActivateTimerRef.current = null;
        }
        if (spaceHoldRef.current) {
          clearInterval(spaceHoldRef.current);
          spaceHoldRef.current = null;
        }
        if (rapidEndTimerRef.current) {
          clearTimeout(rapidEndTimerRef.current);
          rapidEndTimerRef.current = null;
        }

        setIsRapidRandomizing(false);

        if (wasRapidDuringHoldRef.current) {
          renderGenerationRef.current += 1;
          setRenderGeneration(renderGenerationRef.current);
          wasRapidDuringHoldRef.current = false;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (spaceHoldRef.current) {
        clearInterval(spaceHoldRef.current);
      }
      if (rapidEndTimerRef.current) {
        clearTimeout(rapidEndTimerRef.current);
      }
      if (rapidActivateTimerRef.current) {
        clearTimeout(rapidActivateTimerRef.current);
      }
      if (gradientFeedRafRef.current) {
        cancelAnimationFrame(gradientFeedRafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();

      const rect = container.getBoundingClientRect();
      const layout = layoutRef.current;
      const viewportX = e.clientX - rect.left;
      const viewportY = e.clientY - rect.top;

      zoomAnchorRef.current = {
        contentX: container.scrollLeft + viewportX,
        contentY: container.scrollTop + viewportY,
        viewportX,
        viewportY,
        scrollWidth: Math.max(container.clientWidth, layout.wrapperWidth),
        scrollHeight: Math.max(container.clientHeight, layout.wrapperHeight),
      };

      wheelZoomRef.current.pendingDelta += -e.deltaY * 0.005;
      if (wheelZoomRef.current.rafId) return;

      wheelZoomRef.current.rafId = requestAnimationFrame(() => {
        const { pendingDelta } = wheelZoomRef.current;
        wheelZoomRef.current.pendingDelta = 0;
        wheelZoomRef.current.rafId = 0;

        if (pendingDelta !== 0) {
          setZoom((prevZoom) => {
            const nextZoom = prevZoom * (1 + pendingDelta);
            return Math.min(4.0, Math.max(0.25, nextZoom));
          });
        }
      });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
      if (wheelZoomRef.current.rafId) {
        cancelAnimationFrame(wheelZoomRef.current.rafId);
      }
    };
  }, []);

  const handleExport = () => {
    const activeRef = activeShader === 'none' ? canvasRef : shaderRef;
    const preset = activeShader !== 'none'
      ? SHADER_PRESETS[activeShader]?.find((p) => p.name === activePreset)
      : null;

    exportBackground({
      colors,
      seed,
      width: activeRatio.width,
      height: activeRatio.height,
      ratioLabel: activeRatio.label,
      isBlurred,
      blurStrength,
      blendMode,
      showRing,
      activeShader,
      activePreset,
      presetParams: preset?.params ?? {},
      gradientDataUrl,
      getDisplayedDataUrl: () => activeRef.current?.exportToDataURL?.() ?? null,
    });
  };

  const highlightedRatio = hoveredRatio !== null ? hoveredRatio : activeRatio.label;
  const highlightedPreset = hoveredPreset !== null ? hoveredPreset : activePreset;

  const activeContainerHeight = Math.max(containerHeight, 300);
  const previewFitHeight = Math.max(200, activeContainerHeight - PREVIEW_VERTICAL_MARGIN * 2);
  const renderScale = (previewFitHeight / activeRatio.height) * zoom;
  const canvasWidth = activeRatio.width * renderScale;
  const canvasHeight = activeRatio.height * renderScale;
  const wrapperWidth = canvasWidth + PREVIEW_PADDING * 2;
  const wrapperHeight = canvasHeight + PREVIEW_PADDING * 2;

  layoutRef.current = { wrapperWidth, wrapperHeight };

  const zoomChanged = prevZoomRef.current !== zoom;
  prevZoomRef.current = zoom;

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const { clientWidth, clientHeight } = container;
    const scrollWidth = Math.max(clientWidth, wrapperWidth);
    const scrollHeight = Math.max(clientHeight, wrapperHeight);
    const anchor = zoomAnchorRef.current;
    const prev = scrollStateRef.current;

    if (zoomChanged && anchor && anchor.scrollWidth > 0 && anchor.scrollHeight > 0) {
      container.scrollLeft = Math.max(
        0,
        (anchor.contentX / anchor.scrollWidth) * scrollWidth - anchor.viewportX
      );
      container.scrollTop = Math.max(
        0,
        (anchor.contentY / anchor.scrollHeight) * scrollHeight - anchor.viewportY
      );
    } else if (prev && prev.scrollWidth > 0 && prev.scrollHeight > 0) {
      const centerX = prev.scrollLeft + prev.clientWidth / 2;
      const centerY = prev.scrollTop + prev.clientHeight / 2;
      container.scrollLeft = Math.max(0, (centerX / prev.scrollWidth) * scrollWidth - clientWidth / 2);
      container.scrollTop = Math.max(0, (centerY / prev.scrollHeight) * scrollHeight - clientHeight / 2);
    } else {
      container.scrollLeft = Math.max(0, (scrollWidth - clientWidth) / 2);
      container.scrollTop = Math.max(0, (scrollHeight - clientHeight) / 2);
    }

    scrollStateRef.current = {
      scrollWidth,
      scrollHeight,
      clientWidth,
      clientHeight,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
    };
  }, [zoom, wrapperWidth, wrapperHeight, containerHeight, activeRatio.width, activeRatio.height, activeShader]);

  return (
    <div className="app-container">
      {/* Sidebar Controls */}
      <div className="sidebar">

        <div className="control-group">
          <div className="control-header">
            <label className="control-label">Colors</label>
            <button 
              onClick={addColor} 
              className="btn-icon-add" 
              title="Add Color"
              disabled={colors.length >= 6}
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="color-list">
            {colors.map((c, i) => (
              <div key={i} className="color-item">
                <HexPicker 
                  value={c} 
                  onChange={(val) => handleColorChange(i, val)}
                />
                <input 
                  type="text" 
                  value={c.toUpperCase()} 
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) handleColorChange(i, val);
                  }}
                  className="color-hex"
                  maxLength={7}
                />
                {colors.length > 2 && (
                  <button onClick={() => removeColor(i)} className="btn-remove" title="Remove Color">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <TakiSwitch 
          label="Frame"
          checked={showRing}
          onChange={setShowRing}
        />

        <div className="control-group">
          <div className="slider-header">
            <label className="control-label" style={{ marginBottom: 0 }}>Blur Strength</label>
            <span className="slider-value">{blurStrength}%</span>
          </div>
          <TakiSlider 
            value={blurStrength}
            min={0}
            max={100}
            onChange={(val) => {
              setBlurStrength(val);
              if (val > 0) {
                setIsBlurred(true);
              }
            }}
          />
        </div>

        <AnimatedSelect
          label="Vibrancy"
          value={vibrancy}
          options={VIBRANCY_OPTIONS}
          onChange={(val) => {
            setVibrancy(val);
            setColors(prevColors => generateDifferentPalette(prevColors.length, val, prevColors));
          }}
        />

        <AnimatedSelect
          label="Blend Mode"
          value={blendMode}
          options={BLEND_MODES}
          onChange={(val) => setBlendMode(val)}
        />

        <div className="control-group">
          <AnimatedSelect
            label="Shader"
            value={activeShader}
            options={SHADER_OPTIONS}
            onChange={(val) => handleShaderChange(val)}
          />

          {activeShader !== 'none' && SHADER_PRESETS[activeShader] && SHADER_PRESETS[activeShader].length > 1 && (
            <div className="preset-grid" onMouseLeave={() => setHoveredPreset(null)}>
              {SHADER_PRESETS[activeShader].map((preset) => {
                const isHighlighted = preset.name === highlightedPreset;
                return (
                  <button
                    key={preset.name}
                    className={`preset-btn ${isHighlighted ? 'active' : ''}`}
                    onClick={() => setActivePreset(preset.name)}
                    onMouseEnter={() => setHoveredPreset(preset.name)}
                  >
                    {isHighlighted && (
                      <motion.div
                        layoutId="preset-active-pill"
                        className="btn-active-pill"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span>{preset.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="pt-4 mt-auto">
          <div className="control-group">
            <label className="control-label">Aspect Ratio</label>
            <div className="aspect-ratios" onMouseLeave={() => setHoveredRatio(null)}>
              {RATIOS.map((ratio) => {
                const Icon = ratio.icon;
                const isHighlighted = ratio.label === highlightedRatio;
                return (
                  <button
                    key={ratio.label}
                    className={`ratio-btn ${isHighlighted ? 'active' : ''}`}
                    onClick={() => setActiveRatio(ratio)}
                    onMouseEnter={() => setHoveredRatio(ratio.label)}
                    title={ratio.label}
                  >
                    {isHighlighted && (
                      <motion.div
                        layoutId="ratio-active-pill"
                        className="btn-active-pill"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <Icon size={16} strokeWidth={2} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="actions-grid pt-4">
            <button className="btn-secondary" onClick={() => randomize()}>
              <RefreshCw size={14} />
              Randomize
            </button>
            <button className="btn-primary" onClick={handleExport}>
              <Download size={14} />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="main-content">
        <div className="preview-scroll-container" ref={containerRef}>
          <motion.div
            className="preview-content-wrapper"
            initial={false}
            animate={{
              width: wrapperWidth,
              height: wrapperHeight,
            }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          >
            <div
              className="canvas-absolute-center"
              style={{
                visibility: activeShader === 'none' || isRapidRandomizing ? 'visible' : 'hidden',
                pointerEvents: 'none',
              }}
            >
              <GradientCanvas 
                ref={canvasRef}
                colors={colors}
                width={activeRatio.width}
                height={activeRatio.height}
                seed={seed}
                glassIntensity={0}
                isBlurred={isBlurred}
                blurStrength={blurStrength}
                blendMode={blendMode}
                onRender={handleGradientRender}
                zoom={zoom}
                containerHeight={previewFitHeight}
                showRing={showRing}
                previewMaxDimension={isRapidRandomizing ? RAPID_PREVIEW_MAX_DIMENSION : null}
                coalesceRenders={isRapidRandomizing}
                captureForShader={activeShader !== 'none'}
                renderGeneration={renderGeneration}
                latestGenerationRef={renderGenerationRef}
              />
            </div>

            {activeShader !== 'none' && !isRapidRandomizing && (
              <div className="canvas-absolute-center">
                <ShaderPreview 
                  ref={shaderRef}
                  shaderType={activeShader}
                  presetName={activePreset}
                  imageUrl={gradientDataUrl}
                  width={activeRatio.width}
                  height={activeRatio.height}
                  zoom={zoom}
                  containerHeight={previewFitHeight}
                />
              </div>
            )}
          </motion.div>
        </div>


      </div>
    </div>
  );
}

export default App;
