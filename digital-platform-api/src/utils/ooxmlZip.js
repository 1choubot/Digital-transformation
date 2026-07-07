import { deflateRawSync, inflateRawSync } from 'node:zlib';

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const LOCAL_FILE_SIGNATURE = 0x04034b50;
const MAX_EOCD_SEARCH = 0xffff + 22;

const crcTable = new Uint32Array(256).map((_, index) => {
  let crc = index;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
  }
  return crc >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function findEndOfCentralDirectory(buffer) {
  const start = Math.max(0, buffer.length - MAX_EOCD_SEARCH);
  for (let index = buffer.length - 22; index >= start; index -= 1) {
    if (buffer.readUInt32LE(index) === EOCD_SIGNATURE) {
      return index;
    }
  }
  throw new Error('Invalid OOXML zip: end of central directory not found');
}

export function readZipEntries(buffer) {
  const eocdOffset = findEndOfCentralDirectory(buffer);
  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);
  const entries = [];
  let offset = centralDirectoryOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(offset) !== CENTRAL_DIRECTORY_SIGNATURE) {
      throw new Error('Invalid OOXML zip: central directory entry missing');
    }

    const compressionMethod = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const externalAttributes = buffer.readUInt32LE(offset + 38);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.subarray(offset + 46, offset + 46 + fileNameLength).toString('utf8');

    if (buffer.readUInt32LE(localHeaderOffset) !== LOCAL_FILE_SIGNATURE) {
      throw new Error(`Invalid OOXML zip: local header missing for ${name}`);
    }

    const localFileNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localFileNameLength + localExtraLength;
    const compressedData = buffer.subarray(dataStart, dataStart + compressedSize);
    let data;

    if (compressionMethod === 0) {
      data = Buffer.from(compressedData);
    } else if (compressionMethod === 8) {
      data = inflateRawSync(compressedData);
    } else {
      throw new Error(`Unsupported OOXML zip compression method ${compressionMethod} for ${name}`);
    }

    if (data.length !== uncompressedSize) {
      throw new Error(`Invalid OOXML zip entry size for ${name}`);
    }

    entries.push({
      name,
      data,
      compressionMethod,
      externalAttributes
    });

    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function buildLocalHeader({ nameBuffer, crc, compressedSize, uncompressedSize, compressionMethod }) {
  const header = Buffer.alloc(30);
  header.writeUInt32LE(LOCAL_FILE_SIGNATURE, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(compressionMethod, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt32LE(crc, 14);
  header.writeUInt32LE(compressedSize, 18);
  header.writeUInt32LE(uncompressedSize, 22);
  header.writeUInt16LE(nameBuffer.length, 26);
  header.writeUInt16LE(0, 28);
  return header;
}

function buildCentralHeader({
  nameBuffer,
  crc,
  compressedSize,
  uncompressedSize,
  compressionMethod,
  localHeaderOffset,
  externalAttributes
}) {
  const header = Buffer.alloc(46);
  header.writeUInt32LE(CENTRAL_DIRECTORY_SIGNATURE, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(compressionMethod, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt16LE(0, 14);
  header.writeUInt32LE(crc, 16);
  header.writeUInt32LE(compressedSize, 20);
  header.writeUInt32LE(uncompressedSize, 24);
  header.writeUInt16LE(nameBuffer.length, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(externalAttributes || 0, 38);
  header.writeUInt32LE(localHeaderOffset, 42);
  return header;
}

function buildEocd({ entryCount, centralDirectorySize, centralDirectoryOffset }) {
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(EOCD_SIGNATURE, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entryCount, 8);
  eocd.writeUInt16LE(entryCount, 10);
  eocd.writeUInt32LE(centralDirectorySize, 12);
  eocd.writeUInt32LE(centralDirectoryOffset, 16);
  eocd.writeUInt16LE(0, 20);
  return eocd;
}

export function writeZipEntries(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuffer = Buffer.from(entry.name, 'utf8');
    const data = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data || '');
    const compressionMethod = entry.compressionMethod === 0 ? 0 : 8;
    const compressedData = compressionMethod === 0 ? data : deflateRawSync(data);
    const crc = crc32(data);
    const localHeader = buildLocalHeader({
      nameBuffer,
      crc,
      compressedSize: compressedData.length,
      uncompressedSize: data.length,
      compressionMethod
    });
    const localHeaderOffset = offset;
    localParts.push(localHeader, nameBuffer, compressedData);
    offset += localHeader.length + nameBuffer.length + compressedData.length;

    centralParts.push(
      buildCentralHeader({
        nameBuffer,
        crc,
        compressedSize: compressedData.length,
        uncompressedSize: data.length,
        compressionMethod,
        localHeaderOffset,
        externalAttributes: entry.externalAttributes
      }),
      nameBuffer
    );
  }

  const centralDirectoryOffset = offset;
  const centralDirectory = Buffer.concat(centralParts);
  const eocd = buildEocd({
    entryCount: entries.length,
    centralDirectorySize: centralDirectory.length,
    centralDirectoryOffset
  });

  return Buffer.concat([...localParts, centralDirectory, eocd]);
}

export function updateZipTextEntry(buffer, entryName, updater) {
  const entries = readZipEntries(buffer);
  const entry = entries.find((candidate) => candidate.name === entryName);
  if (!entry) {
    throw new Error(`OOXML entry not found: ${entryName}`);
  }

  const text = entry.data.toString('utf8');
  entry.data = Buffer.from(updater(text), 'utf8');
  return writeZipEntries(entries);
}
