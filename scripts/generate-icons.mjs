/**
 * Generate placeholder PWA icons (192x192 and 512x512).
 * Creates simple solid-color PNG files with a "PL" text indicator.
 * Uses raw PNG encoding (no external dependencies).
 */
import { writeFileSync } from 'fs';
import { deflateSync } from 'zlib';

function createPNG(size) {
  // Create an uncompressed RGBA image
  const width = size;
  const height = size;
  const channels = 4; // RGBA

  // Build raw pixel data with filter bytes
  const rawData = Buffer.alloc((width * channels + 1) * height);

  const bgR = 124, bgG = 58, bgB = 237, bgA = 255; // #7c3aed (purple)
  const fgR = 255, fgG = 255, fgB = 255, fgA = 255; // white

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (width * channels + 1);
    rawData[rowOffset] = 0; // No filter for this row

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * channels;

      // Draw a simple circle in the center
      const cx = width / 2;
      const cy = height / 2;
      const radius = width * 0.4;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);

      if (dist < radius) {
        // Inside circle - white
        rawData[pixelOffset] = fgR;
        rawData[pixelOffset + 1] = fgG;
        rawData[pixelOffset + 2] = fgB;
        rawData[pixelOffset + 3] = fgA;
      } else {
        // Outside circle - purple background
        rawData[pixelOffset] = bgR;
        rawData[pixelOffset + 1] = bgG;
        rawData[pixelOffset + 2] = bgB;
        rawData[pixelOffset + 3] = bgA;
      }
    }
  }

  // Draw "PL" text as a simple block pattern in center
  const letterSize = Math.floor(size * 0.15);
  const startX = Math.floor(width / 2 - letterSize * 1.2);
  const startY = Math.floor(height / 2 - letterSize / 2);

  // Simple block letters
  for (let dy = 0; dy < letterSize; dy++) {
    for (let dx = 0; dx < Math.floor(letterSize * 2.4); dx++) {
      const px = startX + dx;
      const py = startY + dy;
      if (px >= 0 && px < width && py >= 0 && py < height) {
        // P shape (left half) and L shape (right half)
        const inP = dx < letterSize && (
          dx < letterSize * 0.2 || // P vertical bar
          (dy < letterSize * 0.2) || // P top bar
          (dy > letterSize * 0.4 && dy < letterSize * 0.6) || // P middle bar
          (dx > letterSize * 0.6 && dy < letterSize * 0.6) // P right bar top half
        );
        const ldx = dx - letterSize * 1.4;
        const inL = ldx >= 0 && (
          ldx < letterSize * 0.2 || // L vertical bar
          dy > letterSize * 0.8 // L bottom bar
        );

        if (inP || inL) {
          const rowOffset = py * (width * channels + 1);
          const pixelOffset = rowOffset + 1 + px * channels;
          // Draw in purple on white circle
          rawData[pixelOffset] = bgR;
          rawData[pixelOffset + 1] = bgG;
          rawData[pixelOffset + 2] = bgB;
          rawData[pixelOffset + 3] = bgA;
        }
      }
    }
  }

  // Compress the raw data
  const compressed = deflateSync(rawData);

  // Build PNG file
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 6;  // color type (RGBA)
  ihdrData[10] = 0; // compression method
  ihdrData[11] = 0; // filter method
  ihdrData[12] = 0; // interlace method
  const ihdr = createChunk('IHDR', ihdrData);

  // IDAT chunk
  const idat = createChunk('IDAT', compressed);

  // IEND chunk
  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = crc32(crcData);

  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc >>> 0, 0);

  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >>> 1) ^ 0xedb88320;
      } else {
        crc = crc >>> 1;
      }
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Generate and write icons
const icon192 = createPNG(192);
const icon512 = createPNG(512);

writeFileSync('public/icons/icon-192x192.png', icon192);
writeFileSync('public/icons/icon-512x512.png', icon512);

console.log('Generated icon-192x192.png (' + icon192.length + ' bytes)');
console.log('Generated icon-512x512.png (' + icon512.length + ' bytes)');
