set -euo pipefail

project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cache_root="${XDG_CACHE_HOME:-$HOME/.cache}/cache-monkey-build"

if [[ "$(uname -s)" != Linux || "$(uname -m)" != x86_64 ]]; then
  printf '%s\n' 'Linux x64 packaging requires an x64 Linux or WSL environment.' >&2
  exit 1
fi

for tool in curl tar sha256sum mktemp; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    printf 'Missing Linux build tool: %s\n' "$tool" >&2
    exit 1
  fi
done

node_binary="$(command -v node || true)"
npm_binary="$(dirname -- "${node_binary:-/missing/node}")/npm"
if [[ -z "$node_binary" || ! -x "$npm_binary" ]] || ! "$node_binary" -e 'process.exit(process.platform === "linux" && process.versions.node.split(".")[0] === "24" ? 0 : 1)' >/dev/null 2>&1; then
  mkdir -p "$cache_root"
  manifest="$(curl -fsSL --retry 3 https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt)"
  archive="$(printf '%s\n' "$manifest" | awk '$2 ~ /-linux-x64\.tar\.xz$/ {print $2; exit}')"
  checksum="$(printf '%s\n' "$manifest" | awk -v name="$archive" '$2 == name {print $1; exit}')"
  if [[ ! "$archive" =~ ^node-v24\.[0-9]+\.[0-9]+-linux-x64\.tar\.xz$ || ! "$checksum" =~ ^[0-9a-f]{64}$ ]]; then
    printf '%s\n' 'Could not identify an official Linux Node 24 release.' >&2
    exit 1
  fi

  node_directory="$cache_root/${archive%.tar.xz}"
  if [[ ! -x "$node_directory/bin/node" ]]; then
    download_directory="$(mktemp -d "$cache_root/download.XXXXXXXX")"
    curl -fsSL --retry 3 "https://nodejs.org/dist/latest-v24.x/$archive" -o "$download_directory/$archive"
    printf '%s  %s\n' "$checksum" "$download_directory/$archive" | sha256sum -c -
    mkdir -p "$node_directory"
    tar -xJf "$download_directory/$archive" --strip-components=1 -C "$node_directory"
    rm -- "$download_directory/$archive"
    rmdir -- "$download_directory"
  fi
  node_binary="$node_directory/bin/node"
  npm_binary="$node_directory/bin/npm"
fi

export PATH="$(dirname -- "$node_binary"):$PATH"
node -e 'if (process.platform !== "linux" || process.versions.node.split(".")[0] !== "24") process.exit(1)'
printf 'Building with Linux Node %s\n' "$(node --version)"

build_directory="$(mktemp -d /tmp/cache-monkey-linux.XXXXXXXX)"

cleanup() {
  if [[ "$build_directory" == /tmp/cache-monkey-linux.* && -d "$build_directory" ]]; then
    rm -rf -- "$build_directory"
  fi
}

trap cleanup EXIT

tar -C "$project_root" --exclude='./node_modules' --exclude='./build' --exclude='./dist' --exclude='./.git' -cf - . | tar -C "$build_directory" -xf -

if [[ -d "$project_root/build/icons" ]]; then
  mkdir -p "$build_directory/build"
  cp -R "$project_root/build/icons" "$build_directory/build/icons"
fi

cd "$build_directory"
ELECTRON_SKIP_BINARY_DOWNLOAD=1 "$npm_binary" ci --include=dev --no-audit --no-fund
"$npm_binary" run pack
node node_modules/electron-builder/cli.js build --linux --x64 --publish never "$@"

mkdir -p "$project_root/build"
find "$build_directory/build" -maxdepth 1 -type f \( -name '*.AppImage' -o -name '*.AppImage.blockmap' -o -name '*.deb' -o -name '*.snap' -o -name 'latest-linux*.yml' \) -exec cp -- {} "$project_root/build/" \;
printf 'Linux packages saved to %s/build\n' "$project_root"
