declare module "bidi-js" {
  export interface EmbeddingLevels {
    levels: Uint8Array;
    paragraphs: { start: number; end: number; level: number }[];
  }

  export interface BidiJs {
    getEmbeddingLevels(text: string, baseDirection?: "ltr" | "rtl"): EmbeddingLevels;
    getReorderedString(text: string, embeddingLevels: EmbeddingLevels, start?: number, end?: number): string;
    getReorderedIndices(text: string, embeddingLevels: EmbeddingLevels, start?: number, end?: number): number[];
    getReorderSegments(text: string, embeddingLevels: EmbeddingLevels, start?: number, end?: number): number[][];
    getMirroredCharacter(char: string): string | undefined;
    getMirroredCharactersMap(text: string, embeddingLevels: EmbeddingLevels, start?: number, end?: number): Map<number, string>;
    getBidiCharType(char: string): string;
    getBidiCharTypeName(char: string): string;
    closingToOpeningBracket(char: string): string | undefined;
    openingToClosingBracket(char: string): string | undefined;
  }

  export default function bidiFactory(): BidiJs;
}
