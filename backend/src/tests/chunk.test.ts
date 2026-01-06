import { chunkText } from "../lib/chunk";

describe("chunkText", () => {
  it("splits text into overlapping chunks", () => {
    const input = "abcdefghijklmnopqrstuvwxyz0123456789";
    const chunks = chunkText(input, 10, 3);

    expect(chunks.map((chunk) => chunk.text)).toEqual([
      "abcdefghij",
      "hijklmnopq",
      "opqrstuvwx",
      "vwxyz01234",
      "23456789"
    ]);
    expect(chunks.map((chunk) => chunk.index)).toEqual([0, 1, 2, 3, 4]);
  });

  it("returns an empty array for blank input", () => {
    expect(chunkText("   \n\t  ")).toEqual([]);
  });
});
