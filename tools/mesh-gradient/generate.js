#!/usr/bin/env node
import puppeteer from 'puppeteer';
import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Curated color palettes - moody, ambient tones
const COLOR_PALETTES = [
  // Aurora (the one you loved)
  ['#43cea2', '#185a9d', '#42275a', '#734b6d'],
  // Deep ocean
  ['#0f2027', '#203a43', '#2c5364', '#0abde3'],
  // Twilight
  ['#141e30', '#243b55', '#4a569d', '#dc2430'],
  // Northern lights
  ['#1a2a6c', '#b21f1f', '#2c3e50', '#4ca1af'],
  // Mystic purple
  ['#200122', '#6f0000', '#360033', '#0b486b'],
  // Deep space
  ['#000428', '#004e92', '#1a0530', '#5b247a'],
  // Moody sunset
  ['#1f1c2c', '#928dab', '#c33764', '#1d2671'],
  // Forest night
  ['#0f0c29', '#302b63', '#24243e', '#0cebeb'],
  // Ember
  ['#200122', '#991430', '#40e0d0', '#1d2671'],
  // Cosmic
  ['#0f0c29', '#302b63', '#24243e', '#8e2de2'],
  // Abyss
  ['#232526', '#414345', '#1e3c72', '#2a5298'],
  // Dusk
  ['#2c3e50', '#4ca1af', '#c4e0e5', '#3a1c71'],
];

// Only subtle texture shapes - no visible blobs/spheres
const GRAIN_SHAPES = ['ripple', 'wave'];

// Random utilities
function random(min, max) {
  return Math.random() * (max - min) + min;
}

function randomInt(min, max) {
  return Math.floor(random(min, max + 1));
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffleArray(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function generateRandomConfig() {
  const palette = randomChoice(COLOR_PALETTES);
  const meshColors = shuffleArray(palette);
  const grainColors = shuffleArray(palette).slice(0, randomInt(3, 4));

  return {
    // Mesh gradient settings - smooth, flowing
    mesh: {
      colors: meshColors,
      distortion: random(0.3, 0.6),      // Lower for smoother look
      swirl: random(0.05, 0.2),          // Subtle swirl
      grainMixer: random(0, 0.08),       // Minimal grain in mesh
      grainOverlay: random(0, 0.05),
      frame: randomInt(0, 50000),
      scale: random(0.9, 1.15),          // Tighter scale range
      rotation: randomInt(0, 360),
      offsetX: random(-0.15, 0.15),
      offsetY: random(-0.15, 0.15),
    },
    // Grain gradient settings - just subtle texture, no visible shapes
    grain: {
      colors: grainColors,
      colorBack: 'transparent',
      softness: random(0.7, 1.0),        // Very soft, blurred
      intensity: random(0.1, 0.3),       // Low intensity
      noise: random(0.15, 0.35),         // Grainy texture
      shape: randomChoice(GRAIN_SHAPES),
      frame: randomInt(0, 30000),
      scale: random(1.0, 1.5),           // Larger scale = less defined
      rotation: randomInt(0, 360),
    },
    // Blend settings - subtle overlay
    grainOpacity: random(0.15, 0.28),
    grainBlendMode: randomChoice(['screen', 'screen', 'soft-light', 'overlay']), // 50% chance screen
  };
}

async function buildReactBundle() {
  const reactCode = `
    import React from 'react';
    import { createRoot } from 'react-dom/client';
    import { MeshGradient, GrainGradient } from '@paper-design/shaders-react';

    window.renderGradients = (config) => {
      // Render mesh gradient (base layer)
      const meshContainer = document.getElementById('mesh-container');
      meshContainer.innerHTML = '';
      const meshRoot = createRoot(meshContainer);
      meshRoot.render(
        React.createElement(MeshGradient, {
          width: config.width,
          height: config.height,
          colors: config.mesh.colors,
          distortion: config.mesh.distortion,
          swirl: config.mesh.swirl,
          grainMixer: config.mesh.grainMixer,
          grainOverlay: config.mesh.grainOverlay,
          speed: 0,
          frame: config.mesh.frame,
          scale: config.mesh.scale,
          rotation: config.mesh.rotation,
          offsetX: config.mesh.offsetX,
          offsetY: config.mesh.offsetY,
        })
      );

      // Render grain gradient (overlay)
      const grainContainer = document.getElementById('grain-container');
      grainContainer.innerHTML = '';
      const grainRoot = createRoot(grainContainer);
      grainRoot.render(
        React.createElement(GrainGradient, {
          width: config.width,
          height: config.height,
          colors: config.grain.colors,
          colorBack: config.grain.colorBack,
          softness: config.grain.softness,
          intensity: config.grain.intensity,
          noise: config.grain.noise,
          shape: config.grain.shape,
          speed: 0,
          frame: config.grain.frame,
          scale: config.grain.scale,
          rotation: config.grain.rotation,
        })
      );
    };
  `;

  const result = await esbuild.build({
    stdin: {
      contents: reactCode,
      resolveDir: __dirname,
      loader: 'jsx',
    },
    bundle: true,
    format: 'iife',
    write: false,
    minify: true,
  });

  return result.outputFiles[0].text;
}

async function generateGradient(config, outputPath) {
  const width = config.width || 1200;
  const height = config.height || 630;

  console.log(`Generating gradient: ${outputPath}`);
  console.log(`  Size: ${width}x${height}`);
  console.log(`  Mesh colors: ${config.mesh.colors.join(', ')}`);
  console.log(`  Grain shape: ${config.grain.shape}`);
  console.log(`  Blend: ${config.grainBlendMode} @ ${(config.grainOpacity * 100).toFixed(0)}%`);

  const bundleCode = await buildReactBundle();

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          * { margin: 0; padding: 0; }
          body { overflow: hidden; background: #000; }
          .gradient-layer {
            position: absolute;
            top: 0;
            left: 0;
            width: ${width}px;
            height: ${height}px;
          }
          #mesh-container { z-index: 1; }
          #grain-container {
            z-index: 2;
            opacity: ${config.grainOpacity};
            mix-blend-mode: ${config.grainBlendMode};
          }
          .gradient-layer canvas { display: block; }
        </style>
      </head>
      <body>
        <div id="mesh-container" class="gradient-layer"></div>
        <div id="grain-container" class="gradient-layer"></div>
        <script>${bundleCode}</script>
        <script>
          window.renderGradients(${JSON.stringify({ ...config, width, height })});
        </script>
      </body>
    </html>
  `;

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.setViewport({
    width,
    height,
    deviceScaleFactor: 1,
  });

  await page.setContent(html, { waitUntil: 'networkidle0' });

  // Wait for WebGL to render both layers
  await new Promise(resolve => setTimeout(resolve, 800));

  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  await page.screenshot({
    path: outputPath,
    type: outputPath.endsWith('.png') ? 'png' : 'jpeg',
    quality: outputPath.endsWith('.png') ? undefined : 90,
  });

  await browser.close();
  console.log(`  ✓ Saved: ${outputPath}`);
}

// CLI usage
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage: node generate.js [options] <output>

Generates a unique layered gradient (MeshGradient + GrainGradient overlay).
Each run produces a randomized result unless --seed is provided.

Options:
  --width <n>         Image width (default: 1200)
  --height <n>        Image height (default: 630)
  --seed <n>          Random seed for reproducible results
  --config <file>     JSON config file (overrides randomization)
  --print-config      Print the generated config to stdout

Examples:
  node generate.js output.png                    # Random gradient
  node generate.js --seed 42 output.png          # Reproducible gradient
  node generate.js --print-config output.png     # See what was generated
`);
  process.exit(0);
}

// Parse CLI arguments
let outputPath = null;
let width = 1200;
let height = 630;
let seed = null;
let configFile = null;
let printConfig = false;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  if (arg === '--config' && args[i + 1]) {
    configFile = args[++i];
  } else if (arg === '--width' && args[i + 1]) {
    width = parseInt(args[++i], 10);
  } else if (arg === '--height' && args[i + 1]) {
    height = parseInt(args[++i], 10);
  } else if (arg === '--seed' && args[i + 1]) {
    seed = parseInt(args[++i], 10);
  } else if (arg === '--print-config') {
    printConfig = true;
  } else if (!arg.startsWith('-')) {
    outputPath = arg;
  }
}

if (!outputPath) {
  console.error('Error: No output path specified');
  process.exit(1);
}

// Resolve output path
if (!path.isAbsolute(outputPath)) {
  outputPath = path.resolve(process.cwd(), outputPath);
}

// Generate or load config
let config;
if (configFile) {
  config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
} else {
  // Seed the random generator if specified
  if (seed !== null) {
    // Simple seeded random (mulberry32)
    let s = seed;
    Math.random = () => {
      s |= 0; s = s + 0x6D2B79F5 | 0;
      let t = Math.imul(s ^ s >>> 15, 1 | s);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  config = generateRandomConfig();
}

config.width = width;
config.height = height;

if (printConfig) {
  console.log('\nGenerated config:');
  console.log(JSON.stringify(config, null, 2));
  console.log('');
}

generateGradient(config, outputPath).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
