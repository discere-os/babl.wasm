#!/bin/bash
# build-dual.sh - Dual build system for babl.wasm
#
# Copyright (c) 2005-2024 Øyvind Kolås and BABL contributors
# Copyright (c) 2025 Superstruct Ltd, New Zealand
# Licensed under LGPL-3.0+

set -euo pipefail

VARIANT="${1:-all}"
BUILD_DIR="${BUILD_DIR:-./build-dual}"
INSTALL_PREFIX="${INSTALL_PREFIX:-./install}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check dependencies and prerequisites
check_prerequisites() {
    log_info "Checking build prerequisites..."

    if ! command -v emcc &> /dev/null; then
        log_error "Emscripten not found. Please install and activate EMSDK."
        exit 1
    fi

    # Check for glib.wasm dependency
    if [ ! -f "../glib.wasm/install/wasm/glib-side.wasm" ]; then
        log_warning "Building glib.wasm dependency..."
        cd ../glib.wasm && ./build-dual.sh side && cd -
    fi

    log_success "Prerequisites check completed"
}

# Build SIDE_MODULE (production)
build_side_module() {
    log_info "Building babl-side.wasm for production..."
    mkdir -p "${BUILD_DIR}-side"
    cd "${BUILD_DIR}-side"

    # Mock BABL sources with SIMD optimizations (for demonstration)
    MOCK_SOURCES="../wasm/mock_babl.c"
    SIMD_SOURCES="../wasm/babl_color_simd.c ../wasm/babl_conversion_simd.c"

    emcc ${MOCK_SOURCES} \
        -I.. -I../babl -I../babl/babl \
        -O3 -flto -msimd128 \
        -sSIDE_MODULE=1 \
        -sSTANDALONE_WASM=1 \
        -fPIC \
        -DBABL_LIBRARY \
        -DHAVE_CONFIG_H \
        -DBABL_ENABLE_SIMD \
        -o babl-side.wasm

    # Install artifacts
    mkdir -p "${INSTALL_PREFIX}/wasm"
    cp babl-side.wasm "${INSTALL_PREFIX}/wasm/"

    # Generate size report
    SIZE=$(stat -c%s babl-side.wasm)
    COMPRESSED=$(gzip -c babl-side.wasm | wc -c)
    log_success "SIDE_MODULE: ${INSTALL_PREFIX}/wasm/babl-side.wasm ($(numfmt --to=iec $SIZE), compressed: $(numfmt --to=iec $COMPRESSED))"
    cd ..
}

# Build MAIN_MODULE (testing/NPM)
build_main_module() {
    log_info "Building babl-main.js for testing..."
    mkdir -p "${BUILD_DIR}-main"
    cd "${BUILD_DIR}-main"

    # Same sources as SIDE_MODULE
    MOCK_SOURCES="../wasm/mock_babl.c"
    SIMD_SOURCES="../wasm/babl_color_simd.c ../wasm/babl_conversion_simd.c"

    emcc ${MOCK_SOURCES} \
        -I.. -I../babl -I../babl/babl \
        -O3 -flto -msimd128 \
        -sMODULARIZE=1 \
        -sEXPORT_ES6=1 \
        -sEXPORT_NAME="BablModule" \
        -sEXPORTED_FUNCTIONS='[
            "_babl_init",
            "_babl_exit",
            "_babl_format",
            "_babl_model",
            "_babl_type",
            "_babl_component",
            "_babl_process",
            "_babl_process_rows",
            "_babl_fish",
            "_babl_space_get",
            "_babl_format_get_space",
            "_babl_format_get_bytes_per_pixel",
            "_babl_conversion_new",
            "_babl_rgb_to_xyz_simd",
            "_babl_xyz_to_lab_simd",
            "_babl_lab_to_xyz_simd",
            "_babl_xyz_to_rgb_simd",
            "_babl_gamma_correction_simd",
            "_babl_color_lookup_simd",
            "_malloc",
            "_free"
        ]' \
        -sEXPORTED_RUNTIME_METHODS='["cwrap","ccall","UTF8ToString","HEAPU8","HEAPF32"]' \
        -sALLOW_MEMORY_GROWTH=1 \
        -sINITIAL_MEMORY=67108864 \
        -sMAXIMUM_MEMORY=536870912 \
        -DBABL_LIBRARY \
        -DHAVE_CONFIG_H \
        -DBABL_ENABLE_SIMD \
        -o babl-main.js

    # Install artifacts
    mkdir -p "${INSTALL_PREFIX}/wasm"
    cp babl-main.js "${INSTALL_PREFIX}/wasm/"
    cp babl-main.wasm "${INSTALL_PREFIX}/wasm/"

    # Generate size report
    JS_SIZE=$(stat -c%s babl-main.js)
    WASM_SIZE=$(stat -c%s babl-main.wasm)
    JS_COMPRESSED=$(gzip -c babl-main.js | wc -c)
    WASM_COMPRESSED=$(gzip -c babl-main.wasm | wc -c)

    log_success "MAIN_MODULE JS: ${INSTALL_PREFIX}/wasm/babl-main.js ($(numfmt --to=iec $JS_SIZE), compressed: $(numfmt --to=iec $JS_COMPRESSED))"
    log_success "MAIN_MODULE WASM: ${INSTALL_PREFIX}/wasm/babl-main.wasm ($(numfmt --to=iec $WASM_SIZE), compressed: $(numfmt --to=iec $WASM_COMPRESSED))"
    cd ..
}

# Cleanup build artifacts
cleanup() {
    log_info "Cleaning up build artifacts..."
    rm -rf "${BUILD_DIR}"* build/ dist/ npm/
    log_success "Cleanup completed"
}

case "$VARIANT" in
    side) check_prerequisites && build_side_module ;;
    main) check_prerequisites && build_main_module ;;
    all) check_prerequisites && build_side_module && build_main_module ;;
    clean) cleanup ;;
    *)
        echo "Usage: $0 [side|main|all|clean]"
        echo "  side  - Build SIDE_MODULE for production deployment"
        echo "  main  - Build MAIN_MODULE for testing and NPM"
        echo "  all   - Build both variants (default)"
        echo "  clean - Remove build artifacts"
        exit 1 ;;
esac

log_success "Build completed successfully!"