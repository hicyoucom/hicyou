/**
 * Whether a buffer starts with an ISO Base Media File Format container.
 *
 * HEIF, HEIC and AVIF are ISO BMFF containers. Until every deployed image
 * library contains libheif's critical fix, reject the container before it is
 * passed to Sharp. We intentionally reject all `ftyp` containers here: none
 * of HiCyou's accepted upload formats require ISO BMFF, and MIME types can be
 * spoofed.
 */
export function isIsoBaseMediaFile(buffer: Uint8Array): boolean {
  let offset = 0;
  let boxesChecked = 0;

  // `ftyp` is normally the first box, but accept a small number of leading
  // valid boxes so a crafted container cannot bypass the guard with `free`.
  while (boxesChecked < 16 && offset + 8 <= buffer.length) {
    if (
      buffer[offset + 4] === 0x66 && // f
      buffer[offset + 5] === 0x74 && // t
      buffer[offset + 6] === 0x79 && // y
      buffer[offset + 7] === 0x70 // p
    ) {
      return true;
    }

    const boxSize =
      buffer[offset] * 0x1_000_000 +
      buffer[offset + 1] * 0x1_0000 +
      buffer[offset + 2] * 0x100 +
      buffer[offset + 3];

    // A zero-size box extends to EOF and size 1 signals an extended 64-bit
    // size. We do not parse either form, so reject conservatively before the
    // input can reach Sharp/libheif.
    if (boxSize === 0 || boxSize === 1) {
      return true;
    }

    if (boxSize < 8 || offset + boxSize > buffer.length) {
      return false;
    }

    offset += boxSize;
    boxesChecked += 1;
  }

  // Do not let a chain of valid non-`ftyp` boxes consume the scan budget and
  // hide a container farther into the input.
  return boxesChecked === 16;
}
