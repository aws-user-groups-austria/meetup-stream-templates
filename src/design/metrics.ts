/**
 * Text widths in Amazon Ember Bold, from the font's own advance widths (em,
 * measured once from AmazonEmber_Bd.ttf; numbers only, no font data). Used to
 * decide whether a title or name fits on one line when Amazon Ember is the
 * face on screen. With the Inter fallback the conservative CHAR_W estimate
 * applies instead (see useEmber in fonts.ts).
 */
import { CHAR_W } from "../theme";

const CHARS = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~äöüÄÖÜßéèáàšŠčČćĆžŽđĐ";
const WIDTHS = [0.262, 0.296, 0.452, 0.586, 0.586, 0.94, 0.744, 0.248, 0.351, 0.351, 0.404, 0.586, 0.284, 0.402, 0.284, 0.516, 0.586, 0.586, 0.586, 0.586, 0.586, 0.586, 0.586, 0.586, 0.586, 0.586, 0.284, 0.284, 0.586, 0.586, 0.586, 0.444, 0.975, 0.665, 0.632, 0.615, 0.711, 0.578, 0.54, 0.709, 0.736, 0.318, 0.455, 0.672, 0.543, 0.864, 0.734, 0.796, 0.619, 0.796, 0.637, 0.585, 0.596, 0.724, 0.663, 0.954, 0.63, 0.63, 0.598, 0.37, 0.516, 0.37, 0.586, 0.5, 0.612, 0.546, 0.615, 0.473, 0.612, 0.541, 0.388, 0.596, 0.612, 0.294, 0.294, 0.582, 0.325, 0.917, 0.612, 0.594, 0.615, 0.612, 0.405, 0.445, 0.394, 0.6, 0.534, 0.798, 0.506, 0.536, 0.493, 0.396, 0.32, 0.396, 0.586, 0.546, 0.594, 0.6, 0.665, 0.796, 0.724, 0.644, 0.541, 0.541, 0.546, 0.546, 0.445, 0.585, 0.473, 0.627, 0.473, 0.617, 0.493, 0.598, 0.612, 0.721];

const ADVANCE = new Map<string, number>([...CHARS].map((c, i) => [c, WIDTHS[i]!]));
/** A character not in the table: a wide one, so an estimate never comes out short. */
const UNKNOWN = 0.7;

/** Width in px of `text` set in Amazon Ember Bold at `size` px. */
export const emberBoldWidth = (text: string, size: number): number =>
  [...text].reduce((w, c) => w + (ADVANCE.get(c) ?? UNKNOWN), 0) * size;

/** Width in px of bold `text` at `size`: Amazon Ember's real widths, or the fallback's conservative estimate. */
export const boldWidth = (text: string, size: number, ember: boolean): number =>
  ember ? emberBoldWidth(text, size) : text.length * size * CHAR_W;
