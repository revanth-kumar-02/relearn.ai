# ─────────────────────────────────────────────────────────────────
# Relearn.ai — Eclipse Theia Multi-Toolchain IDE Container
# ─────────────────────────────────────────────────────────────────
# Stage 1: Build Eclipse Theia Application
# ─────────────────────────────────────────────────────────────────
FROM node:20-bookworm AS builder

# Install build dependencies for native Node.js modules (node-pty, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    make \
    g++ \
    libsecret-1-dev \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /home/theia

# Copy package definition and install
COPY package.json ./
RUN yarn --pure-lockfile || yarn install

# Build Theia distribution
RUN yarn theia build --mode production

# ─────────────────────────────────────────────────────────────────
# Stage 2: Production Multi-Toolchain Runtime
# ─────────────────────────────────────────────────────────────────
FROM ubuntu:22.04 AS runtime

ENV DEBIAN_FRONTEND=noninteractive
ENV SHELL=/bin/bash
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8

# 1. Install base utilities and repositories
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    gnupg \
    git \
    jq \
    tar \
    gzip \
    unzip \
    build-essential \
    pkg-config \
    libssl-dev \
    sqlite3 \
    libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

# 2. Install Node.js 20 LTS
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g yarn \
    && rm -rf /var/lib/apt/lists/*

# 3. Install .NET 8.0 SDK (for C# Curriculum)
RUN curl -sSL https://packages.microsoft.com/config/ubuntu/22.04/packages-microsoft-prod.deb -o packages-microsoft-prod.deb \
    && dpkg -i packages-microsoft-prod.deb \
    && rm packages-microsoft-prod.deb \
    && apt-get update \
    && apt-get install -y dotnet-sdk-8.0 \
    && rm -rf /var/lib/apt/lists/*

# 4. Install Python 3, pip, and venv (for Python Curriculum)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/* \
    && ln -s /usr/bin/python3 /usr/local/bin/python

# 5. Create non-root developer user: theia (uid=1000, gid=1000)
RUN groupadd -g 1000 theia \
    && useradd -u 1000 -g theia -m -s /bin/bash theia \
    && mkdir -p /home/project \
    && chown -R theia:theia /home/project

# 6. Install Rust & Cargo as theia user (for Rust Systems Curriculum)
USER theia
ENV RUSTUP_HOME=/home/theia/.rustup
ENV CARGO_HOME=/home/theia/.cargo
ENV PATH="/home/theia/.cargo/bin:/home/theia/.local/bin:${PATH}"

RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable \
    && rustup component add rust-analyzer rustfmt clippy

# Switch back to root to assemble application files
USER root

WORKDIR /home/theia

# Copy built Theia application and node_modules from builder stage
COPY --from=builder --chown=theia:theia /home/theia /home/theia
COPY --chown=theia:theia entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Environment settings for IDE
ENV THEIA_DEFAULT_PLUGINS=local-dir:/home/theia/plugins
ENV HOME=/home/theia
WORKDIR /home/project

# Drop root privileges for runtime security
USER theia

EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]
