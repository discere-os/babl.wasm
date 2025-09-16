/**
 * TypeScript type definitions for BABL WebAssembly module
 * Copyright (c) 2005-2024 Øyvind Kolås and BABL contributors
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Licensed under LGPL-3.0+
 */

/**
 * BABL initialization and configuration options
 */
export interface BablOptions {
  /** Enable SIMD optimizations for color conversions (default: true) */
  simdOptimizations?: boolean

  /** Maximum memory usage in megabytes (default: 256) */
  maxMemoryMB?: number

  /** Enable debug logging (default: false) */
  debug?: boolean

  /** Custom color space profiles directory */
  profilesPath?: string
}

/**
 * Supported pixel formats in BABL
 */
export type PixelFormat =
  | "RGB u8"           // 8-bit RGB
  | "RGBA u8"          // 8-bit RGBA
  | "BGR u8"           // 8-bit BGR
  | "BGRA u8"          // 8-bit BGRA
  | "RGB u16"          // 16-bit RGB
  | "RGBA u16"         // 16-bit RGBA
  | "RGB float"        // 32-bit float RGB
  | "RGBA float"       // 32-bit float RGBA
  | "RGB double"       // 64-bit double RGB
  | "RGBA double"      // 64-bit double RGBA
  | "Y u8"             // 8-bit grayscale
  | "Y float"          // Float grayscale
  | "YUV420P u8"       // Planar YUV 4:2:0
  | "YUV422P u8"       // Planar YUV 4:2:2
  | "YUV444P u8"       // Planar YUV 4:4:4
  | "Lab float"        // CIE LAB color space
  | "XYZ float"        // CIE XYZ color space
  | "HSV float"        // HSV color space
  | "HSL float"        // HSL color space
  | "CMYK u8"          // 8-bit CMYK
  | "CMYK float"       // Float CMYK

/**
 * Color space types supported by BABL
 */
export type ColorSpace =
  | "sRGB"             // Standard RGB (most common)
  | "Adobe RGB"        // Adobe RGB color space
  | "ProPhoto RGB"     // ProPhoto RGB (wide gamut)
  | "Rec2020"          // ITU-R BT.2020 (ultra-wide gamut)
  | "Display P3"       // Apple Display P3
  | "Lab"              // CIE LAB
  | "XYZ"              // CIE XYZ
  | "Linear RGB"       // Linear RGB (no gamma)

/**
 * Pixel conversion result
 */
export interface ConversionResult {
  /** Success status */
  success: boolean

  /** Number of pixels converted */
  pixelsProcessed: number

  /** Output data buffer */
  data: Uint8Array | Float32Array | Float64Array

  /** Conversion time in milliseconds */
  timeMs: number

  /** Whether SIMD was used */
  simdUsed?: boolean

  /** Any error message */
  error?: string
}

/**
 * Performance metrics for benchmarking
 */
export interface PerformanceMetrics {
  /** Throughput in megapixels per second */
  megapixelsPerSecond: number

  /** Throughput in megabytes per second */
  megabytesPerSecond: number

  /** Processing time in milliseconds */
  processingTimeMs: number

  /** SIMD speedup factor vs scalar */
  simdSpeedup?: number

  /** Memory usage in bytes */
  memoryUsage: number
}

/**
 * Color conversion parameters
 */
export interface ColorConversionParams {
  /** Source format */
  sourceFormat: PixelFormat

  /** Destination format */
  destinationFormat: PixelFormat

  /** Source color space (optional, inferred if not provided) */
  sourceColorSpace?: ColorSpace

  /** Destination color space (optional, inferred if not provided) */
  destinationColorSpace?: ColorSpace

  /** Gamma correction value (default: 2.2 for sRGB) */
  gamma?: number

  /** Enable gamut mapping for out-of-range colors */
  gamutMapping?: boolean

  /** Rendering intent for color space conversion */
  renderingIntent?: 'perceptual' | 'relative' | 'saturation' | 'absolute'
}

/**
 * Image dimensions and metadata
 */
export interface ImageInfo {
  /** Image width in pixels */
  width: number

  /** Image height in pixels */
  height: number

  /** Number of color channels */
  channels: number

  /** Bytes per pixel */
  bytesPerPixel: number

  /** Total pixel count */
  pixelCount: number

  /** Row stride in bytes */
  rowStride: number

  /** Pixel format */
  format: PixelFormat

  /** Color space */
  colorSpace?: ColorSpace
}

/**
 * BABL Fish (conversion object) interface
 */
export interface BablFish {
  /** Source format reference */
  sourceFormat: string

  /** Destination format reference */
  destinationFormat: string

  /** Whether this fish uses SIMD optimizations */
  simdOptimized: boolean

  /** Expected performance in megapixels/second */
  expectedPerformance?: number
}

/**
 * Batch conversion parameters
 */
export interface BatchConversionParams extends ColorConversionParams {
  /** Images to convert */
  images: Array<{
    data: Uint8Array | Float32Array | Float64Array
    info: ImageInfo
  }>

  /** Whether to process in parallel */
  parallel?: boolean

  /** Progress callback */
  onProgress?: (completed: number, total: number) => void
}

/**
 * SIMD-specific function interfaces for direct access
 */
export interface SIMDFunctions {
  /** RGB to XYZ color space conversion */
  rgbToXyzSIMD(rgb: Float32Array, xyz: Float32Array, pixelCount: number): void

  /** XYZ to LAB color space conversion */
  xyzToLabSIMD(xyz: Float32Array, lab: Float32Array, pixelCount: number): void

  /** LAB to XYZ color space conversion */
  labToXyzSIMD(lab: Float32Array, xyz: Float32Array, pixelCount: number): void

  /** XYZ to RGB color space conversion */
  xyzToRgbSIMD(xyz: Float32Array, rgb: Float32Array, pixelCount: number): void

  /** Gamma correction */
  gammaCorrectionSIMD(pixels: Float32Array, pixelCount: number, gamma: number): void

  /** 8-bit to float conversion */
  u8ToFloatSIMD(src: Uint8Array, dst: Float32Array, pixelCount: number): void

  /** Float to 8-bit conversion */
  floatToU8SIMD(src: Float32Array, dst: Uint8Array, pixelCount: number): void

  /** RGB to BGR channel swizzling */
  rgbToBgrSIMD(src: Uint8Array, dst: Uint8Array, pixelCount: number): void

  /** RGBA to RGB conversion (alpha removal) */
  rgbaToRgbSIMD(src: Uint8Array, dst: Uint8Array, pixelCount: number): void

  /** Planar to interleaved conversion */
  planarToInterleavedSIMD(
    rPlane: Uint8Array,
    gPlane: Uint8Array,
    bPlane: Uint8Array,
    rgb: Uint8Array,
    pixelCount: number
  ): void

  /** Color channel scaling */
  scaleChannelsSIMD(
    pixels: Uint8Array,
    pixelCount: number,
    rScale: number,
    gScale: number,
    bScale: number
  ): void

  /** High-performance pixel copying */
  pixelCopySIMD(src: Uint8Array, dst: Uint8Array, byteCount: number): void
}

/**
 * Error types that can be thrown by BABL operations
 */
export class BablError extends Error {
  constructor(
    message: string,
    public code: BablErrorCode,
    public details?: any
  ) {
    super(message)
    this.name = 'BablError'
  }
}

export enum BablErrorCode {
  INITIALIZATION_FAILED = 'INITIALIZATION_FAILED',
  INVALID_FORMAT = 'INVALID_FORMAT',
  UNSUPPORTED_CONVERSION = 'UNSUPPORTED_CONVERSION',
  MEMORY_ALLOCATION_FAILED = 'MEMORY_ALLOCATION_FAILED',
  SIMD_NOT_AVAILABLE = 'SIMD_NOT_AVAILABLE',
  INVALID_DIMENSIONS = 'INVALID_DIMENSIONS',
  BUFFER_TOO_SMALL = 'BUFFER_TOO_SMALL',
  WASM_MODULE_ERROR = 'WASM_MODULE_ERROR'
}