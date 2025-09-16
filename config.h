/*
 * config.h - Configuration header for BABL WebAssembly build
 * Copyright (c) 2005-2024 Øyvind Kolås and BABL contributors
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Licensed under LGPL-3.0+
 */

#ifndef BABL_CONFIG_H
#define BABL_CONFIG_H

/* Version information */
#define BABL_MAJOR_VERSION 0
#define BABL_MINOR_VERSION 1
#define BABL_MICRO_VERSION 115
#define BABL_INTERFACE_AGE "1"
#define BABL_BINARY_AGE "115"
#define BABL_VERSION "0.1.115"
#define BABL_REAL_VERSION "0.1.115"
#define BABL_API_VERSION "0.1"
#define BABL_RELEASE "0.1"
#define BABL_LIBRARY_VERSION "115:1:115"
#define BABL_CURRENT_MINUS_AGE "0"
#define BABL_LIBRARY "babl-0.1"

/* Stability */
#define BABL_UNSTABLE 1

/* Architecture - WebAssembly */
#define ARCH_WASM 1

/* Standard headers availability */
#define HAVE_STDINT_H 1
#define HAVE_STDLIB_H 1
#define HAVE_STRING_H 1
#define HAVE_UNISTD_H 1
#define HAVE_MATH_H 1
#define HAVE_FLOAT_H 1
#define HAVE_LIMITS_H 1

/* Math functions */
#define HAVE_LROUND 1
#define HAVE_RINT 1
#define HAVE_ROUND 1
#define HAVE_LRINT 1

/* Threading - Use Emscripten pthread support */
#define HAVE_PTHREADS 1

/* Disable features not needed for WebAssembly */
#define HAVE_GETTIMEOFDAY 1
#define HAVE_STRUCT_TM_TM_GMTOFF 0
#define HAVE_TM_GMTOFF 0

/* Platform-specific settings for WebAssembly */
#define BABL_PATH_SEPARATOR "/"
#define BABL_LIBRARY_PREFIX ""
#define BABL_LIBRARY_SUFFIX ".wasm"

/* Disable dynamic loading - everything is compiled in */
#define BABL_STATIC_COMPILATION 1

/* Enable SIMD optimizations for WebAssembly */
#ifdef __wasm_simd128__
#define BABL_ENABLE_SIMD 1
#define HAVE_WASM_SIMD 1
#endif

/* Disable features that aren't available in WebAssembly */
#define HAVE_MMAP 0
#define HAVE_DLOPEN 0
#define HAVE_SHARED_LIBRARY 0

/* Endianness - WebAssembly is little endian */
#define BABL_LITTLE_ENDIAN 1

/* Memory alignment */
#define BABL_ALIGN(x) __attribute__((aligned(x)))

/* Enable debug assertions in debug builds */
#ifdef DEBUG
#define BABL_DEBUG 1
#endif

/* Extensions directory - not used in WASM builds */
#define BABL_EXTENSION_DIR ""

/* Pixel conversion optimizations */
#define BABL_FAST_FLOAT_TO_INT 1

/* Disable ICC profile support for now */
#define HAVE_LCMS2 0

/* Enable reference pixel testing */
#define BABL_WITH_REFERENCE_PIXELS 1

/* Memory debugging */
#ifdef BABL_DEBUG_MEM
#define BABL_DEBUG_MEMORY 1
#endif

/* Fast path detection */
#define BABL_FAST_PATH_DETECTION 1

/* Enable CPU acceleration detection */
#define BABL_CPU_ACCEL 1

/* WebAssembly-specific defines */
#define __EMSCRIPTEN__ 1
#define EMSCRIPTEN 1

/* Compiler attributes */
#define BABL_EXPORT __attribute__((visibility("default")))
#define BABL_INLINE static inline

#endif /* BABL_CONFIG_H */