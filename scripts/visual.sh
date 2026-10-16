#!/usr/bin/env bash
# Runs the visual project inside the Playwright image CI uses, so screenshots match the baselines.
# Pass --update-snapshots to write new baselines. Reads credentials from .env.
set -euo pipefail
version=$(node -p "require('./package.json').devDependencies['@playwright/test']")
exec docker run --rm --ipc=host --init \
  --env-file .env -e VISUAL=1 -e CI= -e COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
  -v "$PWD":/work -v qe-lab-visual-modules:/work/node_modules -v qe-lab-visual-store:/pnpm-store -w /work \
  "mcr.microsoft.com/playwright:v${version}-noble" \
  bash -c "corepack enable >/dev/null && pnpm install --frozen-lockfile --store-dir /pnpm-store >/dev/null && pnpm exec playwright test --project=visual $*"
