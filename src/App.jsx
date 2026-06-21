import React, { useState, useRef, useEffect } from 'react';
import { Download, RefreshCw, Plus, Trash2, Monitor, Smartphone, Square, Layout, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import GradientCanvas from './GradientCanvas';
import ShaderPreview from './ShaderPreview';
import { 
  paperTexturePresets, 
  flutedGlassPresets, 
  waterPresets, 
  imageDitheringPresets, 
  halftoneDotsPresets, 
  halftoneCmykPresets 
} from '@paper-design/shaders-react';
import { rybHsl2rgb } from 'rybitten';

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

const SHADER_PRESETS = {
  'paper-texture': paperTexturePresets.filter(p => p.name !== 'Cardboard' && p.name !== 'Details'),
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
  const [gradientDataUrl, setGradientDataUrl] = useState(null);
  const [zoom, setZoom] = useState(1);
  
  const canvasRef = useRef(null);
  const shaderRef = useRef(null);

  useEffect(() => {
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

  const handleColorChange = (index, value) => {
    const newColors = [...colors];
    newColors[index] = value;
    setColors(newColors);
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

  const randomize = () => {
    setSeed(Math.random());
    
    const vibrancyOptions = ['subtle', 'normal', 'vibrant'];
    const randomVibrancy = vibrancyOptions[Math.floor(Math.random() * vibrancyOptions.length)];
    setVibrancy(randomVibrancy);

    const randomCount = Math.floor(Math.random() * 5) + 2; // Between 2 and 6 colors
    setColors(generateHarmonicPalette(randomCount, randomVibrancy));

    // Randomize blur strength between 50 and 75, and ensure blur is enabled
    setBlurStrength(Math.floor(Math.random() * 26) + 50);
    setIsBlurred(true);

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
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        randomize();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleExport = () => {
    const activeRef = activeShader === 'none' ? canvasRef : shaderRef;
    if (activeRef.current) {
      const dataUrl = activeRef.current.exportToDataURL();
      if (dataUrl) {
        const link = document.createElement('a');
        link.download = `gradient-${Date.now()}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Controls */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h1 className="sidebar-title">
            <div style={{
              width: 24, height: 24, borderRadius: 6,
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)'
            }} />
            Hiro
          </h1>
        </div>

        <div className="control-group">
          <div className="control-header">
            <label className="control-label">Brand Colors</label>
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
                <input 
                  type="color" 
                  value={c} 
                  onChange={(e) => handleColorChange(i, e.target.value)}
                  className="color-picker"
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
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="control-group">
          <div className="slider-header">
            <label className="control-label" style={{ marginBottom: 0 }}>Blur Strength</label>
            <span className="slider-value">{blurStrength}%</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={blurStrength} 
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              setBlurStrength(val);
              if (val > 0) {
                setIsBlurred(true);
              }
            }}
            className="range-input"
          />
        </div>

        <div className="control-group">
          <label className="control-label">Vibrancy</label>
          <select 
            value={vibrancy} 
            onChange={(e) => {
              const val = e.target.value;
              setVibrancy(val);
              setColors(prevColors => generateHarmonicPalette(prevColors.length, val));
            }}
            className="select-input"
          >
            <option value="subtle">Subtle</option>
            <option value="normal">Normal</option>
            <option value="vibrant">Vibrant</option>
          </select>
        </div>

        <div className="control-group">
          <label className="control-label">Blend Mode</label>
          <select 
            value={blendMode} 
            onChange={(e) => setBlendMode(e.target.value)}
            className="select-input"
          >
            {BLEND_MODES.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label className="control-label">Shader Overlay</label>
          <select 
            value={activeShader} 
            onChange={(e) => handleShaderChange(e.target.value)}
            className="select-input"
          >
            <option value="none">None</option>
            <option value="paper-texture">Paper Texture</option>
            <option value="fluted-glass">Fluted Glass</option>
            <option value="water">Water</option>
            <option value="image-dithering">Image Dithering</option>
            <option value="halftone-dots">Halftone Dots</option>
            <option value="halftone-cmyk">Halftone CMYK</option>
          </select>

          {activeShader !== 'none' && SHADER_PRESETS[activeShader] && SHADER_PRESETS[activeShader].length > 1 && (
            <div className="preset-grid">
              {SHADER_PRESETS[activeShader].map((preset) => (
                <button
                  key={preset.name}
                  className={`preset-btn ${activePreset === preset.name ? 'active' : ''}`}
                  onClick={() => setActivePreset(preset.name)}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="control-group" style={{ marginTop: 'auto' }}>
          <label className="control-label">Aspect Ratio</label>
          <div className="aspect-ratios">
            {RATIOS.map((ratio) => {
              const Icon = ratio.icon;
              return (
                <button
                  key={ratio.label}
                  className={`ratio-btn ${activeRatio.label === ratio.label ? 'active' : ''}`}
                  onClick={() => setActiveRatio(ratio)}
                >
                  <Icon size={18} strokeWidth={2} />
                  {ratio.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="control-group" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          <button className="btn-secondary" onClick={randomize}>
            <RefreshCw size={18} />
            Randomize
          </button>
          
          <button className="btn-primary" onClick={handleExport}>
            <Download size={18} />
            Export
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="main-content">
        <div className="preview-scroll-container">
          <div style={{ display: activeShader === 'none' ? 'block' : 'none' }}>
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
              onRender={setGradientDataUrl}
              zoom={zoom}
            />
          </div>

          {activeShader !== 'none' && (
            <ShaderPreview 
              ref={shaderRef}
              shaderType={activeShader}
              presetName={activePreset}
              imageUrl={gradientDataUrl}
              width={activeRatio.width}
              height={activeRatio.height}
              zoom={zoom}
            />
          )}
        </div>

        {/* Zoom Controls */}
        <div className="zoom-controls">
          <button 
            className="zoom-btn" 
            onClick={() => setZoom(prev => Math.max(0.25, prev - 0.25))}
            disabled={zoom <= 0.25}
            title="Zoom Out"
          >
            <ZoomOut size={16} />
          </button>
          <span 
            className="zoom-text" 
            onClick={() => setZoom(1)}
            title="Reset Zoom (Fit)"
          >
            {Math.round(zoom * 100)}%
          </span>
          <button 
            className="zoom-btn" 
            onClick={() => setZoom(prev => Math.min(4.0, prev + 0.25))}
            disabled={zoom >= 4.0}
            title="Zoom In"
          >
            <ZoomIn size={16} />
          </button>
          <button 
            className="zoom-btn" 
            onClick={() => setZoom(1)}
            disabled={zoom === 1}
            title="Fit to Screen"
          >
            <Maximize size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
