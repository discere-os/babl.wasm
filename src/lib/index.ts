/**
 * BABL WebAssembly Module - High-Performance Pixel Format Conversion Library
 * Copyright (c) 2005-2024 Øyvind Kolås and BABL contributors
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Licensed under LGPL-3.0+
 *
 * WebAssembly port of BABL with SIMD-optimized color space conversions
 */

import type {
  BablOptions,
  PixelFormat,
  ColorSpace,
  ConversionResult,
  PerformanceMetrics,
  ColorConversionParams,
  ImageInfo,
  BablFish,
  BatchConversionParams,
  SIMDFunctions
} from './types.ts'

import { BablError, BablErrorCode } from './types.ts'

export * from './types.ts'

/**
 * Main BABL WebAssembly class for pixel format conversions
 */
export default class BABL {
  private module: any = null
  private initialized = false
  private simdAvailable = false
  private memoryGrowthEnabled = true

  // Function wrappers for C API
  private _babl_init!: () => void
  private _babl_exit!: () => void
  private _babl_format!: (name: number) => number
  private _babl_fish!: (sourceFormat: number, destFormat: number) => number
  private _babl_process!: (fish: number, source: number, dest: number, pixels: number) => number
  private _malloc!: (size: number) => number
  private _free!: (ptr: number) => void

  // SIMD function wrappers
  private _simdFunctions: SIMDFunctions | null = null

  constructor(private options: BablOptions = {}) {
    this.options = {
      simdOptimizations: true,
      maxMemoryMB: 256,
      debug: false,
      ...options
    }
  }

  /**
   * Initialize the BABL WebAssembly module
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      const wasmBinary = await this.loadWasmBinary()
      const moduleFactory = await this.loadModuleFactory()

      this.module = await moduleFactory({
        wasmBinary,
        locateFile: (path: string) => {
          if (path.endsWith('.wasm')) {
            return new URL('../../install/wasm/' + path, import.meta.url).href
          }
          return path
        }
      })

      // Setup bindings after module is loaded
      this.setupBindings()
      this._babl_init()
      this.simdAvailable = this.detectSIMDSupport()

      if (this.options.debug) {
        console.log(`BABL initialized - SIMD: ${this.simdAvailable}`)
      }

      this.initialized = true
    } catch (error) {
      throw new BablError(
        `Failed to initialize BABL: ${error}`,
        BablErrorCode.INITIALIZATION_FAILED,
        { originalError: error }
      )
    }
  }

  /**
   * Load WASM binary from file system or CDN
   */
  private async loadWasmBinary(): Promise<ArrayBuffer> {
    if (typeof globalThis.Deno !== 'undefined') {
      try {
        const wasmPath = new URL('../../install/wasm/babl-main.wasm', import.meta.url).pathname
        const wasmBuffer = await Deno.readFile(wasmPath)
        return wasmBuffer.buffer
      } catch (error) {
        if (this.options.debug) {
          console.warn('Failed to load local WASM, trying CDN:', error)
        }
      }
    }

    // Fallback to CDN
    const response = await fetch('https://wasm.discere.cloud/npm/@discere-os/babl.wasm/main.wasm')
    if (!response.ok) {
      throw new Error(`Failed to load WASM from CDN: ${response.statusText}`)
    }
    return await response.arrayBuffer()
  }

  /**
   * Load the WebAssembly module factory
   */
  private async loadModuleFactory(): Promise<any> {
    const modulePath = new URL('../../install/wasm/babl-main.js', import.meta.url).href
    const module = await import(modulePath)
    return module.default || module.BablModule
  }

  /**
   * Setup C function bindings using cwrap
   */
  private setupBindings(): void {
    try {
      // Core BABL functions
      this._babl_init = this.module.cwrap('babl_init', 'void', [])
      this._babl_exit = this.module.cwrap('babl_exit', 'void', [])
      this._babl_format = this.module.cwrap('babl_format', 'number', ['string'])
      this._babl_fish = this.module.cwrap('babl_fish', 'number', ['number', 'number'])
      this._babl_process = this.module.cwrap('babl_process', 'number', ['number', 'number', 'number', 'number'])

      // Memory management
      this._malloc = this.module.cwrap('malloc', 'number', ['number'])
      this._free = this.module.cwrap('free', 'void', ['number'])

      // Setup SIMD functions if available
      if (this.options.simdOptimizations) {
        this.setupSIMDBindings()
      }
    } catch (error) {
      throw new BablError(
        'Failed to setup function bindings',
        BablErrorCode.WASM_MODULE_ERROR,
        { originalError: error }
      )
    }
  }

  /**
   * Setup SIMD function bindings
   */
  private setupSIMDBindings(): void {
    try {
      const rgbToXyzSIMD = this.module.cwrap('babl_rgb_to_xyz_simd', 'void', ['number', 'number', 'number'])
      const xyzToLabSIMD = this.module.cwrap('babl_xyz_to_lab_simd', 'void', ['number', 'number', 'number'])
      const u8ToFloatSIMD = this.module.cwrap('babl_u8_to_float_simd', 'void', ['number', 'number', 'number'])
      const floatToU8SIMD = this.module.cwrap('babl_float_to_u8_simd', 'void', ['number', 'number', 'number'])
      const rgbToBgrSIMD = this.module.cwrap('babl_rgb_to_bgr_simd', 'void', ['number', 'number', 'number'])
      const rgbaToRgbSIMD = this.module.cwrap('babl_rgba_to_rgb_simd', 'void', ['number', 'number', 'number'])
      const planarToInterleavedSIMD = this.module.cwrap('babl_planar_to_interleaved_simd', 'void', ['number', 'number', 'number', 'number', 'number'])
      const scaleChannelsSIMD = this.module.cwrap('babl_scale_channels_simd', 'void', ['number', 'number', 'number', 'number', 'number'])
      const pixelCopySIMD = this.module.cwrap('babl_pixel_copy_simd', 'void', ['number', 'number', 'number'])
      const gammaCorrectionSIMD = this.module.cwrap('babl_gamma_correction_simd', 'void', ['number', 'number', 'number'])

      this._simdFunctions = {
        rgbToXyzSIMD: (rgb: Float32Array, xyz: Float32Array, pixelCount: number) => {
          const rgbPtr = this.copyToWasm(rgb)
          const xyzPtr = this._malloc(xyz.length * 4)

          rgbToXyzSIMD(rgbPtr, xyzPtr, pixelCount)

          this.copyFromWasm(xyzPtr, xyz)
          this._free(rgbPtr)
          this._free(xyzPtr)
        },

        xyzToLabSIMD: (xyz: Float32Array, lab: Float32Array, pixelCount: number) => {
          const xyzPtr = this.copyToWasm(xyz)
          const labPtr = this._malloc(lab.length * 4)

          xyzToLabSIMD(xyzPtr, labPtr, pixelCount)

          this.copyFromWasm(labPtr, lab)
          this._free(xyzPtr)
          this._free(labPtr)
        },

        labToXyzSIMD: (lab: Float32Array, xyz: Float32Array, pixelCount: number) => {
          // Implementation would be similar to above
          throw new Error('LAB to XYZ SIMD not implemented yet')
        },

        xyzToRgbSIMD: (xyz: Float32Array, rgb: Float32Array, pixelCount: number) => {
          // Implementation would be similar to above
          throw new Error('XYZ to RGB SIMD not implemented yet')
        },

        u8ToFloatSIMD: (src: Uint8Array, dst: Float32Array, pixelCount: number) => {
          const srcPtr = this.copyToWasm(src)
          const dstPtr = this._malloc(dst.length * 4)

          u8ToFloatSIMD(srcPtr, dstPtr, pixelCount)

          this.copyFromWasm(dstPtr, dst)
          this._free(srcPtr)
          this._free(dstPtr)
        },

        floatToU8SIMD: (src: Float32Array, dst: Uint8Array, pixelCount: number) => {
          const srcPtr = this.copyToWasm(src)
          const dstPtr = this._malloc(dst.length)

          floatToU8SIMD(srcPtr, dstPtr, pixelCount)

          this.copyFromWasm(dstPtr, dst)
          this._free(srcPtr)
          this._free(dstPtr)
        },

        rgbToBgrSIMD: (src: Uint8Array, dst: Uint8Array, pixelCount: number) => {
          const srcPtr = this.copyToWasm(src)
          const dstPtr = this._malloc(dst.length)

          rgbToBgrSIMD(srcPtr, dstPtr, pixelCount)

          this.copyFromWasm(dstPtr, dst)
          this._free(srcPtr)
          this._free(dstPtr)
        },

        rgbaToRgbSIMD: (src: Uint8Array, dst: Uint8Array, pixelCount: number) => {
          const srcPtr = this.copyToWasm(src)
          const dstPtr = this._malloc(dst.length)

          rgbaToRgbSIMD(srcPtr, dstPtr, pixelCount)

          this.copyFromWasm(dstPtr, dst)
          this._free(srcPtr)
          this._free(dstPtr)
        },

        planarToInterleavedSIMD: (rPlane: Uint8Array, gPlane: Uint8Array, bPlane: Uint8Array, rgb: Uint8Array, pixelCount: number) => {
          const rPtr = this.copyToWasm(rPlane)
          const gPtr = this.copyToWasm(gPlane)
          const bPtr = this.copyToWasm(bPlane)
          const rgbPtr = this._malloc(rgb.length)

          planarToInterleavedSIMD(rPtr, gPtr, bPtr, rgbPtr, pixelCount)

          this.copyFromWasm(rgbPtr, rgb)
          this._free(rPtr)
          this._free(gPtr)
          this._free(bPtr)
          this._free(rgbPtr)
        },

        scaleChannelsSIMD: (pixels: Uint8Array, pixelCount: number, rScale: number, gScale: number, bScale: number) => {
          const pixelsPtr = this.copyToWasm(pixels)

          scaleChannelsSIMD(pixelsPtr, pixelCount, rScale, gScale, bScale)

          this.copyFromWasm(pixelsPtr, pixels)
          this._free(pixelsPtr)
        },

        pixelCopySIMD: (src: Uint8Array, dst: Uint8Array, byteCount: number) => {
          const srcPtr = this.copyToWasm(src)
          const dstPtr = this._malloc(dst.length)

          pixelCopySIMD(srcPtr, dstPtr, byteCount)

          this.copyFromWasm(dstPtr, dst)
          this._free(srcPtr)
          this._free(dstPtr)
        },

        gammaCorrectionSIMD: (pixels: Float32Array, pixelCount: number, gamma: number) => {
          const pixelsPtr = this.copyToWasm(pixels)

          gammaCorrectionSIMD(pixelsPtr, pixelCount, gamma)

          this.copyFromWasm(pixelsPtr, pixels)
          this._free(pixelsPtr)
        }
      }
    } catch (error) {
      console.warn('SIMD functions not available, falling back to scalar:', error)
      this._simdFunctions = null
    }
  }

  /**
   * Detect SIMD support in the WebAssembly module
   */
  private detectSIMDSupport(): boolean {
    try {
      if (!this._simdFunctions) return false

      // Try to call the SIMD detection function from C
      const simdDetectFunc = this.module.cwrap('babl_simd_available', 'boolean', [])
      return simdDetectFunc()
    } catch {
      return false
    }
  }

  /**
   * Convert pixels from one format to another
   */
  async convertPixels(
    sourceData: Uint8Array | Float32Array | Float64Array,
    params: ColorConversionParams,
    imageInfo: ImageInfo
  ): Promise<ConversionResult> {
    if (!this.initialized) {
      throw new BablError('BABL not initialized', BablErrorCode.INITIALIZATION_FAILED)
    }

    const startTime = performance.now()

    try {
      // Determine output buffer size
      const outputBytesPerPixel = this.getBytesPerPixel(params.destinationFormat)
      const outputSize = imageInfo.pixelCount * outputBytesPerPixel

      let outputData: Uint8Array | Float32Array | Float64Array

      if (params.destinationFormat.includes('float')) {
        outputData = new Float32Array(imageInfo.pixelCount * this.getChannelCount(params.destinationFormat))
      } else if (params.destinationFormat.includes('double')) {
        outputData = new Float64Array(imageInfo.pixelCount * this.getChannelCount(params.destinationFormat))
      } else {
        outputData = new Uint8Array(outputSize)
      }

      // Try SIMD-optimized conversion first
      const simdUsed = await this.trySIMDConversion(sourceData, outputData, params, imageInfo)

      if (!simdUsed) {
        // Fallback to regular BABL conversion
        await this.performRegularConversion(sourceData, outputData, params, imageInfo)
      }

      const endTime = performance.now()

      return {
        success: true,
        pixelsProcessed: imageInfo.pixelCount,
        data: outputData,
        timeMs: endTime - startTime,
        simdUsed
      }
    } catch (error) {
      const endTime = performance.now()

      return {
        success: false,
        pixelsProcessed: 0,
        data: new Uint8Array(0),
        timeMs: endTime - startTime,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Attempt SIMD-optimized conversion
   */
  private async trySIMDConversion(
    sourceData: Uint8Array | Float32Array | Float64Array,
    outputData: Uint8Array | Float32Array | Float64Array,
    params: ColorConversionParams,
    imageInfo: ImageInfo
  ): Promise<boolean> {
    if (!this._simdFunctions || !this.options.simdOptimizations) {
      return false
    }

    try {
      // Handle common SIMD-optimized conversions
      if (params.sourceFormat === 'RGB float' && params.destinationFormat === 'XYZ float') {
        this._simdFunctions.rgbToXyzSIMD(
          sourceData as Float32Array,
          outputData as Float32Array,
          imageInfo.pixelCount
        )
        return true
      }

      if (params.sourceFormat === 'XYZ float' && params.destinationFormat === 'Lab float') {
        this._simdFunctions.xyzToLabSIMD(
          sourceData as Float32Array,
          outputData as Float32Array,
          imageInfo.pixelCount
        )
        return true
      }

      if (params.sourceFormat === 'RGB u8' && params.destinationFormat === 'RGB float') {
        this._simdFunctions.u8ToFloatSIMD(
          sourceData as Uint8Array,
          outputData as Float32Array,
          sourceData.length
        )
        return true
      }

      if (params.sourceFormat === 'RGB float' && params.destinationFormat === 'RGB u8') {
        this._simdFunctions.floatToU8SIMD(
          sourceData as Float32Array,
          outputData as Uint8Array,
          sourceData.length
        )
        return true
      }

      if (params.sourceFormat === 'RGB u8' && params.destinationFormat === 'BGR u8') {
        this._simdFunctions.rgbToBgrSIMD(
          sourceData as Uint8Array,
          outputData as Uint8Array,
          imageInfo.pixelCount
        )
        return true
      }

      if (params.sourceFormat === 'RGBA u8' && params.destinationFormat === 'RGB u8') {
        this._simdFunctions.rgbaToRgbSIMD(
          sourceData as Uint8Array,
          outputData as Uint8Array,
          imageInfo.pixelCount
        )
        return true
      }

      return false
    } catch (error) {
      if (this.options.debug) {
        console.warn('SIMD conversion failed, falling back to regular:', error)
      }
      return false
    }
  }

  /**
   * Perform regular BABL conversion using fish
   */
  private async performRegularConversion(
    sourceData: Uint8Array | Float32Array | Float64Array,
    outputData: Uint8Array | Float32Array | Float64Array,
    params: ColorConversionParams,
    imageInfo: ImageInfo
  ): Promise<void> {
    // Get format references
    const sourceFormatPtr = this._babl_format(this.stringToPtr(params.sourceFormat))
    const destFormatPtr = this._babl_format(this.stringToPtr(params.destinationFormat))

    if (!sourceFormatPtr || !destFormatPtr) {
      throw new BablError('Invalid format specification', BablErrorCode.INVALID_FORMAT)
    }

    // Create conversion fish
    const fish = this._babl_fish(sourceFormatPtr, destFormatPtr)
    if (!fish) {
      throw new BablError(
        `Unsupported conversion: ${params.sourceFormat} -> ${params.destinationFormat}`,
        BablErrorCode.UNSUPPORTED_CONVERSION
      )
    }

    // Copy data to WASM memory and perform conversion
    const sourcePtr = this.copyToWasm(sourceData)
    const destPtr = this._malloc(outputData.byteLength)

    const result = this._babl_process(fish, sourcePtr, destPtr, imageInfo.pixelCount)
    if (result !== imageInfo.pixelCount) {
      throw new BablError('Conversion failed - pixel count mismatch', BablErrorCode.WASM_MODULE_ERROR)
    }

    // Copy result back
    this.copyFromWasm(destPtr, outputData)

    // Cleanup
    this._free(sourcePtr)
    this._free(destPtr)
  }

  /**
   * Get bytes per pixel for a format
   */
  private getBytesPerPixel(format: PixelFormat): number {
    if (format.includes('u8')) {
      return format.includes('RGBA') ? 4 : format.includes('RGB') ? 3 : 1
    }
    if (format.includes('u16')) {
      return format.includes('RGBA') ? 8 : format.includes('RGB') ? 6 : 2
    }
    if (format.includes('float')) {
      return (format.includes('RGBA') ? 4 : format.includes('RGB') ? 3 : 1) * 4
    }
    if (format.includes('double')) {
      return (format.includes('RGBA') ? 4 : format.includes('RGB') ? 3 : 1) * 8
    }
    return 3 // Default RGB u8
  }

  /**
   * Get channel count for a format
   */
  private getChannelCount(format: PixelFormat): number {
    if (format.includes('RGBA')) return 4
    if (format.includes('RGB')) return 3
    if (format.includes('CMYK')) return 4
    return 1 // Grayscale
  }

  /**
   * Copy data from JavaScript to WASM memory
   */
  private copyToWasm(data: Uint8Array | Float32Array | Float64Array): number {
    const ptr = this._malloc(data.byteLength)
    if (!ptr) {
      throw new BablError('Memory allocation failed', BablErrorCode.MEMORY_ALLOCATION_FAILED)
    }

    if (data instanceof Uint8Array) {
      this.module.HEAPU8.set(data, ptr)
    } else if (data instanceof Float32Array) {
      this.module.HEAPF32.set(data, ptr >> 2)
    } else if (data instanceof Float64Array) {
      this.module.HEAPF64.set(data, ptr >> 3)
    }

    return ptr
  }

  /**
   * Copy data from WASM memory to JavaScript
   */
  private copyFromWasm(ptr: number, data: Uint8Array | Float32Array | Float64Array): void {
    if (data instanceof Uint8Array) {
      data.set(this.module.HEAPU8.subarray(ptr, ptr + data.length))
    } else if (data instanceof Float32Array) {
      data.set(this.module.HEAPF32.subarray(ptr >> 2, (ptr >> 2) + data.length))
    } else if (data instanceof Float64Array) {
      data.set(this.module.HEAPF64.subarray(ptr >> 3, (ptr >> 3) + data.length))
    }
  }

  /**
   * Convert string to WASM memory pointer
   */
  private stringToPtr(str: string): number {
    const bytes = new TextEncoder().encode(str + '\0')
    return this.copyToWasm(bytes)
  }

  /**
   * Get performance metrics for last conversion
   */
  getPerformanceMetrics(): PerformanceMetrics {
    // This would be populated during actual conversions
    return {
      megapixelsPerSecond: 0,
      megabytesPerSecond: 0,
      processingTimeMs: 0,
      memoryUsage: 0
    }
  }

  /**
   * Get SIMD functions for direct access (advanced usage)
   */
  getSIMDFunctions(): SIMDFunctions | null {
    return this._simdFunctions
  }

  /**
   * Check if BABL is initialized
   */
  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Check if SIMD is available and enabled
   */
  isSIMDAvailable(): boolean {
    return this.simdAvailable && this.options.simdOptimizations !== false
  }

  /**
   * Get available pixel formats
   */
  getAvailableFormats(): PixelFormat[] {
    return [
      'RGB u8', 'RGBA u8', 'BGR u8', 'BGRA u8',
      'RGB u16', 'RGBA u16',
      'RGB float', 'RGBA float', 'RGB double', 'RGBA double',
      'Y u8', 'Y float',
      'YUV420P u8', 'YUV422P u8', 'YUV444P u8',
      'Lab float', 'XYZ float', 'HSV float', 'HSL float',
      'CMYK u8', 'CMYK float'
    ]
  }

  /**
   * Get supported color spaces
   */
  getSupportedColorSpaces(): ColorSpace[] {
    return [
      'sRGB', 'Adobe RGB', 'ProPhoto RGB', 'Rec2020', 'Display P3',
      'Lab', 'XYZ', 'Linear RGB'
    ]
  }

  /**
   * Cleanup BABL resources
   */
  cleanup(): void {
    if (this.initialized && this.module) {
      try {
        this._babl_exit()
      } catch (error) {
        console.warn('Error during BABL cleanup:', error)
      }

      this.module = null
      this.initialized = false
      this.simdAvailable = false
      this._simdFunctions = null
    }
  }
}

// Export error classes
export { BablError, BablErrorCode }