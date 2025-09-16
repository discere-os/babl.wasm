import { assert, assertEquals, assertExists } from "@std/assert"
import BABL from "../../src/lib/index.ts"

Deno.test("BABL initialization", async () => {
  const babl = new BABL()

  // Should not be initialized initially
  assert(!babl.isInitialized())

  // Should initialize successfully
  await babl.initialize()
  assertExists(babl)
  assert(babl.isInitialized())

  babl.cleanup()
  assert(!babl.isInitialized())
})

Deno.test("BABL formats and color spaces", async () => {
  const babl = new BABL()
  await babl.initialize()

  const formats = babl.getAvailableFormats()
  assert(formats.length > 0)
  assert(formats.includes("RGB u8"))
  assert(formats.includes("RGB float"))

  const colorSpaces = babl.getSupportedColorSpaces()
  assert(colorSpaces.length > 0)
  assert(colorSpaces.includes("sRGB"))

  babl.cleanup()
})

Deno.test("BABL SIMD detection", async () => {
  const babl = new BABL({ simdOptimizations: true })
  await babl.initialize()

  // SIMD availability depends on the runtime
  const simdAvailable = babl.isSIMDAvailable()
  console.log(`SIMD available: ${simdAvailable}`)

  babl.cleanup()
})

Deno.test("Basic color conversion", async () => {
  const babl = new BABL()
  await babl.initialize()

  // Create simple test data
  const rgbData = new Uint8Array([255, 0, 0, 0, 255, 0, 0, 0, 255]) // Red, Green, Blue pixels
  const imageInfo = {
    width: 3,
    height: 1,
    channels: 3,
    bytesPerPixel: 3,
    pixelCount: 3,
    rowStride: 9,
    format: "RGB u8" as const
  }

  const result = await babl.convertPixels(rgbData, {
    sourceFormat: "RGB u8",
    destinationFormat: "RGB float"
  }, imageInfo)

  assertEquals(result.success, true)
  assertEquals(result.pixelsProcessed, 3)
  assertExists(result.data)
  assert(result.timeMs > 0)

  // Check converted values
  const floatData = result.data as Float32Array
  assertEquals(floatData.length, 9)

  // First pixel should be [1.0, 0.0, 0.0] (red)
  assert(Math.abs(floatData[0] - 1.0) < 0.01)
  assert(Math.abs(floatData[1] - 0.0) < 0.01)
  assert(Math.abs(floatData[2] - 0.0) < 0.01)

  babl.cleanup()
})

Deno.test("Error handling", async () => {
  const babl = new BABL()

  // Should throw error if not initialized
  const rgbData = new Uint8Array([255, 0, 0])
  const imageInfo = {
    width: 1, height: 1, channels: 3, bytesPerPixel: 3,
    pixelCount: 1, rowStride: 3, format: "RGB u8" as const
  }

  try {
    await babl.convertPixels(rgbData, {
      sourceFormat: "RGB u8",
      destinationFormat: "RGB float"
    }, imageInfo)
    assert(false, "Should have thrown error")
  } catch (error) {
    assert(error.message.includes("not initialized"))
  }
})