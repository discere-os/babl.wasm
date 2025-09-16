import BABL from "../src/lib/index.ts"

let babl: BABL = new BABL({ simdOptimizations: true })

// Setup before benchmarks
await (async () => {
  await babl.initialize()
  console.log(`BABL initialized - SIMD: ${babl.isSIMDAvailable()}`)
})()

// Test data sizes
const sizes = [
  { name: "64x64", width: 64, height: 64 },
  { name: "256x256", width: 256, height: 256 },
  { name: "512x512", width: 512, height: 512 }
]

// Generate benchmark data
function generateTestData(width: number, height: number): { rgbData: Uint8Array, imageInfo: any } {
  const pixelCount = width * height
  const rgbData = new Uint8Array(pixelCount * 3)

  // Generate test pattern
  for (let i = 0; i < pixelCount; i++) {
    rgbData[i * 3] = (i * 3) % 256
    rgbData[i * 3 + 1] = (i * 5) % 256
    rgbData[i * 3 + 2] = (i * 7) % 256
  }

  const imageInfo = {
    width, height, channels: 3, bytesPerPixel: 3,
    pixelCount, rowStride: width * 3,
    format: "RGB u8" as const
  }

  return { rgbData, imageInfo }
}

// RGB u8 to RGB float conversion benchmarks
for (const size of sizes) {
  const { rgbData, imageInfo } = generateTestData(size.width, size.height)

  Deno.bench(`RGB u8→float ${size.name}`, async () => {
    await babl.convertPixels(rgbData, {
      sourceFormat: "RGB u8",
      destinationFormat: "RGB float"
    }, imageInfo)
  })
}

// RGB u8 to BGR u8 conversion (channel swizzling)
for (const size of sizes.slice(0, 2)) { // Smaller sizes for swizzling test
  const { rgbData, imageInfo } = generateTestData(size.width, size.height)

  Deno.bench(`RGB→BGR ${size.name}`, async () => {
    await babl.convertPixels(rgbData, {
      sourceFormat: "RGB u8",
      destinationFormat: "BGR u8"
    }, imageInfo)
  })
}

// RGBA to RGB conversion (alpha removal)
for (const size of sizes.slice(0, 2)) {
  const pixelCount = size.width * size.height
  const rgbaData = new Uint8Array(pixelCount * 4)

  // Generate RGBA test data
  for (let i = 0; i < pixelCount; i++) {
    rgbaData[i * 4] = (i * 3) % 256     // R
    rgbaData[i * 4 + 1] = (i * 5) % 256 // G
    rgbaData[i * 4 + 2] = (i * 7) % 256 // B
    rgbaData[i * 4 + 3] = 255           // A
  }

  const imageInfo = {
    width: size.width, height: size.height,
    channels: 4, bytesPerPixel: 4,
    pixelCount, rowStride: size.width * 4,
    format: "RGBA u8" as const
  }

  Deno.bench(`RGBA→RGB ${size.name}`, async () => {
    await babl.convertPixels(rgbaData, {
      sourceFormat: "RGBA u8",
      destinationFormat: "RGB u8"
    }, imageInfo)
  })
}

// Direct SIMD function benchmarks
const simdFunctions = babl.getSIMDFunctions()
if (simdFunctions) {
  // u8 to float SIMD benchmark
  const testData = new Uint8Array(1024 * 3) // 1K RGB pixels
  const outputData = new Float32Array(1024 * 3)

  for (let i = 0; i < testData.length; i++) {
    testData[i] = i % 256
  }

  Deno.bench("Direct SIMD u8→float 1K", () => {
    simdFunctions.u8ToFloatSIMD(testData, outputData, testData.length)
  })

  // RGB to BGR SIMD benchmark
  const rgbTest = new Uint8Array(1024 * 3)
  const bgrTest = new Uint8Array(1024 * 3)

  for (let i = 0; i < rgbTest.length; i += 3) {
    rgbTest[i] = (i / 3) % 256
    rgbTest[i + 1] = ((i / 3) * 2) % 256
    rgbTest[i + 2] = ((i / 3) * 3) % 256
  }

  Deno.bench("Direct SIMD RGB→BGR 1K", () => {
    simdFunctions.rgbToBgrSIMD(rgbTest, bgrTest, 1024)
  })

  // Gamma correction benchmark
  const gammaTest = new Float32Array(1024 * 3)
  for (let i = 0; i < gammaTest.length; i++) {
    gammaTest[i] = (i % 256) / 255.0
  }

  Deno.bench("Direct SIMD gamma correction 1K", () => {
    simdFunctions.gammaCorrectionSIMD(gammaTest, gammaTest.length, 2.2)
  })
}

// Cleanup after benchmarks
globalThis.addEventListener("unload", () => {
  babl?.cleanup()
})