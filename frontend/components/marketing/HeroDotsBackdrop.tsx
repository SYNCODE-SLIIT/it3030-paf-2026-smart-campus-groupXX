'use client';

import React from 'react';

type RGB = [number, number, number];

type Dot = {
  x: number;
  y: number;
  phase: number;
  size: number;
  driftX: number;
  driftY: number;
  energy: number;
};

type Palette = {
  accent: RGB;
  background: RGB;
  base: RGB;
  warm: RGB;
};

const DEFAULT_FOCUS = { x: 0.5, y: 0.38 };
const FALLBACK_PALETTE: Palette = {
  accent: [238, 202, 68],
  background: [250, 249, 246],
  base: [94, 91, 84],
  warm: [255, 232, 122],
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}

function easeOutCubic(value: number) {
  return 1 - (1 - value) ** 3;
}

function easeInOutSine(value: number) {
  return -(Math.cos(Math.PI * value) - 1) * 0.5;
}

function noise(value: number) {
  const sine = Math.sin(value * 12.9898) * 43758.5453;
  return sine - Math.floor(sine);
}

function parseHexColor(value: string) {
  const normalized = value.trim();
  const hex = normalized.startsWith('#') ? normalized.slice(1) : normalized;

  if (hex.length !== 3 && hex.length !== 6) {
    return null;
  }

  const expanded = hex.length === 3
    ? hex
        .split('')
        .map((part) => `${part}${part}`)
        .join('')
    : hex;

  const number = Number.parseInt(expanded, 16);

  if (Number.isNaN(number)) {
    return null;
  }

  return [
    (number >> 16) & 255,
    (number >> 8) & 255,
    number & 255,
  ] as RGB;
}

function parseCssColor(value: string, fallback: RGB): RGB {
  const hexMatch = parseHexColor(value);
  if (hexMatch) {
    return hexMatch;
  }

  const rgbMatch = value.match(/rgba?\(([^)]+)\)/i);
  if (!rgbMatch) {
    return fallback;
  }

  const channels = rgbMatch[1]
    .split(',')
    .slice(0, 3)
    .map((part) => Number.parseFloat(part.trim()));

  if (channels.length !== 3 || channels.some((channel) => Number.isNaN(channel))) {
    return fallback;
  }

  return [channels[0], channels[1], channels[2]] as RGB;
}

function mixRgb(first: RGB, second: RGB, amount: number): RGB {
  const mix = clamp(amount, 0, 1);

  return [
    lerp(first[0], second[0], mix),
    lerp(first[1], second[1], mix),
    lerp(first[2], second[2], mix),
  ] as RGB;
}

function rgba(color: RGB, alpha: number) {
  const [red, green, blue] = color;

  return `rgba(${Math.round(red)}, ${Math.round(green)}, ${Math.round(blue)}, ${alpha})`;
}

function createDots(width: number, height: number, spacing: number) {
  const dots: Dot[] = [];
  const columnCount = Math.ceil(width / spacing) + 2;
  const rowCount = Math.ceil(height / spacing) + 2;

  for (let row = 0; row < rowCount; row += 1) {
    for (let column = 0; column < columnCount; column += 1) {
      const seed = row * 131 + column * 17;
      const offsetX = (noise(seed) - 0.5) * spacing * 0.62;
      const offsetY = (noise(seed + 1.7) - 0.5) * spacing * 0.62;
      const stagger = row % 2 === 0 ? 0 : spacing * 0.5;

      dots.push({
        x: column * spacing + stagger + offsetX,
        y: row * spacing + offsetY,
        phase: noise(seed + 3.4) * Math.PI * 2,
        size: 0.85 + noise(seed + 5.1) * 0.8,
        driftX: 0.5 + noise(seed + 7.2) * 1.5,
        driftY: 0.45 + noise(seed + 8.9) * 1.35,
        energy: noise(seed + 11.4),
      });
    }
  }

  return dots;
}

function drawGlow(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: RGB,
  alpha: number,
) {
  const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, rgba(color, alpha));
  gradient.addColorStop(0.55, rgba(color, alpha * 0.36));
  gradient.addColorStop(1, rgba(color, 0));
  context.fillStyle = gradient;
  context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

function bindMediaQuery(query: MediaQueryList, listener: () => void) {
  if ('addEventListener' in query) {
    query.addEventListener('change', listener);

    return () => {
      query.removeEventListener('change', listener);
    };
  }

  const legacyQuery = query as MediaQueryList & {
    addListener: (listener: () => void) => void;
    removeListener: (listener: () => void) => void;
  };

  legacyQuery.addListener(listener);

  return () => {
    legacyQuery.removeListener(listener);
  };
}

export function HeroDotsBackdrop({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const dotsRef = React.useRef<Dot[]>([]);
  const animationFrameRef = React.useRef<number | null>(null);
  const paletteRef = React.useRef<Palette>(FALLBACK_PALETTE);
  const canvasMetricsRef = React.useRef({ dpr: 1, height: 0, width: 0 });
  const stateRef = React.useRef({
    coarsePointer: false,
    inView: true,
    pointerActive: false,
    reducedMotion: false,
    targetX: DEFAULT_FOCUS.x,
    targetY: DEFAULT_FOCUS.y,
    x: DEFAULT_FOCUS.x,
    y: DEFAULT_FOCUS.y,
  });

  React.useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;

    if (!wrapper || !canvas) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    const root = document.documentElement;
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const coarsePointerQuery = window.matchMedia('(pointer: coarse)');
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const syncPalette = () => {
      const styles = getComputedStyle(root);

      paletteRef.current = {
        accent: parseCssColor(styles.getPropertyValue('--yellow-400'), FALLBACK_PALETTE.accent),
        background: parseCssColor(styles.getPropertyValue('--bg'), FALLBACK_PALETTE.background),
        base: parseCssColor(styles.getPropertyValue('--text-body'), FALLBACK_PALETTE.base),
        warm: parseCssColor(styles.getPropertyValue('--yellow-200'), FALLBACK_PALETTE.warm),
      };
    };

    const syncPreferences = () => {
      stateRef.current.reducedMotion = reducedMotionQuery.matches;
      stateRef.current.coarsePointer = coarsePointerQuery.matches;
    };

    const resizeCanvas = () => {
      const rect = wrapper.getBoundingClientRect();
      const width = Math.max(Math.round(rect.width), 1);
      const height = Math.max(Math.round(rect.height), 1);
      const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
      const spacing = width < 720 || stateRef.current.coarsePointer ? 30 : width < 1080 ? 25 : 23;

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      canvasMetricsRef.current = { dpr, height, width };
      dotsRef.current = createDots(width, height, spacing);
    };

    syncPalette();
    syncPreferences();
    resizeCanvas();

    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });

    resizeObserver.observe(wrapper);

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        stateRef.current.inView = Boolean(entry?.isIntersecting);
      },
      { threshold: 0.08 },
    );

    intersectionObserver.observe(wrapper);

    const handleMediaChange = () => {
      syncPalette();
      syncPreferences();
      resizeCanvas();
    };

    const unbindReducedMotion = bindMediaQuery(reducedMotionQuery, handleMediaChange);
    const unbindCoarsePointer = bindMediaQuery(coarsePointerQuery, handleMediaChange);
    const unbindDarkMode = bindMediaQuery(darkModeQuery, handleMediaChange);

    const render = (time: number) => {
      animationFrameRef.current = window.requestAnimationFrame(render);

      if (!stateRef.current.inView) {
        return;
      }

      const { dpr, height, width } = canvasMetricsRef.current;
      if (!width || !height) {
        return;
      }

      const palette = paletteRef.current;
      const state = stateRef.current;
      const minDimension = Math.min(width, height);
      const cycle = (time / 6000) % 1;
      const breathing = easeInOutSine(cycle);
      const ringRadius = lerp(
        minDimension * (state.coarsePointer ? 0.18 : 0.2),
        minDimension * (state.coarsePointer ? 0.28 : 0.32),
        breathing,
      );
      const ringThickness = minDimension * (state.coarsePointer ? 0.28 : 0.38);
      const edgeBand = minDimension * (state.coarsePointer ? 0.05 : 0.06);
      const echoBand = minDimension * (state.coarsePointer ? 0.09 : 0.11);
      const hoverRadius = minDimension * (state.coarsePointer ? 0.22 : 0.3);
      const waveRadius = ringRadius - ringThickness * 0.32 + cycle * ringThickness * 0.64;
      const idleOrbit = state.reducedMotion || state.pointerActive ? 0 : minDimension * 0.016;

      state.x = lerp(state.x, state.targetX, state.pointerActive ? 0.14 : 0.045);
      state.y = lerp(state.y, state.targetY, state.pointerActive ? 0.14 : 0.045);

      const pointerX = state.x * width + Math.sin(time * 0.00023) * idleOrbit;
      const pointerY = state.y * height + Math.cos(time * 0.00019) * idleOrbit * 0.85;
      const ringColor = mixRgb(palette.accent, palette.warm, 0.18);
      const accentGlow = 0.085 + breathing * 0.03;
      const warmGlow = 0.075 + (1 - breathing) * 0.025;

      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      drawGlow(context, width * 0.14, height * 0.16, Math.max(width, height) * 0.38, palette.warm, warmGlow);
      drawGlow(context, width * 0.86, height * 0.2, Math.max(width, height) * 0.36, palette.accent, accentGlow);
      drawGlow(context, width * 0.82, height * 0.82, Math.max(width, height) * 0.32, palette.warm, 0.05);
      drawGlow(
        context,
        pointerX,
        pointerY,
        ringRadius + ringThickness * 0.55,
        ringColor,
        state.pointerActive ? 0.12 : 0.075,
      );

      for (const dot of dotsRef.current) {
        const dx = dot.x - pointerX;
        const dy = dot.y - pointerY;
        const distance = Math.hypot(dx, dy) || 1;
        const bandProximity = clamp(1 - Math.abs(distance - ringRadius) / ringThickness, 0, 1);
        const bandStrength = easeOutCubic(bandProximity);
        const ringProximity = clamp(1 - Math.abs(distance - ringRadius) / edgeBand, 0, 1);
        const ringStrength = easeOutCubic(ringProximity);
        const echoProximity = clamp(1 - Math.abs(distance - waveRadius) / echoBand, 0, 1);
        const echoStrength = state.reducedMotion ? bandStrength * 0.2 : easeOutCubic(echoProximity);
        const pointerStrength = state.pointerActive
          ? easeOutCubic(clamp(1 - distance / hoverRadius, 0, 1))
          : 0;
        const ambientDriftX = state.reducedMotion ? 0 : Math.sin(time * 0.00092 + dot.phase) * dot.driftX;
        const ambientDriftY = state.reducedMotion ? 0 : Math.cos(time * 0.00078 + dot.phase * 1.2) * dot.driftY;
        const ambientPulse = state.reducedMotion ? 0.5 : 0.5 + 0.5 * Math.sin(time * 0.00105 + dot.phase * 1.4);
        const offsetStrength = bandStrength * 3.2 + ringStrength * 8.5 + echoStrength * 3.5 + pointerStrength * 2.4;
        const normalX = dx / distance;
        const normalY = dy / distance;
        const tangentX = -normalY;
        const tangentY = normalX;
        const drawX = dot.x + normalX * offsetStrength + tangentX * (ringStrength * 1.4 + echoStrength * 0.9) + ambientDriftX;
        const drawY = dot.y + normalY * offsetStrength + tangentY * (ringStrength * 1.4 + echoStrength * 0.9) + ambientDriftY;
        const emphasizedColor = mixRgb(
          mixRgb(palette.base, palette.accent, 0.22 + bandStrength * 0.18 + ringStrength * 0.42 + echoStrength * 0.14),
          palette.warm,
          ringStrength * 0.18 + echoStrength * 0.08,
        );
        const dotAlpha = clamp(
          0.11 + ambientPulse * 0.045 + dot.energy * 0.02 + bandStrength * 0.1 + ringStrength * 0.18 + echoStrength * 0.09 + pointerStrength * 0.05,
          0,
          0.48,
        );
        const dotSize = dot.size + ambientPulse * 0.12 + bandStrength * 0.36 + ringStrength * 0.74 + echoStrength * 0.28 + pointerStrength * 0.2;

        if (ringStrength > 0.16 || echoStrength > 0.2) {
          context.beginPath();
          context.arc(drawX, drawY, dotSize * 2.2, 0, Math.PI * 2);
          context.fillStyle = rgba(ringColor, 0.012 + ringStrength * 0.05 + echoStrength * 0.025);
          context.fill();
        }

        context.beginPath();
        context.arc(drawX, drawY, dotSize, 0, Math.PI * 2);
        context.fillStyle = rgba(emphasizedColor, dotAlpha);
        context.fill();
      }

      const centerFade = context.createRadialGradient(
        width * 0.5,
        height * 0.44,
        0,
        width * 0.5,
        height * 0.44,
        Math.min(width, height) * 0.84,
      );
      centerFade.addColorStop(0, rgba(palette.background, 0.72));
      centerFade.addColorStop(0.34, rgba(palette.background, 0.4));
      centerFade.addColorStop(0.76, rgba(palette.background, 0.06));
      centerFade.addColorStop(1, rgba(palette.background, 0));
      context.fillStyle = centerFade;
      context.fillRect(0, 0, width, height);

      const verticalFade = context.createLinearGradient(0, 0, 0, height);
      verticalFade.addColorStop(0, rgba(palette.background, 0.14));
      verticalFade.addColorStop(0.16, rgba(palette.background, 0.03));
      verticalFade.addColorStop(0.84, rgba(palette.background, 0.03));
      verticalFade.addColorStop(1, rgba(palette.background, 0.18));
      context.fillStyle = verticalFade;
      context.fillRect(0, 0, width, height);
    };

    animationFrameRef.current = window.requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }

      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      unbindReducedMotion();
      unbindCoarsePointer();
      unbindDarkMode();
    };
  }, []);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const wrapper = wrapperRef.current;
    if (!wrapper) {
      return;
    }

    const rect = wrapper.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }

    stateRef.current.pointerActive = true;
    stateRef.current.targetX = clamp((event.clientX - rect.left) / rect.width, 0.04, 0.96);
    stateRef.current.targetY = clamp((event.clientY - rect.top) / rect.height, 0.08, 0.92);
  };

  const resetPointer = () => {
    stateRef.current.pointerActive = false;
    stateRef.current.targetX = DEFAULT_FOCUS.x;
    stateRef.current.targetY = DEFAULT_FOCUS.y;
  };

  return (
    <div
      ref={wrapperRef}
      onPointerEnter={handlePointerMove}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointer}
      style={{
        position: 'relative',
        overflow: 'hidden',
        isolation: 'isolate',
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}
