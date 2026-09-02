import { expect, test } from "bun:test";
import { isIsoBaseMediaFile } from "../image-safety";

function expectGuard(buffer: Uint8Array, expected: boolean) {
  expect(isIsoBaseMediaFile(buffer)).toBe(expected);
}

test("rejects ISO BMFF containers before image decoding", () => {
  const avifLike = Buffer.from([
    0x00,
    0x00,
    0x00,
    0x10,
    0x66,
    0x74,
    0x79,
    0x70, // ftyp
    0x61,
    0x76,
    0x69,
    0x66, // avif
    0x00,
    0x00,
    0x00,
    0x00,
  ]);

  expectGuard(avifLike, true);
});

test("detects ftyp after a valid leading ISO BMFF box", () => {
  const container = Buffer.from([
    0x00,
    0x00,
    0x00,
    0x08,
    0x66,
    0x72,
    0x65,
    0x65, // free
    0x00,
    0x00,
    0x00,
    0x10,
    0x66,
    0x74,
    0x79,
    0x70, // ftyp
    0x68,
    0x65,
    0x69,
    0x63, // heic
    0x00,
    0x00,
    0x00,
    0x00,
  ]);

  expectGuard(container, true);
});

test("rejects a container with an extended-size leading box", () => {
  const container = Buffer.from([
    0x00,
    0x00,
    0x00,
    0x01,
    0x66,
    0x72,
    0x65,
    0x65, // free, followed by a 64-bit box size
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x10,
    0x00,
    0x00,
    0x00,
    0x10,
    0x66,
    0x74,
    0x79,
    0x70, // ftyp
    0x61,
    0x76,
    0x69,
    0x66, // avif
    0x00,
    0x00,
    0x00,
    0x00,
  ]);

  expectGuard(container, true);
});

test("rejects a container that exhausts the leading-box scan budget", () => {
  const freeBox = [
    0x00,
    0x00,
    0x00,
    0x08,
    0x66,
    0x72,
    0x65,
    0x65, // free
  ];
  const ftypBox = [
    0x00,
    0x00,
    0x00,
    0x10,
    0x66,
    0x74,
    0x79,
    0x70, // ftyp
    0x68,
    0x65,
    0x69,
    0x63, // heic
    0x00,
    0x00,
    0x00,
    0x00,
  ];
  const container = Buffer.from([
    ...Array(16).fill(freeBox).flat(),
    ...ftypBox,
  ]);

  expectGuard(container, true);
});

test("rejects a zero-size ISO BMFF box conservatively", () => {
  const container = Buffer.from([
    0x00,
    0x00,
    0x00,
    0x00,
    0x66,
    0x72,
    0x65,
    0x65, // free, extending to EOF
  ]);

  expectGuard(container, true);
});

test("does not reject a JPEG signature", () => {
  expectGuard(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]), false);
});
