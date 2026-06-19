#!/usr/bin/env bash
# Regenerate gRPC stubs from proto/diagnosis.proto.
# Run this whenever the proto definition changes.
# Output lands in src/ so that PYTHONPATH=src keeps imports clean.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."

python -m grpc_tools.protoc \
    -I "$ROOT/proto" \
    --python_out="$ROOT/src" \
    --grpc_python_out="$ROOT/src" \
    "$ROOT/proto/diagnosis.proto"

echo "Proto stubs generated in $ROOT/src/"
