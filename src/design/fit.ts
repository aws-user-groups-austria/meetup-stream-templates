/**
 * Choose a type token for text that has to fit a box, without measuring the
 * DOM: a deterministic word-wrap estimate with a conservative average glyph
 * width for Amazon Ember and Inter (CHAR_W). The theme's tokens are the only
 * sizes there are, so a long title steps down from Title to Heading, never to
 * a size in between.
 */
import { CHAR_W, TYPE, type TypeName } from "../theme";

export const estimateLines = (text: string, fontSize: number, width: number, charWidth = CHAR_W): number => {
  const maxChars = Math.max(1, Math.floor(width / (fontSize * charWidth)));
  let lines = 1;
  let current = 0;
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const needed = current === 0 ? word.length : current + 1 + word.length;
    if (needed > maxChars && current > 0) {
      lines += 1;
      current = word.length;
    } else {
      current = needed;
    }
  }
  return lines;
};

/** Characters in the longest word: a word never breaks, so it bounds the size. */
export const longestWord = (text: string): number => Math.max(0, ...text.split(/\s+/).map((w) => w.length));

/**
 * The first token, in the order given, at which `text` fits `width` in
 * `maxLines` with its longest word on one line; the last one otherwise.
 */
export const fitToken = (text: string, width: number, maxLines: number, names: TypeName[]): TypeName => {
  for (const name of names) {
    const size = TYPE[name].size;
    if (longestWord(text) * size * CHAR_W <= width && estimateLines(text, size, width) <= maxLines) return name;
  }
  return names[names.length - 1]!;
};
