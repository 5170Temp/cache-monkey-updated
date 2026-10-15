const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { detectFileTypeFromFile } = require("./file-type");

const BLOCK_HEADER_SIZE = 8192;
const ENTRY_SIZE = 256;
const CHUNK_SIZE = 1024 * 1024;

function cacheDataDirectory(directory) {
  const nested = path.join(directory, "Cache_Data");
  return fs.existsSync(nested) && fs.statSync(nested).isDirectory()
    ? nested
    : directory;
}

function externalFile(address) {
  if (((address >>> 0) & 0x70000000) !== 0 || (address >>> 31) !== 1) return null;
  return `f_${(address & 0x0fffffff).toString(16).padStart(6, "0")}`;
}

function videoType(key, headers, location) {
  const detected = detectFileTypeFromFile(location);
  if (detected) {
    const match = /^video\/(mp4|webm)$/.exec(detected.mime);
    return match ? match[1] : null;
  }

  const contentType = headers && /content-type:\s*video\/(mp4|webm)/i.exec(headers.toString("latin1"));
  if (contentType) return contentType[1].toLowerCase();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const decoded = decodeURIComponent(key);
      if (decoded === key) break;
      key = decoded;
    } catch (error) {
      break;
    }
  }

  const match = key.match(/\.(mp4|webm)(?:$|[?&#/])/i);
  return match ? match[1].toLowerCase() : null;
}

function readStream(directory, address, size) {
  if (size < 1 || size > 65536 || (address >>> 31) !== 1) return null;
  const type = (address >>> 28) & 7;
  const blocks = { 2: 256, 3: 1024, 4: 4096 };
  const location = type === 0
    ? path.join(directory, externalFile(address))
    : path.join(directory, `data_${(address >>> 16) & 255}`);
  const position = type === 0 ? 0 : BLOCK_HEADER_SIZE + (address & 65535) * blocks[type];
  if ((type !== 0 && !blocks[type]) || !fs.existsSync(location)) return null;
  const buffer = Buffer.alloc(size);
  const input = fs.openSync(location, "r");
  try {
    return fs.readSync(input, buffer, 0, size, position) === size ? buffer : null;
  } finally {
    fs.closeSync(input);
  }
}

function videoGroups(directory) {
  const dataFile = path.join(directory, "data_1");
  if (!fs.existsSync(dataFile)) return [];
  const data = fs.readFileSync(dataFile);
  if (data.length < BLOCK_HEADER_SIZE || data.readUInt32LE(0) !== 0xc104cac3 ||
      data.readInt32LE(12) !== ENTRY_SIZE) return [];
  const groups = new Map();
  const parentStreams = new Map();

  for (let offset = BLOCK_HEADER_SIZE; offset + ENTRY_SIZE <= data.length; offset += ENTRY_SIZE) {
    const keyLength = data.readInt32LE(offset + 32);
    const state = data.readInt32LE(offset + 20);
    if (state !== 0 || keyLength < 1 || keyLength > 927 || offset + 96 + keyLength > data.length) continue;

    const key = data.toString("utf8", offset + 96, offset + 96 + keyLength);
    const match = /^Range_(.*):([0-9a-f]+):([0-9a-f]+)$/i.exec(key);
    if (!match) {
      parentStreams.set(key, {
        size: data.readInt32LE(offset + 40),
        address: data.readUInt32LE(offset + 56)
      });
      continue;
    }
    const chunk = parseInt(match[3], 16);
    if (!Number.isSafeInteger(chunk)) continue;

    const groupKey = `${match[1]}:${match[2]}`;
    const size = data.readInt32LE(offset + 44);
    const filename = externalFile(data.readUInt32LE(offset + 60));
    if (size < 1 || size > CHUNK_SIZE || !filename) continue;
    const location = path.join(directory, filename);
    try {
      if (!fs.existsSync(location) || fs.statSync(location).size < size) continue;
    } catch (error) {
      continue;
    }
    if (!groups.has(groupKey)) groups.set(groupKey, { parts: new Map(), key: groupKey, parentKey: match[1] });
    groups.get(groupKey).parts.set(chunk, { location, size });
  }

  return Array.from(groups.values()).map(group => {
    const parts = [];
    for (let chunk = 0; group.parts.has(chunk); chunk += 1) {
      const part = group.parts.get(chunk);
      parts.push(part);
      if (part.size < CHUNK_SIZE) break;
    }
    if (parts.length < 2) return null;

    const parent = parentStreams.get(group.parentKey);
    let headers = null;
    try {
      if (parent) headers = readStream(directory, parent.address, parent.size);
    } catch (error) {}
    let type;
    try {
      type = videoType(group.parentKey, headers, parts[0].location);
    } catch (error) {
      return null;
    }
    if (!type) return null;

    const range = headers && /content-range:\s*bytes\s+\d+-\d+\/(\d+)/i.exec(headers.toString("latin1"));
    const totalSize = range ? parseInt(range[1], 10) : null;
    const size = parts.reduce((sum, part) => sum + part.size, 0);
    return {
      type,
      id: crypto.createHash("sha256").update(group.key).digest("hex").slice(0, 20),
      parts,
      totalSize,
      incomplete: totalSize ? size !== totalSize : null
    };
  }).filter(Boolean);
}

function mergeParts(parts, target) {
  const output = fs.openSync(target, "w");
  try {
    const buffer = Buffer.alloc(64 * 1024);
    for (const part of parts) {
      const input = fs.openSync(part.location, "r");
      try {
        for (let position = 0; position < part.size;) {
          const bytes = fs.readSync(input, buffer, 0, Math.min(buffer.length, part.size - position), position);
          if (!bytes) throw new Error(`Could not read ${part.location}`);
          fs.writeSync(output, buffer, 0, bytes);
          position += bytes;
        }
      } finally {
        fs.closeSync(input);
      }
    }
  } catch (error) {
    fs.closeSync(output);
    fs.unlinkSync(target);
    throw error;
  }
  fs.closeSync(output);
}

module.exports = { cacheDataDirectory, videoGroups, mergeParts };
