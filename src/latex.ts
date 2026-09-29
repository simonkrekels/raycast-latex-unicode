/**
 * LaTeX → Unicode, Julia-REPL style: `\alpha` → α, `x^2` → x², `\mathbb{R}` → ℝ, `\vec{v}` → v⃗.
 *
 * Symbol tables come from the `unicodeit` package (4000+ names from the W3C unicode-math list).
 * The small recursive-descent parser here adds what a naive find-and-replace cannot do well:
 * brace grouping, nested sub/superscripts, font commands over several letters, accents,
 * \frac, \sqrt, \not, \text and spacing/sizing commands.
 */
import { replacements, combiningmarks, subsuperscripts } from "unicodeit/ts_dist/js/data";

/** Code point → string; keeps combining marks and spaces legible in this file. */
const cp = (n: number): string => String.fromCodePoint(n);
const table = (entries: Record<string, number>): [string, string][] =>
  Object.entries(entries).map(([k, v]) => [k, cp(v)]);

// ---------------------------------------------------------------------------
// Tables

const SYMBOLS = new Map<string, string>();
for (const [latex, unicode] of replacements) {
  // unicodeit turns every hyphen into U+2212 MINUS SIGN; keep what the user typed instead.
  if (latex === "-") continue;
  SYMBOLS.set(latex, unicode);
}
// Names the Julia REPL knows that unicodeit lacks.
for (const [k, v] of Object.entries({ "\\euler": "ℯ", "\\ldots": "…", "\\dots": "…" })) {
  if (!SYMBOLS.has(k)) SYMBOLS.set(k, v);
}

const SUP = new Map<string, string>();
const SUB = new Map<string, string>();
for (const [key, value] of subsuperscripts) {
  (key[0] === "^" ? SUP : SUB).set(key.slice(1), value);
}
// A few Unicode superscripts that unicodeit's table leaves out.
for (const [k, v] of table({ α: 0x1d45, ε: 0x1d4b, θ: 0x1dbf, ι: 0x1da5, υ: 0x1db9 })) SUP.set(k, v);
SUP.set(",", ",");
SUB.set(",", ",");
const SUP_VALUES = new Set(SUP.values());
const SUB_VALUES = new Set(SUB.values());

/** Text-mode accents written as control symbols: \'e → é. */
const TEXT_ACCENTS = new Map<string, string>(
  table({ "'": 0x0301, "`": 0x0300, "^": 0x0302, '"': 0x0308, "~": 0x0303, "=": 0x0304, ".": 0x0307 }),
);

/** Accent command name (without backslash) → combining mark appended to each base character. */
const ACCENTS = new Map<string, string>(combiningmarks.map(([k, v]) => [k.slice(1), v]));
for (const [k, v] of table({
  check: 0x030c,
  mathring: 0x030a,
  ring: 0x030a,
  widehat: 0x0302,
  widetilde: 0x0303,
  overrightarrow: 0x20d7,
  overleftarrow: 0x20d6,
  overleftrightarrow: 0x20e1,
  cancel: 0x0338,
  sout: 0x0336,
  underbar: 0x0331,
  // text-mode accents with letter names: \v{s} → š, \c{c} → ç
  u: 0x0306,
  v: 0x030c,
  H: 0x030b,
  c: 0x0327,
  k: 0x0328,
  r: 0x030a,
  b: 0x0331,
  d: 0x0323,
  t: 0x0361,
})) {
  if (!ACCENTS.has(k)) ACCENTS.set(k, v);
}
const COMBINING_SLASH = cp(0x0338);
const FRACTION_SLASH = cp(0x2044);

/** Font command → the unicodeit table prefix it maps onto (e.g. `\mathbb{R}`). */
const FONTS: Record<string, string> = {
  mathbb: "mathbb",
  mathcal: "mathcal",
  mathscr: "mathscr",
  mathfrak: "mathfrak",
  mathbf: "mathbf",
  mathit: "mathit",
  mathsf: "mathsf",
  mathtt: "mathtt",
  mathbfit: "mathbfit",
  boldsymbol: "mathbf",
  bm: "mathbf",
  textbf: "mathbf",
  textit: "mathit",
  textsf: "mathsf",
  texttt: "mathtt",
  Bbb: "mathbb",
  cal: "mathcal",
  frak: "mathfrak",
};
/** When a font has no glyph for a letter, try this one before giving up. */
const FONT_FALLBACK: Record<string, string> = {
  mathscr: "mathcal",
  mathbfit: "mathbf",
  mathsfbf: "mathsf",
  mathsfit: "mathsf",
  mathsfbfit: "mathsfbf",
};

/** Julia REPL shorthands: \bbR → ℝ, \scrL → ℒ, \bfalpha → 𝛂. Longest prefix first. */
const JULIA_FONTS: [string, string][] = [
  ["bisans", "mathsfbfit"],
  ["bsans", "mathsfbf"],
  ["isans", "mathsfit"],
  ["frak", "mathfrak"],
  ["scr", "mathcal"],
  ["bb", "mathbb"],
  ["bf", "mathbf"],
  ["bi", "mathbfit"],
  ["it", "mathit"],
  ["sf", "mathsf"],
  ["tt", "mathtt"],
];

/** Commands whose argument is emitted as-is (after conversion). */
const TEXT_COMMANDS = new Set([
  "text",
  "textrm",
  "textnormal",
  "mathrm",
  "mathnormal",
  "operatorname",
  "mbox",
  "hbox",
  "mathop",
]);

/** Operator names that are simply written out. */
const OPERATORS = new Set([
  "lim",
  "liminf",
  "limsup",
  "sin",
  "cos",
  "tan",
  "cot",
  "sec",
  "csc",
  "arcsin",
  "arccos",
  "arctan",
  "sinh",
  "cosh",
  "tanh",
  "coth",
  "log",
  "ln",
  "lg",
  "exp",
  "max",
  "min",
  "sup",
  "inf",
  "det",
  "dim",
  "ker",
  "arg",
  "deg",
  "gcd",
  "lcm",
  "hom",
  "Pr",
  "tr",
  "rank",
  "sgn",
  "span",
]);

/** Commands that only affect layout in real LaTeX. */
const NOOP = new Set([
  "left",
  "right",
  "middle",
  "big",
  "Big",
  "bigg",
  "Bigg",
  "bigl",
  "bigr",
  "Bigl",
  "Bigr",
  "biggl",
  "biggr",
  "Biggl",
  "Biggr",
  "bigm",
  "Bigm",
  "displaystyle",
  "textstyle",
  "scriptstyle",
  "scriptscriptstyle",
  "limits",
  "nolimits",
  "mathstrut",
  "relax",
  "nonumber",
  "notag",
  "strut",
]);

const EM_SPACE = cp(0x2003);
const SPACING: Record<string, string> = {
  quad: EM_SPACE,
  qquad: EM_SPACE + EM_SPACE,
  enspace: cp(0x2002),
  thinspace: cp(0x2009),
  medspace: cp(0x2005),
  thickspace: cp(0x2004),
  negthinspace: "",
  negmedspace: "",
  negthickspace: "",
  newline: "\n",
  linebreak: "\n",
};

const VULGAR: Record<string, string> = {
  "1/2": "½",
  "1/3": "⅓",
  "2/3": "⅔",
  "1/4": "¼",
  "3/4": "¾",
  "1/5": "⅕",
  "2/5": "⅖",
  "3/5": "⅗",
  "4/5": "⅘",
  "1/6": "⅙",
  "5/6": "⅚",
  "1/7": "⅐",
  "1/8": "⅛",
  "3/8": "⅜",
  "5/8": "⅝",
  "7/8": "⅞",
  "1/9": "⅑",
  "1/10": "⅒",
};

/** `\not` followed by a symbol that has a precomposed negation. */
const NEGATED: Record<string, string> = {
  "=": "≠",
  "<": "≮",
  ">": "≯",
  "∈": "∉",
  "∋": "∌",
  "⊂": "⊄",
  "⊃": "⊅",
  "⊆": "⊈",
  "⊇": "⊉",
  "≡": "≢",
  "≤": "≰",
  "≥": "≱",
  "∼": "≁",
  "≃": "≄",
  "≅": "≇",
  "≈": "≉",
  "∣": "∤",
  "∥": "∦",
  "⊢": "⊬",
  "⊨": "⊭",
  "∃": "∄",
  "≺": "⋠",
  "≻": "⋡",
  "⊑": "⋢",
  "⊒": "⋣",
  "→": "↛",
  "←": "↚",
  "↔": "↮",
  "⇒": "⇏",
  "⇐": "⇍",
  "⇔": "⇎",
};

const PRIMES = ["", "′", "″", "‴", "⁗"];

// ---------------------------------------------------------------------------
// Scanner helpers

const isLetter = (c: string | undefined): boolean => c !== undefined && /[A-Za-z]/.test(c);
const chars = (s: string): string[] => Array.from(s);

/** `s[i]` is `{`; returns the group's inner text and the index after the closing brace. */
function readGroup(s: string, i: number): [string, number] {
  let depth = 0;
  for (let j = i; j < s.length; j++) {
    const c = s[j];
    if (c === "\\") {
      j++; // skip the escaped character (\{ and \} do not count)
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return [s.slice(i + 1, j), j + 1];
  }
  return [s.slice(i + 1), s.length]; // unbalanced while typing: take the rest
}

/** Reads one argument: a `{group}`, a `\command`, or a single character. */
function readArg(s: string, i: number): [string, number] {
  while (i < s.length && s[i] === " ") i++;
  if (i >= s.length) return ["", i];
  if (s[i] === "{") return readGroup(s, i);
  if (s[i] === "\\") {
    let j = i + 1;
    if (isLetter(s[j])) while (isLetter(s[j])) j++;
    else j = Math.min(j + 1, s.length);
    return [s.slice(i, j), j];
  }
  const len = (s.codePointAt(i) ?? 0) > 0xffff ? 2 : 1;
  return [s.slice(i, i + len), i + len];
}

/** Reads an optional `[...]` argument if present. */
function readOptional(s: string, i: number): [string | null, number] {
  let j = i;
  while (j < s.length && s[j] === " ") j++;
  if (s[j] !== "[") return [null, i];
  const end = s.indexOf("]", j);
  if (end === -1) return [null, i];
  return [s.slice(j + 1, end), end + 1];
}

// ---------------------------------------------------------------------------
// Building blocks

/** Every character of `inner` as a super/subscript, or null when Unicode has no glyph for one of them. */
function tryScript(kind: "^" | "_", inner: string): string | null {
  const map = kind === "^" ? SUP : SUB;
  const already = kind === "^" ? SUP_VALUES : SUB_VALUES;
  let out = "";
  for (const ch of chars(inner)) {
    const m = map.get(ch);
    if (m !== undefined) out += m;
    else if (already.has(ch) || ch === " ") out += ch;
    else return null;
  }
  return out;
}

/** Sub/superscript with a readable fallback (`x^(n+1)`) when Unicode cannot express it. */
function script(kind: "^" | "_", inner: string): string {
  if (inner === "") return kind;
  return tryScript(kind, inner) ?? kind + (chars(inner).length > 1 ? `(${inner})` : inner);
}

const needsParens = (x: string): boolean => /[\s+\-−±∓=<>≤≥/·⋅×÷,]/.test(x);
const group = (x: string): string => (needsParens(x) ? `(${x})` : x);
/** Inside \frac and \sqrt, drop the space LaTeX would swallow between a symbol and a letter: `\partial f` → ∂f. */
const tighten = (x: string): string => x.replace(/(?<=\P{ASCII}) (?=[A-Za-z])/gu, "");

function applyFont(font: string, inner: string): string {
  const fallback = FONT_FALLBACK[font];
  return chars(inner)
    .map((ch) => SYMBOLS.get(`\\${font}{${ch}}`) ?? (fallback && SYMBOLS.get(`\\${fallback}{${ch}}`)) ?? ch)
    .join("");
}

function applyCombining(inner: string, mark: string): string {
  return chars(inner)
    .map((ch) => (/\s/.test(ch) ? ch : ch + mark))
    .join("");
}

// ---------------------------------------------------------------------------
// Parser

/** Handles the command starting at `s[i] === "\\"`; returns the output and the index to resume from. */
function command(s: string, i: number): [string, number] {
  const j = i + 1;
  if (j >= s.length) return ["\\", j];
  const ch = s[j];

  // --- control symbols: \, \; \{ \'e \^2 \:) ...
  if (!isLetter(ch)) {
    const two = SYMBOLS.get(s.slice(i, j + 2)); // \:) → ☺
    if (two !== undefined && j + 1 < s.length) return [two, j + 2];
    if (ch === "^" || ch === "_") {
      // Julia-style \^2 → ², \_i → ᵢ
      const [arg, next] = readArg(s, j + 1);
      const inner = convertInner(arg);
      const sc = tryScript(ch, inner);
      if (sc !== null && arg !== "") return [sc, next];
      if (ch === "^" && inner !== "") return [applyCombining(inner, TEXT_ACCENTS.get("^") ?? ""), next]; // \^o → ô
      return [ch, j + 1];
    }
    const textAccent = TEXT_ACCENTS.get(ch);
    if (textAccent !== undefined) {
      // \'e → é, \"u → ü, \~n → ñ
      const [arg, next] = readArg(s, j + 1);
      const inner = convertInner(arg);
      if (inner === "") return [ch, j + 1];
      return [applyCombining(inner, textAccent), next];
    }
    switch (ch) {
      case "\\":
        return ["\n", j + 1];
      case ",":
        return [SPACING.thinspace, j + 1];
      case ";":
      case ":":
        return [SPACING.medspace, j + 1];
      case "!":
        return ["", j + 1];
      case " ":
        return [" ", j + 1];
    }
    return [SYMBOLS.get(`\\${ch}`) ?? `\\${ch}`, j + 1];
  }

  // --- named commands
  let k = j;
  while (isLetter(s[k])) k++;
  const name = s.slice(j, k);
  const cmd = `\\${name}`;

  const font = FONTS[name];
  if (font !== undefined) {
    const [arg, next] = readArg(s, k);
    const direct = SYMBOLS.get(`\\${font}{${arg}}`); // e.g. \mathbb{\gamma} → ℽ
    if (direct !== undefined) return [direct, next];
    return [applyFont(font, convertInner(arg)), next];
  }

  if (TEXT_COMMANDS.has(name)) {
    const [arg, next] = readArg(s, k);
    return [convertInner(arg), next];
  }

  const accent = ACCENTS.get(name);
  if (accent !== undefined) {
    const [arg, next] = readArg(s, k);
    const inner = convertInner(arg);
    if (inner === "") {
      const hadGroup = s.slice(k).trimStart().startsWith("{");
      return [hadGroup ? (SYMBOLS.get(`${cmd}{}`) ?? "") : cmd, next]; // \hat{} → ˆ, bare \hat stays as typed
    }
    return [applyCombining(inner, accent), next];
  }

  switch (name) {
    case "not":
      return notCommand(s, k);
    case "frac":
    case "dfrac":
    case "tfrac":
    case "nicefrac":
    case "sfrac":
      return fracCommand(s, k);
    case "binom":
    case "dbinom":
    case "tbinom":
      return binomCommand(s, k);
    case "sqrt":
      return sqrtCommand(s, k);
    case "xrightarrow":
    case "xleftarrow": {
      const [, k1] = readOptional(s, k);
      const [arg, next] = readArg(s, k1);
      const arrow = name === "xrightarrow" ? "→" : "←";
      return [arrow + (tryScript("^", convertInner(arg)) ?? ""), next];
    }
    case "overset":
    case "stackrel":
    case "underset": {
      const [topRaw, k1] = readArg(s, k);
      const [baseRaw, next] = readArg(s, k1);
      const base = convertInner(baseRaw);
      const annotation = tryScript(name === "underset" ? "_" : "^", convertInner(topRaw)) ?? "";
      return [base + annotation, next];
    }
    case "pmod": {
      const [arg, next] = readArg(s, k);
      return [` (mod ${convertInner(arg)})`, next];
    }
    case "mod":
    case "bmod":
      return [" mod ", k];
    case "begin":
    case "end":
    case "label":
    case "tag":
    case "vspace": {
      const [, next] = readArg(s, k);
      return ["", next];
    }
    case "hspace": {
      const [, next] = readArg(s, k);
      return [" ", next];
    }
  }

  if (NOOP.has(name)) {
    let next = k;
    if ((name === "left" || name === "right" || name === "middle") && s[next] === ".") next++; // \left. is invisible
    return ["", next];
  }
  if (name in SPACING) return [SPACING[name], k];

  const symbol = SYMBOLS.get(cmd);
  if (symbol !== undefined) return [symbol, k];
  if (OPERATORS.has(name)) return [name, k];

  for (const [prefix, font] of JULIA_FONTS) {
    if (!name.startsWith(prefix) || name.length === prefix.length) continue;
    const rest = name.slice(prefix.length);
    if (rest.length === 1) return [applyFont(font, rest), k];
    const greek = SYMBOLS.get(`\\${font}{\\${rest}}`) ?? SYMBOLS.get(`\\${FONT_FALLBACK[font] ?? font}{\\${rest}}`);
    if (greek !== undefined) return [greek, k];
  }
  return [cmd, k]; // unknown: leave as typed
}

function notCommand(s: string, k: number): [string, number] {
  const [arg, next] = readArg(s, k);
  const inner = convertInner(arg);
  const negated = NEGATED[inner];
  if (negated !== undefined) return [negated, next];
  if (arg.startsWith("\\")) {
    const name = arg.slice(1);
    const pre = SYMBOLS.get(`\\not${name}`) ?? (name.length >= 3 ? SYMBOLS.get(`\\n${name}`) : undefined);
    if (pre !== undefined) return [pre, next];
  }
  return [inner === "" ? COMBINING_SLASH : inner + COMBINING_SLASH, next];
}

function fracCommand(s: string, k: number): [string, number] {
  const [numRaw, k1] = readArg(s, k);
  const [denRaw, next] = readArg(s, k1);
  const num = tighten(convertInner(numRaw));
  const den = tighten(convertInner(denRaw));
  const vulgar = VULGAR[`${num}/${den}`];
  if (vulgar !== undefined) return [vulgar, next];
  if (num !== "" && den !== "") {
    const sup = tryScript("^", num);
    const sub = tryScript("_", den);
    if (sup !== null && sub !== null) return [sup + FRACTION_SLASH + sub, next]; // ᵃ⁄ᵦ
  }
  return [`${group(num)}/${group(den)}`, next];
}

function binomCommand(s: string, k: number): [string, number] {
  const [topRaw, k1] = readArg(s, k);
  const [bottomRaw, next] = readArg(s, k1);
  const top = convertInner(topRaw);
  const bottom = convertInner(bottomRaw);
  const sup = tryScript("^", top);
  const sub = tryScript("_", bottom);
  if (sup !== null && sub !== null && top !== "" && bottom !== "") return [`(${sup}${sub})`, next];
  return [`C(${top}, ${bottom})`, next];
}

function sqrtCommand(s: string, k: number): [string, number] {
  const [indexRaw, k1] = readOptional(s, k);
  const [arg, next] = readArg(s, k1);
  const radicand = group(tighten(convertInner(arg)));
  const index = indexRaw === null ? "" : convertInner(indexRaw);
  const root = index === "" ? "√" : index === "3" ? "∛" : index === "4" ? "∜" : `${tryScript("^", index) ?? index}√`;
  return [root + radicand, next];
}

function convertInner(s: string): string {
  let out = "";
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === "\\") {
      const [piece, next] = command(s, i);
      out += piece;
      i = next;
    } else if (c === "^" || c === "_") {
      const [arg, next] = readArg(s, i + 1);
      out += script(c, convertInner(arg));
      i = next;
    } else if (c === "{") {
      const [inner, next] = readGroup(s, i);
      out += convertInner(inner);
      i = next;
    } else if (c === "}" || c === "$") {
      i++; // stray brace or math delimiter
    } else if (c === "'") {
      let n = 0;
      while (s[i + n] === "'") n++;
      // f'(x) → f′(x), but leave apostrophes inside words (don't) alone
      out += isLetter(s[i + n]) || i === 0 ? s.slice(i, i + n) : (PRIMES[n] ?? PRIMES[1].repeat(n));
      i += n;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Public API

/** Converts LaTeX math to Unicode text. Unknown commands are left as typed. */
export function convert(latex: string): string {
  return convertInner(latex.replace(/\\\(|\\\)|\\\[|\\\]/g, ""))
    .normalize("NFC")
    .trim();
}

export interface Completion {
  /** Full command, e.g. `\alpha`. */
  latex: string;
  /** What it produces, e.g. `α`. */
  symbol: string;
  /** Usage hint for commands that take arguments. */
  hint?: string;
}

const STRUCTURAL: Completion[] = [
  { latex: "\\frac", symbol: "½", hint: "\\frac{a}{b}" },
  { latex: "\\sqrt", symbol: "√", hint: "\\sqrt[n]{x}" },
  { latex: "\\hat", symbol: convert("\\hat{x}"), hint: "\\hat{x}" },
  { latex: "\\vec", symbol: convert("\\vec{v}"), hint: "\\vec{v}" },
  { latex: "\\bar", symbol: convert("\\bar{x}"), hint: "\\bar{x}" },
  { latex: "\\dot", symbol: convert("\\dot{x}"), hint: "\\dot{x}" },
  { latex: "\\ddot", symbol: convert("\\ddot{x}"), hint: "\\ddot{x}" },
  { latex: "\\tilde", symbol: convert("\\tilde{x}"), hint: "\\tilde{x}" },
  { latex: "\\overline", symbol: convert("\\overline{x}"), hint: "\\overline{x}" },
  { latex: "\\underline", symbol: convert("\\underline{x}"), hint: "\\underline{x}" },
  { latex: "\\mathbb", symbol: "ℝ", hint: "\\mathbb{R}" },
  { latex: "\\mathcal", symbol: "ℒ", hint: "\\mathcal{L}" },
  { latex: "\\mathfrak", symbol: "𝔤", hint: "\\mathfrak{g}" },
  { latex: "\\mathbf", symbol: "𝐱", hint: "\\mathbf{x}" },
  { latex: "\\mathit", symbol: "𝑥", hint: "\\mathit{x}" },
  { latex: "\\mathsf", symbol: "𝖠", hint: "\\mathsf{A}" },
  { latex: "\\mathtt", symbol: "𝙰", hint: "\\mathtt{A}" },
  { latex: "\\text", symbol: "abc", hint: "\\text{abc}" },
  { latex: "\\not", symbol: "∉", hint: "\\not\\in" },
  { latex: "\\binom", symbol: "(ⁿₖ)", hint: "\\binom{n}{k}" },
];

const NAMES: Completion[] = [
  ...STRUCTURAL,
  ...replacements.filter(([latex]) => /^\\[A-Za-z]+$/.test(latex)).map(([latex, symbol]) => ({ latex, symbol })),
];

/** If `text` ends in a (possibly incomplete) command, where it starts and its name so far. */
export function trailingCommand(text: string): { start: number; name: string } | null {
  const m = /\\([A-Za-z]*)$/.exec(text);
  return m ? { start: m.index, name: m[1] } : null;
}

/** Julia-REPL style completions for a partial command name (without the backslash). */
export function completions(partial: string, limit = 60): Completion[] {
  if (partial === "") return [];
  const lower = partial.toLowerCase();
  const exact: Completion[] = [];
  const prefix: Completion[] = [];
  const infix: Completion[] = [];
  for (const entry of NAMES) {
    const name = entry.latex.slice(1);
    if (name.startsWith(partial)) exact.push(entry);
    else if (name.toLowerCase().startsWith(lower)) prefix.push(entry);
    else if (name.toLowerCase().includes(lower)) infix.push(entry);
  }
  const byLength = (a: Completion, b: Completion) => a.latex.length - b.latex.length || a.latex.localeCompare(b.latex);
  return [...exact.sort(byLength), ...prefix.sort(byLength), ...infix.sort(byLength)].slice(0, limit);
}

/** True when `\name` on its own already converts to something. */
export function isKnownCommand(name: string): boolean {
  return convert(`\\${name}`) !== `\\${name}`;
}
