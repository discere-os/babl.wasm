#!/usr/bin/env -S deno run --allow-read --allow-write

/**
 * BABL WebAssembly Demo
 * Copyright (c) 2005-2024 Øyvind Kolås and BABL contributors
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Licensed under LGPL-3.0+
 */

import BABL from "./src/lib/index.ts"

async function colorConversionDemo() {
  console.log("🎨 BABL WebAssembly Color Conversion Demo")
  console.log("=" + "=".repeat(50))

  const babl = new BABL({
    simdOptimizations: true,
    maxMemoryMB: 128,
    debug: true
  })

  try {
    console.log("📦 Initializing BABL...")
    await babl.initialize()
    console.log("✅ BABL initialized successfully")
    console.log(`🚀 SIMD available: ${babl.isSIMDAvailable()}`)

    // Get available formats and color spaces
    console.log("\n📋 Available pixel formats:")
    const formats = babl.getAvailableFormats()
    formats.slice(0, 10).forEach(format => console.log(`  • ${format}`))
    if (formats.length > 10) {
      console.log(`  ... and ${formats.length - 10} more`)
    }

    console.log("\n🌈 Supported color spaces:")
    const colorSpaces = babl.getSupportedColorSpaces()
    colorSpaces.forEach(space => console.log(`  • ${space}`))

    // Create test RGB data - 4x4 pixel red square
    const width = 4
    const height = 4
    const pixelCount = width * height

    console.log(`\n🖼️  Creating ${width}x${height} test image...`)

    // Generate test RGB data (red gradient)
    const rgbData = new Uint8Array(pixelCount * 3)
    for (let i = 0; i < pixelCount; i++) {
      rgbData[i * 3] = Math.floor(255 * (i / pixelCount))     // R: gradient
      rgbData[i * 3 + 1] = 64                                 // G: constant
      rgbData[i * 3 + 2] = 128                                // B: constant
    }

    const imageInfo = {
      width,
      height,
      channels: 3,
      bytesPerPixel: 3,
      pixelCount,
      rowStride: width * 3,
      format: "RGB u8" as const,
      colorSpace: "sRGB" as const
    }

    // Test 1: RGB to Float conversion
    console.log("\n🔄 Test 1: RGB u8 → RGB float conversion")
    const startTime1 = performance.now()

    const result1 = await babl.convertPixels(rgbData, {
      sourceFormat: "RGB u8",
      destinationFormat: "RGB float",
      sourceColorSpace: "sRGB",
      destinationColorSpace: "sRGB"
    }, imageInfo)

    const elapsed1 = performance.now() - startTime1

    if (result1.success) {
      console.log(`✅ Conversion successful`)
      console.log(`⏱️  Time: ${result1.timeMs.toFixed(2)}ms`)
      console.log(`🚀 SIMD used: ${result1.simdUsed}`)
      console.log(`📊 Pixels processed: ${result1.pixelsProcessed}`)

      const floatData = result1.data as Float32Array
      console.log(`📈 Sample values: [${floatData.slice(0, 6).map(x => x.toFixed(3)).join(', ')}...]`)

      // Calculate throughput
      const megapixelsPerSec = (pixelCount / 1000000) / (elapsed1 / 1000)
      const megabytesPerSec = (rgbData.length / (1024 * 1024)) / (elapsed1 / 1000)
      console.log(`⚡ Performance: ${megapixelsPerSec.toFixed(2)} MP/s, ${megabytesPerSec.toFixed(2)} MB/s`)
    } else {
      console.log(`❌ Conversion failed: ${result1.error}`)
    }

    // Test SIMD functions directly if available
    const simdFunctions = babl.getSIMDFunctions()
    if (simdFunctions) {
      console.log("\n🧮 Test 2: Direct SIMD functions")

      // Test u8 to float conversion
      const testInput = new Uint8Array([255, 128, 64, 255, 0, 128])
      const testOutput = new Float32Array(6)

      const startTime2 = performance.now()
      simdFunctions.u8ToFloatSIMD(testInput, testOutput, testInput.length)
      const elapsed2 = performance.now() - startTime2

      console.log(`✅ Direct SIMD conversion`)
      console.log(`⏱️  Time: ${elapsed2.toFixed(3)}ms`)
      console.log(`📈 Input: [${Array.from(testInput).join(', ')}]`)
      console.log(`📈 Output: [${Array.from(testOutput).map(x => x.toFixed(3)).join(', ')}]`)

      // Test RGB to BGR swizzling
      console.log("\n🔀 Test 3: RGB→BGR channel swizzling")
      const rgbTest = new Uint8Array([255, 0, 0, 0, 255, 0, 0, 0, 255]) // Red, Green, Blue pixels
      const bgrTest = new Uint8Array(9)

      const startTime3 = performance.now()
      simdFunctions.rgbToBgrSIMD(rgbTest, bgrTest, 3)
      const elapsed3 = performance.now() - startTime3

      console.log(`✅ Channel swizzling complete`)
      console.log(`⏱️  Time: ${elapsed3.toFixed(3)}ms`)
      console.log(`📈 RGB: [${Array.from(rgbTest).join(', ')}]`)
      console.log(`📈 BGR: [${Array.from(bgrTest).join(', ')}]`)
    }

    // Performance summary
    console.log("\n📊 Performance Summary:")
    const metrics = babl.getPerformanceMetrics()
    console.log(`   Megapixels/sec: ${metrics.megapixelsPerSecond.toFixed(2)}`)
    console.log(`   Memory usage: ${(metrics.memoryUsage / (1024 * 1024)).toFixed(2)} MB`)

  } catch (error) {
    console.error("❌ Error during demo:", error)
  } finally {
    console.log("\n🧹 Cleaning up...")
    babl.cleanup()
    console.log("✅ Demo completed")
  }
}

async function benchmarkDemo() {
  console.log("\n⚡ Performance Benchmark")
  console.log("-" + "-".repeat(30))

  const babl = new BABL({ simdOptimizations: true })
  await babl.initialize()

  // Large image for benchmarking
  const width = 512
  const height = 512
  const pixelCount = width * height
  const rgbData = new Uint8Array(pixelCount * 3)

  // Fill with test pattern
  for (let i = 0; i < pixelCount; i++) {
    rgbData[i * 3] = (i % 256)
    rgbData[i * 3 + 1] = ((i * 2) % 256)
    rgbData[i * 3 + 2] = ((i * 3) % 256)
  }

  const imageInfo = {
    width, height, channels: 3, bytesPerPixel: 3,
    pixelCount, rowStride: width * 3,
    format: "RGB u8" as const
  }

  console.log(`🖼️  Benchmark image: ${width}x${height} (${(pixelCount / 1000000).toFixed(2)} MP)`)

  // Benchmark multiple iterations
  const iterations = 10
  const startTime = performance.now()

  for (let i = 0; i < iterations; i++) {
    await babl.convertPixels(rgbData, {
      sourceFormat: "RGB u8",
      destinationFormat: "RGB float"
    }, imageInfo)
  }

  const totalTime = performance.now() - startTime
  const avgTime = totalTime / iterations
  const megapixelsPerSec = (pixelCount * iterations / 1000000) / (totalTime / 1000)
  const megabytesPerSec = (rgbData.length * iterations / (1024 * 1024)) / (totalTime / 1000)

  console.log(`📊 Benchmark Results (${iterations} iterations):`)
  console.log(`   Total time: ${totalTime.toFixed(2)}ms`)
  console.log(`   Average time: ${avgTime.toFixed(2)}ms per conversion`)
  console.log(`   Throughput: ${megapixelsPerSec.toFixed(2)} MP/s`)
  console.log(`   Bandwidth: ${megabytesPerSec.toFixed(2)} MB/s`)

  babl.cleanup()
}

if (import.meta.main) {
  await colorConversionDemo()
  await benchmarkDemo()
}