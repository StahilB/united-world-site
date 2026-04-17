#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const projectRoot = path.resolve(__dirname, "..");
const publicDir = path.join(projectRoot, "public");

const SOURCE = process.env.LOGO_SOURCE || path.join(publicDir, "logo.png");
const OUTPUTS = [
  { filename: "icon.png", size: 32 },
  { filename: "apple-icon.png", size: 180 },
  { filename: "icon-192.png", size: 192 },
  { filename: "icon-512.png", size: 512 },
];

function ensureFileExists(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Source file not found: ${filePath}`);
  }
}

function icoFromPng32(pngBuffer) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);

  const dirEntry = Buffer.alloc(16);
  dirEntry.writeUInt8(32, 0);
  dirEntry.writeUInt8(32, 1);
  dirEntry.writeUInt8(0, 2);
  dirEntry.writeUInt8(0, 3);
  dirEntry.writeUInt16LE(1, 4);
  dirEntry.writeUInt16LE(32, 6);
  dirEntry.writeUInt32LE(pngBuffer.length, 8);
  dirEntry.writeUInt32LE(22, 12);

  return Buffer.concat([header, dirEntry, pngBuffer]);
}

async function main() {
  ensureFileExists(SOURCE);
  await fs.promises.mkdir(publicDir, { recursive: true });

  for (const { filename, size } of OUTPUTS) {
    const outPath = path.join(publicDir, filename);
    await sharp(SOURCE).resize(size, size, { fit: "cover" }).png().toFile(outPath);
    console.log(`Generated ${path.relative(projectRoot, outPath)} (${size}x${size})`);
  }

  const png32 = await sharp(SOURCE).resize(32, 32, { fit: "cover" }).png().toBuffer();
  const icoBuffer = icoFromPng32(png32);
  const faviconPath = path.join(publicDir, "favicon.ico");
  await fs.promises.writeFile(faviconPath, icoBuffer);
  console.log(`Generated ${path.relative(projectRoot, faviconPath)} (32x32 ICO)`);
}

main().catch((error) => {
  console.error("[generate-icons] Failed:", error.message);
  process.exitCode = 1;
});
