const fs = require('node:fs');

function detectFileType(buffer) {
  if (!buffer || buffer.length < 4) return null;
  const starts = signature => buffer.subarray(0, signature.length).equals(signature);
  const text = (offset, length) => buffer.toString('ascii', offset, offset + length);
  if (starts(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) return { mime: 'image/png' };
  if (starts(Buffer.from([0xff, 0xd8, 0xff]))) return { mime: 'image/jpeg' };
  if (text(0, 3) === 'GIF') return { mime: 'image/gif' };
  if (text(0, 4) === 'RIFF') {
    if (text(8, 4) === 'WEBP') return { mime: 'image/webp' };
    if (text(8, 4) === 'WAVE') return { mime: 'audio/wav' };
    if (text(8, 4) === 'AVI ') return { mime: 'video/avi' };
  }
  if (buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) return { mime: 'video/webm' };
  if (text(4, 4) === 'ftyp') {
    const brand = text(8, 4);
    if (brand.startsWith('avif')) return { mime: 'image/avif' };
    if (brand === 'M4A ') return { mime: 'audio/mp4' };
    return { mime: 'video/mp4' };
  }
  if (text(0, 3) === 'ID3' || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)) return { mime: 'audio/mpeg' };
  if (text(0, 4) === 'OggS') return { mime: 'audio/ogg' };
  if (text(0, 4) === 'fLaC') return { mime: 'audio/flac' };
  if (text(0, 4) === 'wOFF') return { mime: 'font/woff' };
  if (text(0, 4) === 'wOF2') return { mime: 'font/woff2' };
  if (text(0, 4) === '%PDF') return { mime: 'application/pdf' };
  if (starts(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) return { mime: 'application/zip' };
  return null;
}

function detectFileTypeFromFile(path) {
  const handle = fs.openSync(path, 'r');
  try {
    const buffer = Buffer.alloc(4096);
    const bytes = fs.readSync(handle, buffer, 0, buffer.length, 0);
    return detectFileType(buffer.subarray(0, bytes));
  } finally {
    fs.closeSync(handle);
  }
}

module.exports = { detectFileType, detectFileTypeFromFile };
