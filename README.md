# Cache Monkey

> Thats hot.

#### Changes from upstream

- Improved cache detection
- Fixed cache folder handling
- Fixed video handling (videos are 1mb chunks now, cachemonkey automatically merges them with ffmpeg)
- Added hdr support for video previews
- Updated nodejs and dependencies

#### Build setup

```bash
# install dependencies
npm ci

# start the desktop app with a development server
npm run dev

# package for the current platform
npm run build

# check source files
npm run lint

```

---

The renderer build is defined in `webpack.renderer.config.cjs`.
