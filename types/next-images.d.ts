// Makes Next's static-asset module declarations (*.svg, *.png, *.jpg, …)
// available to `tsc --noEmit` even without a generated next-env.d.ts — e.g. in a
// fresh CI checkout, where importing `@/public/logo.svg` would otherwise fail
// with TS2307. Harmlessly redundant with next-env.d.ts locally (TS dedupes the
// referenced file).
/// <reference types="next/image-types/global" />
