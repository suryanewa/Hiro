import React, { useState, useRef, useEffect } from 'react';
import { Download, RefreshCw, Plus, Trash2, Monitor, Smartphone, Square, Layout } from 'lucide-react';
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

const DEFAULT_COLORS = ['#0f172a', '#3b82f6', '#8b5cf6', '#000000'];

const RATIOS = [
  { label: '16:9', width: 1920, height: 1080, icon: Monitor },
  { label: '1:1', width: 1080, height: 1080, icon: Square },
  { label: '9:16', width: 1080, height: 1920, icon: Smartphone },
  { label: 'Web', width: 1440, height: 900, icon: Layout },
];

const BLEND_MODES = [
  { label: 'Dynamic (Mix)', value: 'dynamic' },
  { label: 'Normal', value: 'source-over' },
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

const hslToHex = (h, s, l) => {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

const generateHarmonicPalette = (count) => {
  const baseHue = Math.floor(Math.random() * 360);
  const scheme = Math.floor(Math.random() * 4); // 0: Analogous, 1: Triadic, 2: Split Complementary, 3: Monochromatic
  
  const newColors = [];
  for (let i = 0; i < count; i++) {
    let h, s, l;
    
    s = 60 + Math.random() * 40; // 60-100% saturation for striking colors
    l = 40 + Math.random() * 40; // 40-80% lightness
    
    // Introduce an occasional dark or very light accent color for contrast
    if (i === count - 1 && Math.random() > 0.5) {
       l = Math.random() > 0.5 ? 15 + Math.random() * 10 : 85 + Math.random() * 10;
       s = 80 + Math.random() * 20;
    }

    if (scheme === 0) {
      h = (baseHue + (i * 30) + (Math.random() * 10 - 5)) % 360;
    } else if (scheme === 1) {
      h = (baseHue + (i * 120)) % 360;
      if (i >= 3) h = (h + 30) % 360; 
      h = (h + (Math.random() * 10 - 5)) % 360;
    } else if (scheme === 2) {
      if (i === 0) h = baseHue;
      else if (i % 2 === 1) h = (baseHue + 150) % 360;
      else h = (baseHue + 210) % 360;
      h = (h + (Math.random() * 20 - 10)) % 360;
    } else {
      h = (baseHue + (Math.random() * 20 - 10)) % 360;
      s = 50 + Math.random() * 50;
      l = 20 + (i * (60 / Math.max(1, count - 1))) + (Math.random() * 10 - 5);
    }
    
    if (h < 0) h += 360;
    newColors.push(hslToHex(h, s, l));
  }
  return newColors;
};
function App() {
  const [colors, setColors] = useState([...DEFAULT_COLORS]);
  const [activeRatio, setActiveRatio] = useState(RATIOS[0]);
  const [seed, setSeed] = useState(Math.random());
  const [isBlurred, setIsBlurred] = useState(true);
  const [blurStrength, setBlurStrength] = useState(100);
  const [blendMode, setBlendMode] = useState('dynamic');
  const [activeShader, setActiveShader] = useState('none');
  const [activePreset, setActivePreset] = useState('');
  const [gradientDataUrl, setGradientDataUrl] = useState(null);
  
  const canvasRef = useRef(null);
  const shaderRef = useRef(null);

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
    setColors(prevColors => generateHarmonicPalette(prevColors.length));

    // Randomize blur strength between 45 and 100, and ensure blur is enabled
    setBlurStrength(Math.floor(Math.random() * 56) + 45);
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
            Gradients
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
          />
        )}
      </div>
    </div>
  );
}

export default App;
