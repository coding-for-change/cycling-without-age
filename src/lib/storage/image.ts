import sharp from "sharp";

const MAX_EDGE = 2000;

export const toWebp = (input: Buffer) =>
  sharp(input, { failOn: "error" })
    .rotate()
    .resize({
      width: MAX_EDGE,
      height: MAX_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toBuffer();

export const isPdf = (input: Buffer) =>
  input.subarray(0, 5).toString("latin1") === "%PDF-";
