#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# Relearn.ai — Eclipse Theia Container Entrypoint
# ─────────────────────────────────────────────────────────────────
set -e

PROJECT_DIR="/home/project"
mkdir -p "$PROJECT_DIR"

echo "=== Relearn.ai Cloud Engineering Studio ==="
echo "Initializing container workspace at $PROJECT_DIR..."

# 1. Restore from Supabase Storage if presigned download URL is provided
if [ -n "$STORAGE_DOWNLOAD_URL" ]; then
    echo "[Storage] Downloading student workspace archive from Supabase Storage..."
    if curl -sSfL "$STORAGE_DOWNLOAD_URL" -o /tmp/workspace.tar.gz; then
        echo "[Storage] Extracting workspace archive into $PROJECT_DIR..."
        tar -xzf /tmp/workspace.tar.gz -C "$PROJECT_DIR" || echo "[Storage] Warning: Failed to untar archive"
        rm -f /tmp/workspace.tar.gz
    else
        echo "[Storage] Notice: No existing archive found at URL, initializing fresh project tree."
    fi
fi

# 2. If project directory is still completely empty, create standard greeting
if [ -z "$(ls -A "$PROJECT_DIR" 2>/dev/null)" ]; then
    cat << 'EOF' > "$PROJECT_DIR/README.md"
# Relearn.ai Engineering Studio

Welcome to your production-grade cloud workspace!

## Available Toolchains in this Environment:
- **C# / .NET:** `dotnet --version`
- **Rust / Cargo:** `cargo --version`, `rustc --version`
- **Python 3:** `python --version`, `pip --version`
- **Shell:** `bash`

Open the terminal with `Ctrl + \`` or from the **Terminal** menu above.
EOF
fi

echo "[Toolchain Check]"
echo "  .NET SDK: $(dotnet --version 2>/dev/null || echo 'Not installed')"
echo "  Cargo:    $(cargo --version 2>/dev/null || echo 'Not installed')"
echo "  Python:   $(python --version 2>/dev/null || echo 'Not installed')"

echo "[Theia] Launching IDE Server on http://0.0.0.0:3000..."
exec node /home/theia/src-gen/backend/main.js "$PROJECT_DIR" --hostname=0.0.0.0 --port=3000 "$@"
