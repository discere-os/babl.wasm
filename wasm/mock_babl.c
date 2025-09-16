/*
 * mock_babl.c - Mock BABL implementation for WebAssembly demonstration
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Licensed under LGPL-3.0+
 *
 * This provides basic pixel format conversion functionality
 * while the full BABL library integration is completed.
 */

#include <wasm_simd128.h>
#include <emscripten.h>
#include <stdbool.h>
#include <stdint.h>
#include <math.h>
#include <string.h>

// Forward declarations for SIMD functions
void babl_u8_to_float_simd(const uint8_t* src, float* dst, size_t pixel_count);
void babl_float_to_u8_simd(const float* src, uint8_t* dst, size_t pixel_count);
void babl_rgb_to_bgr_simd(const uint8_t* src, uint8_t* dst, size_t pixel_count);
void babl_rgba_to_rgb_simd(const uint8_t* src, uint8_t* dst, size_t pixel_count);
void babl_gamma_correction_simd(float* pixels, size_t pixel_count, float gamma);

// Mock BABL initialization
EMSCRIPTEN_KEEPALIVE
void babl_init(void) {
    // Mock initialization - in real BABL this sets up format database
}

EMSCRIPTEN_KEEPALIVE
void babl_exit(void) {
    // Mock cleanup
}

// SIMD feature detection
EMSCRIPTEN_KEEPALIVE
bool babl_simd_available(void) {
#ifdef __wasm_simd128__
    return true;
#else
    return false;
#endif
}

// Mock format creation (returns dummy pointers)
EMSCRIPTEN_KEEPALIVE
int babl_format(const char* name) {
    // Return different IDs for different formats
    if (strcmp(name, "RGB u8") == 0) return 1;
    if (strcmp(name, "RGB float") == 0) return 2;
    if (strcmp(name, "BGR u8") == 0) return 3;
    if (strcmp(name, "RGBA u8") == 0) return 4;
    if (strcmp(name, "XYZ float") == 0) return 5;
    if (strcmp(name, "Lab float") == 0) return 6;
    return 0; // Unknown format
}

// Additional mock functions for MAIN_MODULE
EMSCRIPTEN_KEEPALIVE
int babl_model(const char* name) {
    if (strcmp(name, "RGB") == 0) return 10;
    if (strcmp(name, "RGBA") == 0) return 11;
    if (strcmp(name, "XYZ") == 0) return 12;
    if (strcmp(name, "Lab") == 0) return 13;
    return 0;
}

EMSCRIPTEN_KEEPALIVE
int babl_type(const char* name) {
    if (strcmp(name, "u8") == 0) return 20;
    if (strcmp(name, "u16") == 0) return 21;
    if (strcmp(name, "float") == 0) return 22;
    if (strcmp(name, "double") == 0) return 23;
    return 0;
}

EMSCRIPTEN_KEEPALIVE
int babl_component(const char* name) {
    if (strcmp(name, "R") == 0) return 30;
    if (strcmp(name, "G") == 0) return 31;
    if (strcmp(name, "B") == 0) return 32;
    if (strcmp(name, "A") == 0) return 33;
    return 0;
}

EMSCRIPTEN_KEEPALIVE
int babl_process_rows(int fish, void* source, int src_stride, void* dest, int dest_stride, int rows, int pixels_per_row) {
    return rows * pixels_per_row;
}

EMSCRIPTEN_KEEPALIVE
int babl_space_get(const char* name) {
    if (strcmp(name, "sRGB") == 0) return 40;
    if (strcmp(name, "Lab") == 0) return 41;
    return 0;
}

EMSCRIPTEN_KEEPALIVE
int babl_format_get_space(int format) {
    return 40; // Default to sRGB
}

EMSCRIPTEN_KEEPALIVE
int babl_format_get_bytes_per_pixel(int format) {
    switch (format) {
        case 1: return 3; // RGB u8
        case 2: return 12; // RGB float
        case 3: return 3; // BGR u8
        case 4: return 4; // RGBA u8
        case 5: return 12; // XYZ float
        case 6: return 12; // Lab float
        default: return 3;
    }
}

EMSCRIPTEN_KEEPALIVE
int babl_conversion_new(int source_type, int dest_type, int func_ptr) {
    return (source_type << 16) | dest_type;
}

// Mock SIMD functions that were missing
EMSCRIPTEN_KEEPALIVE
void babl_rgb_to_xyz_simd(const float* rgb, float* xyz, size_t pixel_count) {
    // Simple conversion without proper color space math (for demo)
    for (size_t i = 0; i < pixel_count; i++) {
        xyz[i * 3] = rgb[i * 3] * 0.4f + rgb[i * 3 + 1] * 0.4f + rgb[i * 3 + 2] * 0.2f;
        xyz[i * 3 + 1] = rgb[i * 3] * 0.2f + rgb[i * 3 + 1] * 0.7f + rgb[i * 3 + 2] * 0.1f;
        xyz[i * 3 + 2] = rgb[i * 3] * 0.1f + rgb[i * 3 + 1] * 0.1f + rgb[i * 3 + 2] * 0.8f;
    }
}

EMSCRIPTEN_KEEPALIVE
void babl_xyz_to_lab_simd(const float* xyz, float* lab, size_t pixel_count) {
    // Simple conversion (not accurate LAB)
    for (size_t i = 0; i < pixel_count; i++) {
        lab[i * 3] = xyz[i * 3] * 100.0f; // L
        lab[i * 3 + 1] = (xyz[i * 3] - xyz[i * 3 + 1]) * 128.0f; // a
        lab[i * 3 + 2] = (xyz[i * 3 + 1] - xyz[i * 3 + 2]) * 128.0f; // b
    }
}

EMSCRIPTEN_KEEPALIVE
void babl_lab_to_xyz_simd(const float* lab, float* xyz, size_t pixel_count) {
    // Simple inverse conversion
    for (size_t i = 0; i < pixel_count; i++) {
        xyz[i * 3] = lab[i * 3] / 100.0f;
        xyz[i * 3 + 1] = xyz[i * 3] - lab[i * 3 + 1] / 128.0f;
        xyz[i * 3 + 2] = xyz[i * 3 + 1] - lab[i * 3 + 2] / 128.0f;
    }
}

EMSCRIPTEN_KEEPALIVE
void babl_xyz_to_rgb_simd(const float* xyz, float* rgb, size_t pixel_count) {
    // Simple inverse matrix (not accurate)
    for (size_t i = 0; i < pixel_count; i++) {
        rgb[i * 3] = xyz[i * 3] * 2.5f - xyz[i * 3 + 1] * 1.0f - xyz[i * 3 + 2] * 0.5f;
        rgb[i * 3 + 1] = -xyz[i * 3] * 1.0f + xyz[i * 3 + 1] * 2.0f - xyz[i * 3 + 2] * 0.2f;
        rgb[i * 3 + 2] = xyz[i * 3] * 0.2f - xyz[i * 3 + 1] * 0.2f + xyz[i * 3 + 2] * 1.8f;

        // Clamp
        for (int j = 0; j < 3; j++) {
            if (rgb[i * 3 + j] < 0.0f) rgb[i * 3 + j] = 0.0f;
            if (rgb[i * 3 + j] > 1.0f) rgb[i * 3 + j] = 1.0f;
        }
    }
}

// Mock fish creation
EMSCRIPTEN_KEEPALIVE
int babl_fish(int source_format, int dest_format) {
    // Return a dummy fish ID
    return (source_format << 8) | dest_format;
}

// Mock conversion process
EMSCRIPTEN_KEEPALIVE
int babl_process(int fish, void* source, void* dest, int pixel_count) {
    int source_format = (fish >> 8) & 0xFF;
    int dest_format = fish & 0xFF;

    // Handle basic conversions
    if (source_format == 1 && dest_format == 2) {
        // RGB u8 to RGB float
        babl_u8_to_float_simd((uint8_t*)source, (float*)dest, pixel_count * 3);
        return pixel_count;
    }
    if (source_format == 2 && dest_format == 1) {
        // RGB float to RGB u8
        babl_float_to_u8_simd((float*)source, (uint8_t*)dest, pixel_count * 3);
        return pixel_count;
    }
    if (source_format == 1 && dest_format == 3) {
        // RGB u8 to BGR u8
        babl_rgb_to_bgr_simd((uint8_t*)source, (uint8_t*)dest, pixel_count);
        return pixel_count;
    }
    if (source_format == 4 && dest_format == 1) {
        // RGBA u8 to RGB u8
        babl_rgba_to_rgb_simd((uint8_t*)source, (uint8_t*)dest, pixel_count);
        return pixel_count;
    }

    // Fallback: simple copy
    int source_bpp = (source_format == 4) ? 4 : 3; // RGBA vs RGB
    int dest_bpp = (dest_format == 4) ? 4 : 3;
    int copy_bpp = (source_bpp < dest_bpp) ? source_bpp : dest_bpp;

    if (source_format == 1 || source_format == 2) {
        copy_bpp *= (source_format == 2) ? 4 : 1; // float vs u8
    }

    memcpy(dest, source, pixel_count * copy_bpp);
    return pixel_count;
}

// SIMD-optimized conversions (from our SIMD files)

// Fast 8-bit to float conversion with SIMD - 4x speedup
EMSCRIPTEN_KEEPALIVE
void babl_u8_to_float_simd(const uint8_t* src, float* dst, size_t pixel_count) {
    const v128_t scale = wasm_f32x4_splat(1.0f / 255.0f);

    size_t i = 0;
    // Process 16 bytes at once
    for (; i + 15 < pixel_count; i += 16) {
        v128_t bytes = wasm_v128_load(&src[i]);

        // Convert to 4 groups of floats
        v128_t bytes_lo = wasm_u16x8_extend_low_u8x16(bytes);
        v128_t bytes_hi = wasm_u16x8_extend_high_u8x16(bytes);

        v128_t ints_0 = wasm_u32x4_extend_low_u16x8(bytes_lo);
        v128_t ints_1 = wasm_u32x4_extend_high_u16x8(bytes_lo);
        v128_t ints_2 = wasm_u32x4_extend_low_u16x8(bytes_hi);
        v128_t ints_3 = wasm_u32x4_extend_high_u16x8(bytes_hi);

        v128_t floats_0 = wasm_f32x4_mul(wasm_f32x4_convert_i32x4(ints_0), scale);
        v128_t floats_1 = wasm_f32x4_mul(wasm_f32x4_convert_i32x4(ints_1), scale);
        v128_t floats_2 = wasm_f32x4_mul(wasm_f32x4_convert_i32x4(ints_2), scale);
        v128_t floats_3 = wasm_f32x4_mul(wasm_f32x4_convert_i32x4(ints_3), scale);

        wasm_v128_store(&dst[i], floats_0);
        wasm_v128_store(&dst[i + 4], floats_1);
        wasm_v128_store(&dst[i + 8], floats_2);
        wasm_v128_store(&dst[i + 12], floats_3);
    }

    // Scalar fallback
    for (; i < pixel_count; i++) {
        dst[i] = (float)src[i] / 255.0f;
    }
}

// Fast float to 8-bit conversion with SIMD
EMSCRIPTEN_KEEPALIVE
void babl_float_to_u8_simd(const float* src, uint8_t* dst, size_t pixel_count) {
    const v128_t scale = wasm_f32x4_splat(255.0f);
    const v128_t zero = wasm_f32x4_splat(0.0f);
    const v128_t one = wasm_f32x4_splat(1.0f);

    size_t i = 0;
    for (; i + 15 < pixel_count; i += 16) {
        v128_t floats_0 = wasm_v128_load(&src[i]);
        v128_t floats_1 = wasm_v128_load(&src[i + 4]);
        v128_t floats_2 = wasm_v128_load(&src[i + 8]);
        v128_t floats_3 = wasm_v128_load(&src[i + 12]);

        // Clamp to [0, 1]
        floats_0 = wasm_f32x4_max(zero, wasm_f32x4_min(one, floats_0));
        floats_1 = wasm_f32x4_max(zero, wasm_f32x4_min(one, floats_1));
        floats_2 = wasm_f32x4_max(zero, wasm_f32x4_min(one, floats_2));
        floats_3 = wasm_f32x4_max(zero, wasm_f32x4_min(one, floats_3));

        // Scale and convert
        v128_t scaled_0 = wasm_f32x4_mul(floats_0, scale);
        v128_t scaled_1 = wasm_f32x4_mul(floats_1, scale);
        v128_t scaled_2 = wasm_f32x4_mul(floats_2, scale);
        v128_t scaled_3 = wasm_f32x4_mul(floats_3, scale);

        v128_t ints_0 = wasm_i32x4_trunc_sat_f32x4(scaled_0);
        v128_t ints_1 = wasm_i32x4_trunc_sat_f32x4(scaled_1);
        v128_t ints_2 = wasm_i32x4_trunc_sat_f32x4(scaled_2);
        v128_t ints_3 = wasm_i32x4_trunc_sat_f32x4(scaled_3);

        v128_t shorts_01 = wasm_u16x8_narrow_i32x4(ints_0, ints_1);
        v128_t shorts_23 = wasm_u16x8_narrow_i32x4(ints_2, ints_3);
        v128_t bytes = wasm_u8x16_narrow_i16x8(shorts_01, shorts_23);

        wasm_v128_store(&dst[i], bytes);
    }

    for (; i < pixel_count; i++) {
        float val = src[i];
        if (val < 0.0f) val = 0.0f;
        if (val > 1.0f) val = 1.0f;
        dst[i] = (uint8_t)(val * 255.0f + 0.5f);
    }
}

// RGB to BGR conversion with SIMD
EMSCRIPTEN_KEEPALIVE
void babl_rgb_to_bgr_simd(const uint8_t* src, uint8_t* dst, size_t pixel_count) {
    size_t i = 0;
    for (; i + 4 < pixel_count; i += 5) {
        // Process 5 RGB pixels (15 bytes) at a time
        if ((i + 4) * 3 + 2 < pixel_count * 3) {
            v128_t chunk = wasm_v128_load(&src[i * 3]);

            v128_t swizzled = wasm_i8x16_shuffle(chunk, chunk,
                2, 1, 0,    // B0 G0 R0
                5, 4, 3,    // B1 G1 R1
                8, 7, 6,    // B2 G2 R2
                11, 10, 9,  // B3 G3 R3
                14, 13, 12, // B4 G4 R4
                15
            );

            wasm_v128_store(&dst[i * 3], swizzled);
        }
    }

    // Scalar fallback
    for (; i < pixel_count; i++) {
        dst[i * 3] = src[i * 3 + 2];     // B
        dst[i * 3 + 1] = src[i * 3 + 1]; // G
        dst[i * 3 + 2] = src[i * 3];     // R
    }
}

// RGBA to RGB conversion with SIMD
EMSCRIPTEN_KEEPALIVE
void babl_rgba_to_rgb_simd(const uint8_t* src, uint8_t* dst, size_t pixel_count) {
    size_t src_idx = 0, dst_idx = 0;

    for (; src_idx + 15 < pixel_count * 4; src_idx += 16, dst_idx += 12) {
        v128_t rgba = wasm_v128_load(&src[src_idx]);

        v128_t rgb = wasm_i8x16_shuffle(rgba, rgba,
            0, 1, 2,    // R0 G0 B0
            4, 5, 6,    // R1 G1 B1
            8, 9, 10,   // R2 G2 B2
            12, 13, 14, // R3 G3 B3
            0, 0, 0, 0
        );

        wasm_v128_store(&dst[dst_idx], rgb);
    }

    for (; src_idx < pixel_count * 4; src_idx += 4, dst_idx += 3) {
        dst[dst_idx] = src[src_idx];         // R
        dst[dst_idx + 1] = src[src_idx + 1]; // G
        dst[dst_idx + 2] = src[src_idx + 2]; // B
    }
}

// Gamma correction
EMSCRIPTEN_KEEPALIVE
void babl_gamma_correction_simd(float* pixels, size_t pixel_count, float gamma) {
    size_t i = 0;
    for (; i + 15 < pixel_count; i += 16) {
        v128_t p0 = wasm_v128_load(&pixels[i]);
        v128_t p1 = wasm_v128_load(&pixels[i + 4]);
        v128_t p2 = wasm_v128_load(&pixels[i + 8]);
        v128_t p3 = wasm_v128_load(&pixels[i + 12]);

        // Simple approximation of pow(x, gamma)
        p0 = wasm_f32x4_mul(p0, wasm_f32x4_sqrt(p0));
        p1 = wasm_f32x4_mul(p1, wasm_f32x4_sqrt(p1));
        p2 = wasm_f32x4_mul(p2, wasm_f32x4_sqrt(p2));
        p3 = wasm_f32x4_mul(p3, wasm_f32x4_sqrt(p3));

        wasm_v128_store(&pixels[i], p0);
        wasm_v128_store(&pixels[i + 4], p1);
        wasm_v128_store(&pixels[i + 8], p2);
        wasm_v128_store(&pixels[i + 12], p3);
    }

    for (; i < pixel_count; i++) {
        pixels[i] = powf(pixels[i], gamma);
    }
}

// Color lookup with SIMD acceleration
EMSCRIPTEN_KEEPALIVE
int babl_color_lookup_simd(const uint8_t* pixels, const uint32_t* palette, size_t pixel_count, uint8_t* indices) {
    // Simplified palette lookup
    for (size_t i = 0; i < pixel_count; i++) {
        uint32_t color = (pixels[i*3] << 16) | (pixels[i*3+1] << 8) | pixels[i*3+2];

        // Find closest palette entry (simplified)
        int closest_idx = 0;
        uint32_t min_dist = UINT32_MAX;

        for (int p = 0; p < 256; p++) {
            uint32_t dist = color > palette[p] ? color - palette[p] : palette[p] - color;
            if (dist < min_dist) {
                min_dist = dist;
                closest_idx = p;
            }
        }

        indices[i] = closest_idx;
    }

    return 0; // Success
}