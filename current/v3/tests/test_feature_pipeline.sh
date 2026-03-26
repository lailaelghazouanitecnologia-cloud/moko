#!/usr/bin/env bash
# Test suite: Feature AST Pipeline — 5 parallel project generations
# Usage: bash tests/test_feature_pipeline.sh [--sequential]
#
# Tests 5 different configurations:
#   1. 2D engine (playcanvas) — validates 3D type exclusion
#   2. WebGPU renderer (playcanvas) — validates --features pre-select
#   3. Mini engine (thief-engine) — validates small reference calibration
#   4. AI toolkit (langgraph) — validates non-game domain
#   5. Code editor (void) — validates editor domain

set -euo pipefail
cd "$(dirname "$0")/.."

LOGDIR="tests/logs"
mkdir -p "$LOGDIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SEQUENTIAL="${1:-}"
PIDS=()
NAMES=()
PASS=0
FAIL=0

run_test() {
    local name="$1"
    local logfile="$LOGDIR/${name}.log"
    shift
    echo -e "  ${YELLOW}START${NC}  $name"
    if "$@" > "$logfile" 2>&1; then
        echo -e "  ${GREEN}PASS${NC}   $name"
        return 0
    else
        echo -e "  ${RED}FAIL${NC}   $name (see $logfile)"
        return 1
    fi
}

run_test_bg() {
    local name="$1"
    local logfile="$LOGDIR/${name}.log"
    shift
    "$@" > "$logfile" 2>&1 &
    PIDS+=($!)
    NAMES+=("$name")
}

echo ""
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "    FEATURE AST PIPELINE — TEST SUITE (5 blocks)"
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Clean previous test projects
rm -rf projects/engine_2d projects/gpu_renderer projects/mini_engine projects/ai_toolkit projects/code_editor

if [ "$SEQUENTIAL" = "--sequential" ]; then
    echo "  Mode: sequential"
    echo ""

    run_test "engine_2d" \
        python3 -m ava dev "2D sprite game engine with ECS" -t engine_2d -r playcanvas --branches --no-interactive && PASS=$((PASS+1)) || FAIL=$((FAIL+1))

    run_test "gpu_renderer" \
        python3 -m ava dev "WebGPU 3D renderer" -t gpu_renderer -r playcanvas --branches --features rendering math events && PASS=$((PASS+1)) || FAIL=$((FAIL+1))

    run_test "mini_engine" \
        python3 -m ava dev "minimal game engine" -t mini_engine -r thief-engine --branches --no-interactive && PASS=$((PASS+1)) || FAIL=$((FAIL+1))

    run_test "ai_toolkit" \
        python3 -m ava dev "AI agent framework with tools" -t ai_toolkit -r langgraph --branches --no-interactive && PASS=$((PASS+1)) || FAIL=$((FAIL+1))

    run_test "code_editor" \
        python3 -m ava dev "code editor with LSP support" -t code_editor -r void --branches --no-interactive && PASS=$((PASS+1)) || FAIL=$((FAIL+1))

else
    echo "  Mode: parallel (5 concurrent)"
    echo ""

    run_test_bg "engine_2d" \
        python3 -m ava dev "2D sprite game engine with ECS" -t engine_2d -r playcanvas --branches --no-interactive

    run_test_bg "gpu_renderer" \
        python3 -m ava dev "WebGPU 3D renderer" -t gpu_renderer -r playcanvas --branches --features rendering math events

    run_test_bg "mini_engine" \
        python3 -m ava dev "minimal game engine" -t mini_engine -r thief-engine --branches --no-interactive

    run_test_bg "ai_toolkit" \
        python3 -m ava dev "AI agent framework with tools" -t ai_toolkit -r langgraph --branches --no-interactive

    run_test_bg "code_editor" \
        python3 -m ava dev "code editor with LSP support" -t code_editor -r void --branches --no-interactive

    # Wait for all
    echo "  Waiting for ${#PIDS[@]} tests..."
    echo ""
    for i in "${!PIDS[@]}"; do
        pid="${PIDS[$i]}"
        name="${NAMES[$i]}"
        if wait "$pid"; then
            echo -e "  ${GREEN}PASS${NC}   $name"
            PASS=$((PASS+1))
        else
            echo -e "  ${RED}FAIL${NC}   $name (see $LOGDIR/${name}.log)"
            FAIL=$((FAIL+1))
        fi
    done
fi

echo ""
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "    RESULTS: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Quick validation of outputs
echo "  Post-test validation:"
for proj in engine_2d gpu_renderer mini_engine ai_toolkit code_editor; do
    dir="projects/$proj"
    if [ -d "$dir/src" ]; then
        files=$(find "$dir/src" -name "*.ts" 2>/dev/null | wc -l)
        loc=$(cat "$dir/src"/*.ts "$dir/src"/**/*.ts 2>/dev/null | wc -l || echo 0)
        echo -e "    ${GREEN}OK${NC}  $proj: $files files"
    else
        echo -e "    ${RED}--${NC}  $proj: no src/ generated"
    fi
done
echo ""

exit $FAIL
