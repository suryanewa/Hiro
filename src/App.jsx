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
import GradientCanvas, { RAPID_PREVIEW_MAX_DIMENSION, BLUR_SCRUB_PREVIEW_MAX_DIMENSION } from './GradientCanvas';
import HiroLogoMark from './HiroLogoMark';
import ShaderPreview from './ShaderPreview';
import { exportBackground } from './exportBackground';
import {
  BLEND_MODES,
  DEFAULT_COLORS,
  LIMITS,
  RATIOS,
  SHADER_OPTIONS,
  SHADER_PRESETS,
  VIBRANCY_OPTIONS,
  createRandomGradientConfig,
  generateDifferentPalette,
  generateVividPalette,
} from './api/index.js';

const RATIO_ICONS = {
  '16:9': Monitor,
  '1:1': Square,
  '9:16': Smartphone,
  Web: Layout,
};

const RATIOS_WITH_ICONS = RATIOS.map((ratio) => ({
  ...ratio,
  icon: RATIO_ICONS[ratio.label] ?? Layout,
}));

const SPACE_SHORTCUT_INTERACTIVE_ROLES = new Set([
  'button',
  'switch',
  'slider',
  'combobox',
  'menuitem',
  'option',
  'textbox',
]);

const isSpaceShortcutTarget = (target) => {
  if (!target || typeof target.closest !== 'function') {
    return false;
  }

  if (target.closest('input, textarea, select, button, a[href], [contenteditable="true"]')) {
    return true;
  }

  const role = target.closest('[role]')?.getAttribute('role')?.toLowerCase();
  return role ? role.split(/\s+/).some((roleName) => SPACE_SHORTCUT_INTERACTIVE_ROLES.has(roleName)) : false;
};

function TakiSlider({ value, min = 0, max = 100, step = 1, onChange, onScrubStart, onScrubEnd }) {
  const scrubbingRef = useRef(false);

  const endScrub = useCallback(() => {
    if (!scrubbingRef.current) return;
    scrubbingRef.current = false;
    window.removeEventListener('pointerup', endScrub);
    window.removeEventListener('pointercancel', endScrub);
    onScrubEnd?.();
  }, [onScrubEnd]);

  const startScrub = useCallback(() => {
    if (scrubbingRef.current) return;
    scrubbingRef.current = true;
    window.addEventListener('pointerup', endScrub);
    window.addEventListener('pointercancel', endScrub);
    onScrubStart?.();
  }, [onScrubStart, endScrub]);

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
        <SliderPrimitive.Control
          className="taki-slider-wrapper"
          onPointerDown={startScrub}
        >
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

function LockableLabel({ children, locked, onToggle }) {
  return (
    <button
      type="button"
      className={`control-label lockable-label${locked ? ' locked' : ''}`}
      aria-pressed={locked}
      title={locked ? `${children} locked for remix` : `Lock ${children} for remix`}
      onPointerDown={(e) => {
        e.preventDefault();
      }}
      onClick={onToggle}
    >
      {children}
    </button>
  );
}

function AnimatedSelect({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find(o => o.value === value)?.label || value;

  return (
    <div className="animated-select">
      <div className="setting-row">
        {typeof label === 'string' ? <label className="control-label">{label}</label> : label}
        <div className="animated-select-trigger-wrap">
          <button
            type="button"
            className="animated-select-trigger"
            onClick={() => setOpen(!open)}
            title={selectedLabel}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {!open && (
                <motion.span
                  className="animated-select-value"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                >
                  {selectedLabel}
                </motion.span>
              )}
            </AnimatePresence>
            <ChevronDown
              size={16}
              className="animated-select-chevron"
              style={{
                transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="animated-select-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.65, 0, 0.35, 1] }}
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`animated-select-option${value === opt.value ? ' is-selected' : ''}`}
                title={opt.label}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                <span className="animated-select-option-label">{opt.label}</span>
                {value === opt.value && (
                  <Check size={16} color="var(--accent)" className="animated-select-check" />
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
  const [activeRatio, setActiveRatio] = useState(RATIOS_WITH_ICONS[0]);
  const [seed, setSeed] = useState(Math.random());
  const [isBlurred, setIsBlurred] = useState(true);
  const [blurStrength, setBlurStrength] = useState(100);
  const [blendMode, setBlendMode] = useState('source-over');
  const [vibrancy, setVibrancy] = useState('vibrant');
  const [vividOnly, setVividOnly] = useState(false);
  const [activeShader, setActiveShader] = useState('none');
  const [activePreset, setActivePreset] = useState('');
  const [hoveredRatio, setHoveredRatio] = useState(null);
  const [hoveredPreset, setHoveredPreset] = useState(null);
  const [gradientDataUrl, setGradientDataUrl] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [showRing, setShowRing] = useState(false);
  const [frameThickness, setFrameThickness] = useState(12);
  const [isRapidRandomizing, setIsRapidRandomizing] = useState(false);
  const [isBlurScrubbing, setIsBlurScrubbing] = useState(false);
  const [isShaderHandoffPending, setIsShaderHandoffPending] = useState(false);
  const [renderGeneration, setRenderGeneration] = useState(0);
  const [lockedParams, setLockedParams] = useState({});
  
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
  const pendingShaderHandoffGenerationRef = useRef(0);
  const colorsRef = useRef(colors);
  const activeShaderRef = useRef(activeShader);
  const activePresetRef = useRef(activePreset);
  const blurStrengthRef = useRef(blurStrength);
  const frameThicknessRef = useRef(frameThickness);
  const isBlurredRef = useRef(isBlurred);
  const vibrancyRef = useRef(vibrancy);
  const vividOnlyRef = useRef(vividOnly);
  const blendModeRef = useRef(blendMode);
  const lockedParamsRef = useRef(lockedParams);
  colorsRef.current = colors;
  isRapidRandomizingRef.current = isRapidRandomizing;
  renderGenerationRef.current = renderGeneration;
  activeShaderRef.current = activeShader;
  activePresetRef.current = activePreset;
  blurStrengthRef.current = blurStrength;
  frameThicknessRef.current = frameThickness;
  isBlurredRef.current = isBlurred;
  vibrancyRef.current = vibrancy;
  vividOnlyRef.current = vividOnly;
  blendModeRef.current = blendMode;
  lockedParamsRef.current = lockedParams;

  const toggleParamLock = useCallback((param) => {
    setLockedParams((prev) => ({
      ...prev,
      [param]: !prev[param],
    }));
  }, []);

  const completeShaderHandoff = useCallback((generation) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (pendingShaderHandoffGenerationRef.current !== generation) return;
        pendingShaderHandoffGenerationRef.current = 0;
        setIsShaderHandoffPending(false);
      });
    });
  }, []);

  const handleBlurScrubStart = useCallback(() => {
    pendingShaderHandoffGenerationRef.current = 0;
    setIsShaderHandoffPending(false);
    setIsBlurScrubbing(true);
  }, []);

  const handleBlurScrubEnd = useCallback(() => {
    setIsBlurScrubbing(false);

    renderGenerationRef.current += 1;
    const generation = renderGenerationRef.current;
    setRenderGeneration(generation);

    if (activeShaderRef.current !== 'none') {
      pendingShaderHandoffGenerationRef.current = generation;
      setIsShaderHandoffPending(true);
    }
  }, []);

  const canvasOnTop = isBlurScrubbing || isRapidRandomizing || isShaderHandoffPending;
  const isInteractivePreview = isBlurScrubbing || isRapidRandomizing;

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

    const locks = lockedParamsRef.current;
    const randomVibrancy = locks.vibrancy
      ? vibrancyRef.current
      : VIBRANCY_OPTIONS[Math.floor(Math.random() * VIBRANCY_OPTIONS.length)].value;
    const randomVividOnly = locks.vividOnly
      ? vividOnlyRef.current
      : Math.random() >= 0.5;
    const prevColors = fast || locks.colors ? undefined : colorsRef.current;
    const nextConfig = createRandomGradientConfig({
      vibrancy: randomVibrancy,
      previousColors: prevColors,
      colors: locks.colors ? colorsRef.current : undefined,
      blurStrength: locks.blurStrength ? blurStrengthRef.current : undefined,
      isBlurred: locks.blurStrength ? isBlurredRef.current : undefined,
      frameThickness: locks.frameThickness ? frameThicknessRef.current : undefined,
      blendMode: locks.blendMode ? blendModeRef.current : undefined,
      activeShader: locks.shader ? activeShaderRef.current : undefined,
      activePreset: locks.shader ? activePresetRef.current : undefined,
      includeShader: locks.shader ? false : undefined,
      vividOnly: randomVividOnly,
    });

    setColors(nextConfig.colors);
    setSeed(nextConfig.seed);
    setBlurStrength(nextConfig.blurStrength);
    setIsBlurred(nextConfig.isBlurred);
    setVibrancy(randomVibrancy);
    setVividOnly(randomVividOnly);
    setBlendMode(nextConfig.blendMode);
    setShowRing(nextConfig.showRing);
    setFrameThickness(nextConfig.frameThickness);
    setActiveShader(nextConfig.activeShader);
    setActivePreset(nextConfig.activePreset);
  }, []);

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

    if (generation === pendingShaderHandoffGenerationRef.current) {
      completeShaderHandoff(generation);
    }
  }, [completeShaderHandoff]);

  const RAPID_RANDOMIZE_MS = 80;
  const RAPID_ACTIVATE_MS = 150;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && !isSpaceShortcutTarget(e.target)) {
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

    const result = exportBackground({
      colors,
      seed,
      width: activeRatio.width,
      height: activeRatio.height,
      ratioLabel: activeRatio.label,
      isBlurred,
      blurStrength,
      blendMode,
      showRing,
      frameThickness,
      activeShader,
      activePreset,
      presetParams: preset?.params ?? {},
      gradientDataUrl,
      getDisplayedDataUrl: () => activeRef.current?.exportToDataURL?.() ?? null,
    });

    if (!result.ok) {
      window.alert(result.error?.message ?? 'Export failed.');
    }
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
        <header className="sidebar-header">
          <div className="sidebar-title">
            <HiroLogoMark
              colors={colors}
              seed={seed}
              isBlurred={isBlurred}
              blurStrength={blurStrength}
              blendMode={blendMode}
              showRing={showRing}
              frameThickness={frameThickness}
              width={activeRatio.width}
              height={activeRatio.height}
            />
            <span className="logo-text">Hiro</span>
          </div>
        </header>

        <div className="control-group">
          <TakiSwitch
            label={(
              <span onClick={(event) => event.stopPropagation()}>
                <LockableLabel locked={!!lockedParams.vividOnly} onToggle={() => toggleParamLock('vividOnly')}>
                  Vivid
                </LockableLabel>
              </span>
            )}
            checked={vividOnly}
            onChange={setVividOnly}
          />
          <div className="control-header">
            <LockableLabel locked={!!lockedParams.colors} onToggle={() => toggleParamLock('colors')}>
              Colors
            </LockableLabel>
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

        {showRing && (
          <div className="control-group">
            <div className="slider-header">
              <LockableLabel locked={!!lockedParams.frameThickness} onToggle={() => toggleParamLock('frameThickness')}>
                Frame Thickness
              </LockableLabel>
              <span className="slider-value">{frameThickness}%</span>
            </div>
            <TakiSlider
              value={frameThickness}
              min={LIMITS.minFrameThickness}
              max={LIMITS.maxFrameThickness}
              onChange={setFrameThickness}
            />
          </div>
        )}

        <div className="control-group">
          <div className="slider-header">
            <LockableLabel locked={!!lockedParams.blurStrength} onToggle={() => toggleParamLock('blurStrength')}>
              Blur Strength
            </LockableLabel>
            <span className="slider-value">{blurStrength}%</span>
          </div>
          <TakiSlider 
            value={blurStrength}
            min={0}
            max={100}
            onScrubStart={handleBlurScrubStart}
            onScrubEnd={handleBlurScrubEnd}
            onChange={(val) => {
              setBlurStrength(val);
              if (val > 0) {
                setIsBlurred(true);
              }
            }}
          />
        </div>

        <AnimatedSelect
          label={(
            <LockableLabel locked={!!lockedParams.vibrancy} onToggle={() => toggleParamLock('vibrancy')}>
              Vibrancy
            </LockableLabel>
          )}
          value={vibrancy}
          options={VIBRANCY_OPTIONS}
          onChange={(val) => {
            setVibrancy(val);
            setColors(prevColors => (
              vividOnlyRef.current
                ? generateVividPalette(prevColors.length, val, Math.random, prevColors)
                : generateDifferentPalette(prevColors.length, val, prevColors)
            ));
          }}
        />

        <AnimatedSelect
          label={(
            <LockableLabel locked={!!lockedParams.blendMode} onToggle={() => toggleParamLock('blendMode')}>
              Blend Mode
            </LockableLabel>
          )}
          value={blendMode}
          options={BLEND_MODES}
          onChange={(val) => setBlendMode(val)}
        />

        <div className="control-group">
          <AnimatedSelect
            label={(
              <LockableLabel locked={!!lockedParams.shader} onToggle={() => toggleParamLock('shader')}>
                Shader
              </LockableLabel>
            )}
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
                    title={preset.name}
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
              {RATIOS_WITH_ICONS.map((ratio) => {
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
                visibility: activeShader === 'none' || canvasOnTop ? 'visible' : 'hidden',
                zIndex: canvasOnTop ? 2 : 1,
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
                frameThickness={frameThickness}
                previewMaxDimension={
                  isBlurScrubbing
                    ? BLUR_SCRUB_PREVIEW_MAX_DIMENSION
                    : isRapidRandomizing
                      ? RAPID_PREVIEW_MAX_DIMENSION
                      : null
                }
                coalesceRenders={isInteractivePreview}
                captureForShader={activeShader !== 'none' && !isBlurScrubbing}
                renderGeneration={renderGeneration}
                latestGenerationRef={renderGenerationRef}
              />
            </div>

            {activeShader !== 'none' && (
              <div className="canvas-absolute-center" style={{ zIndex: 1 }}>
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
