# @discere-os/babl.wasm

WebAssembly port of BABL pixel format conversion library with SIMD optimization and modern browser support.

[![CI/CD](https://github.com/discere-os/discere-nucleus/actions/workflows/babl-wasm-ci.yml/badge.svg)](https://github.com/discere-os/discere-nucleus/actions)
[![JSR](https://jsr.io/badges/@discere-os/babl.wasm)](https://jsr.io/@discere-os/babl.wasm)
[![npm version](https://badge.fury.io/js/@discere-os%2Fbabl.wasm.svg)](https://badge.fury.io/js/@discere-os%2Fbabl.wasm)
[![License](https://img.shields.io/badge/License-LGPL--3.0-blue.svg)](COPYING)
[![Status](https://img.shields.io/badge/status-alpha-orange.svg)](https://github.com/discere-os/discere-nucleus)

## Features

- 🚀 **SIMD Acceleration**: 3-5x faster pixel format conversions using WebAssembly SIMD
- 📦 **Dual Build System**: SIDE_MODULE (production) + MAIN_MODULE (testing/NPM)
- 🦕 **Deno-First**: Direct TypeScript execution, zero build steps for development
- 🌐 **CDN Distribution**: Global edge deployment via `wasm.discere.cloud`
- ⚡ **High Performance**: 100+ MB/s throughput for common conversions
- 🎨 **Comprehensive Support**: RGB, RGBA, BGR, XYZ, LAB, HSV color spaces
- 🔧 **Type Safety**: Complete TypeScript definitions with JSDoc documentation

## Quick Start

### Deno (Recommended)

```typescript
import BABL from "https://jsr.io/@discere-os/babl.wasm"

const babl = new BABL({ simdOptimizations: true })
await babl.initialize()

// Convert RGB bytes to float
const rgbData = new Uint8Array([255, 0, 0, 0, 255, 0, 0, 0, 255])
const result = await babl.convertPixels(rgbData, {
  sourceFormat: "RGB u8",
  destinationFormat: "RGB float"
}, {
  width: 3, height: 1, channels: 3,
  bytesPerPixel: 3, pixelCount: 3, rowStride: 9,
  format: "RGB u8"
})

console.log('Conversion result:', result.success)
console.log('SIMD used:', result.simdUsed)
```

### Node.js/NPM

```bash
npm install @discere-os/babl.wasm
```

```typescript
import BABL from '@discere-os/babl.wasm'

const babl = new BABL()
await babl.initialize()

const converted = await babl.convertPixels(/* ... */)
```

### Browser (CDN)

```html
<script type="module">
  import BABL from 'https://cdn.jsdelivr.net/npm/@discere-os/babl.wasm/esm/lib/index.js'

  const babl = new BABL()
  await babl.initialize()
  // Use babl...
</script>
```

## Supported Formats

### Pixel Formats
- **8-bit**: RGB u8, RGBA u8, BGR u8, BGRA u8, Y u8
- **16-bit**: RGB u16, RGBA u16
- **Float**: RGB float, RGBA float, XYZ float, Lab float, HSV float, HSL float
- **Double**: RGB double, RGBA double
- **Planar**: YUV420P u8, YUV422P u8, YUV444P u8
- **Print**: CMYK u8, CMYK float

### Color Spaces
- **Standard**: sRGB, Adobe RGB, ProPhoto RGB
- **Wide Gamut**: Rec2020, Display P3
- **Scientific**: CIE XYZ, CIE LAB, Linear RGB
- **Artistic**: HSV, HSL

## Performance

### SIMD Acceleration Results

| Operation | Standard | SIMD | Speedup |
|-----------|----------|------|---------|
| RGB u8→float | 25 MB/s | 120 MB/s | **4.8×** |
| Float→u8 | 30 MB/s | 130 MB/s | **4.3×** |
| RGB→BGR | 200 MB/s | 650 MB/s | **3.3×** |
| RGBA→RGB | 180 MB/s | 580 MB/s | **3.2×** |
| Gamma correction | 45 MB/s | 220 MB/s | **4.9×** |

*Benchmarked on Intel i9-14900HX with Chrome 131+*

### Browser Requirements

**✅ Fully Supported** (WASM SIMD):
- Chrome 91+ (Desktop & Android)
- Edge 91+
- Firefox 89+
- Safari 16.4+

**❌ Not Supported**:
- Internet Explorer
- Legacy mobile browsers (pre-2021)

## API Reference

### Core Class

```typescript
class BABL {
  constructor(options?: BablOptions)

  // Lifecycle
  async initialize(): Promise<void>
  cleanup(): void

  // Conversion
  async convertPixels(
    sourceData: Uint8Array | Float32Array | Float64Array,
    params: ColorConversionParams,
    imageInfo: ImageInfo
  ): Promise<ConversionResult>

  // Information
  getAvailableFormats(): PixelFormat[]
  getSupportedColorSpaces(): ColorSpace[]
  isSIMDAvailable(): boolean
  isInitialized(): boolean

  // Advanced
  getSIMDFunctions(): SIMDFunctions | null
  getPerformanceMetrics(): PerformanceMetrics
}
```

### Options

```typescript
interface BablOptions {
  simdOptimizations?: boolean    // Enable SIMD (default: true)
  maxMemoryMB?: number          // Memory limit (default: 256)
  debug?: boolean               // Debug logging (default: false)
  profilesPath?: string         // Color profiles directory
}
```

### Conversion Parameters

```typescript
interface ColorConversionParams {
  sourceFormat: PixelFormat
  destinationFormat: PixelFormat
  sourceColorSpace?: ColorSpace
  destinationColorSpace?: ColorSpace
  gamma?: number                // Gamma correction (default: 2.2)
  gamutMapping?: boolean        // Handle out-of-gamut colors
  renderingIntent?: 'perceptual' | 'relative' | 'saturation' | 'absolute'
}
```

## Advanced Usage

### Direct SIMD Functions

For maximum performance, access SIMD functions directly:

```typescript
const simd = babl.getSIMDFunctions()
if (simd) {
  const input = new Uint8Array([255, 128, 64])
  const output = new Float32Array(3)

  simd.u8ToFloatSIMD(input, output, 3)
  console.log('Direct SIMD result:', output) // [1.0, 0.502, 0.251]
}
```

### Batch Processing

```typescript
const images = [/* array of image data */]
const results = []

for (const image of images) {
  const result = await babl.convertPixels(image.data, {
    sourceFormat: "RGB u8",
    destinationFormat: "Lab float"
  }, image.info)

  results.push(result)
}
```

### Performance Monitoring

```typescript
const metrics = babl.getPerformanceMetrics()
console.log(`Throughput: ${metrics.megabytesPerSecond.toFixed(1)} MB/s`)
console.log(`SIMD speedup: ${metrics.simdSpeedup?.toFixed(1)}×`)
```

## Architecture

### Dual Build System

**SIDE_MODULE** (Production - 5.9KB):
- Dynamically loaded by host applications
- Optimized for size and loading speed
- Deployed to `wasm.discere.cloud` CDN

**MAIN_MODULE** (Testing/NPM - 17KB):
- Self-contained with all dependencies
- Used for testing, demos, and NPM distribution
- Includes complete runtime and type definitions

### WASM-Native Design

This library is built specifically for WebAssembly with:
- Native SIMD instruction usage
- Browser-optimized memory management
- Async loading with integrity verification
- Progressive enhancement (SIMD detection)

## Development

### Prerequisites

- **Deno 2.0+**: Primary runtime
- **Emscripten 4.0+**: WebAssembly compilation
- **Chrome/Edge 113+**: Testing with WebGPU + SIMD

### Building

```bash
# Clone repository
git clone https://github.com/discere-os/discere-nucleus.git
cd client/emscripten/babl.wasm

# Build WebAssembly modules
./build-dual.sh all

# Run tests
deno task test

# Run benchmarks
deno task bench

# Build NPM package
deno task build:npm
```

### Project Structure

```
babl.wasm/
├── src/lib/           # TypeScript API
├── wasm/              # C source with SIMD optimizations
├── tests/deno/        # Deno test suite
├── bench/             # Performance benchmarks
├── install/wasm/      # Built WebAssembly modules
├── build-dual.sh      # Dual build system
└── deno.json          # Deno configuration
```

## Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Build and test** (`deno task build:wasm && deno task test`)
4. **Commit** changes (`git commit -m 'Add amazing feature'`)
5. **Push** to branch (`git push origin feature/amazing-feature`)
6. **Open** a Pull Request

### Code Standards

- **TypeScript**: Strict mode, complete type definitions
- **Performance**: Maintain 3x+ SIMD speedup for core operations
- **Testing**: 100% test coverage for public API
- **Documentation**: JSDoc for all public methods

## License

**Original BABL Library**: LGPL-3.0+ (Copyright 2005-2024 Øyvind Kolås and contributors)
**WebAssembly Port**: LGPL-3.0+ compatible (Copyright 2025 Superstruct Ltd, New Zealand)

This library is free software; you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation; either version 3 of the License, or (at your option) any later version.

## Links

- **Homepage**: [wasm.discere.cloud/babl](https://wasm.discere.cloud/babl)
- **Repository**: [GitHub](https://github.com/discere-os/discere-nucleus/tree/main/client/emscripten/babl.wasm)
- **Issues**: [GitHub Issues](https://github.com/discere-os/discere-nucleus/issues)
- **Original BABL**: [GNOME BABL](https://github.com/GNOME/babl)
- **JSR Package**: [@discere-os/babl.wasm](https://jsr.io/@discere-os/babl.wasm)
- **NPM Package**: [@discere-os/babl.wasm](https://www.npmjs.com/package/@discere-os/babl.wasm)