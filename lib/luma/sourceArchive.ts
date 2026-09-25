const SOURCE_EXTENSIONS = new Set([
  "kt","kts","java","js","jsx","ts","tsx","py","go","rs","c","cc","cpp","h","hpp",
  "cs","swift","dart","php","rb","scala","gradle","xml","html","css","vue","svelte","sh",
]);

export type SourceArchiveInspection = {
  entries: number;
  sourceFiles: number;
  totalUncompressedBytes: number;
  sampleSourceFiles: string[];
};

function u16(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function u32(bytes: Uint8Array, offset: number) {
  return (bytes[offset]
    | (bytes[offset + 1] << 8)
    | (bytes[offset + 2] << 16)
    | (bytes[offset + 3] << 24)) >>> 0;
}

export function inspectSourceZip(bytes: Uint8Array): SourceArchiveInspection {
  if (bytes.length < 22) throw new Error("The source archive is too small to be a valid ZIP.");
  if (!(bytes[0] === 0x50 && bytes[1] === 0x4b)) {
    throw new Error("The uploaded source archive is not a ZIP file.");
  }

  let offset = 0;
  let entries = 0;
  let sourceFiles = 0;
  let totalUncompressedBytes = 0;
  const sampleSourceFiles: string[] = [];
  const decoder = new TextDecoder();

  while (offset + 46 <= bytes.length) {
    const signature = u32(bytes, offset);
    if (signature !== 0x02014b50) {
      offset += 1;
      continue;
    }

    const flags = u16(bytes, offset + 8);
    if ((flags & 0x1) !== 0) {
      throw new Error("Encrypted source ZIP archives are not supported.");
    }

    const uncompressedSize = u32(bytes, offset + 24);
    const fileNameLength = u16(bytes, offset + 28);
    const extraLength = u16(bytes, offset + 30);
    const commentLength = u16(bytes, offset + 32);
    const nameStart = offset + 46;
    const nameEnd = nameStart + fileNameLength;
    if (nameEnd > bytes.length) throw new Error("The source ZIP directory is malformed.");

    const fileName = decoder.decode(bytes.slice(nameStart, nameEnd));
    if (
      fileName.startsWith("/")
      || fileName.startsWith("\\")
      || fileName.split(/[\\/]+/).includes("..")
    ) {
      throw new Error("The source ZIP contains an unsafe path.");
    }

    if (!fileName.endsWith("/")) {
      entries += 1;
      totalUncompressedBytes += uncompressedSize;
      const baseName = fileName.split(/[\\/]/).pop() || "";
      const dot = baseName.lastIndexOf(".");
      const extension = dot >= 0 ? baseName.slice(dot + 1).toLowerCase() : "";
      if (SOURCE_EXTENSIONS.has(extension)) {
        sourceFiles += 1;
        if (sampleSourceFiles.length < 12) sampleSourceFiles.push(fileName);
      }
    }

    if (entries > 100000) throw new Error("The source ZIP contains too many files.");
    if (totalUncompressedBytes > 500 * 1024 * 1024) {
      throw new Error("The unpacked source archive is too large.");
    }

    offset = nameEnd + extraLength + commentLength;
  }

  if (entries === 0) throw new Error("The source ZIP does not contain files.");
  if (sourceFiles === 0) throw new Error("The ZIP does not appear to contain source code files.");

  return { entries, sourceFiles, totalUncompressedBytes, sampleSourceFiles };
}
