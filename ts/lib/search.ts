/**
 * Matching for the ledger account combobox: forgiving enough that what the user
 * types finds the account they mean, whichever script they type it in.
 *
 * Matching runs in two spaces.
 *
 * 1. **Normalized space** - width, kana/katakana and punctuation folded together.
 *    Kanji are left as they are, so typing kanji and skipping characters
 *    ("水熱" matching "水道光熱費") lands here.
 * 2. **Romaji space** - kana projected onto latin letters. Queries that cross
 *    between kana and latin land here ("ぱy" matching "PayPay", "kurejitto"
 *    matching "クレジットカード").
 *
 * **Kanji readings are out of scope.** "しょくひ" cannot reach "食費" from the
 * strings alone; that needs a dictionary or a morphological analyzer, which would
 * cost megabytes of dependency. Something else has to solve it.
 */

/** Two-character kana with a small ya/yu/yo. Looked up before single characters. */
const DIGRAPH_ROMAJI: Record<string, string> = {
  きゃ: "kya",
  きゅ: "kyu",
  きょ: "kyo",
  しゃ: "sya",
  しゅ: "syu",
  しょ: "syo",
  ちゃ: "tya",
  ちゅ: "tyu",
  ちょ: "tyo",
  にゃ: "nya",
  にゅ: "nyu",
  にょ: "nyo",
  ひゃ: "hya",
  ひゅ: "hyu",
  ひょ: "hyo",
  みゃ: "mya",
  みゅ: "myu",
  みょ: "myo",
  りゃ: "rya",
  りゅ: "ryu",
  りょ: "ryo",
  ぎゃ: "gya",
  ぎゅ: "gyu",
  ぎょ: "gyo",
  じゃ: "zya",
  じゅ: "zyu",
  じょ: "zyo",
  ぢゃ: "zya",
  ぢゅ: "zyu",
  ぢょ: "zyo",
  びゃ: "bya",
  びゅ: "byu",
  びょ: "byo",
  ぴゃ: "pya",
  ぴゅ: "pyu",
  ぴょ: "pyo",
  // Combinations used for loanwords. Katakana account names really do contain these.
  ふぁ: "fa",
  ふぃ: "fi",
  ふぇ: "fe",
  ふぉ: "fo",
  うぃ: "wi",
  うぇ: "we",
  うぉ: "wo",
  てぃ: "ti",
  でぃ: "di",
  とぅ: "tu",
  どぅ: "du",
  しぇ: "sye",
  じぇ: "zye",
  ちぇ: "tye",
  つぁ: "tua",
  つぃ: "tui",
  つぇ: "tue",
  つぉ: "tuo",
}

/**
 * Single kana. Sounds that have more than one spelling are **collapsed onto one**
 * - "si" rather than "shi", for instance. Whatever the user types is folded the
 * same way by canonicalizeRomaji, so both sides meet.
 */
const KANA_ROMAJI: Record<string, string> = {
  あ: "a",
  い: "i",
  う: "u",
  え: "e",
  お: "o",
  か: "ka",
  き: "ki",
  く: "ku",
  け: "ke",
  こ: "ko",
  さ: "sa",
  し: "si",
  す: "su",
  せ: "se",
  そ: "so",
  た: "ta",
  ち: "ti",
  つ: "tu",
  て: "te",
  と: "to",
  な: "na",
  に: "ni",
  ぬ: "nu",
  ね: "ne",
  の: "no",
  は: "ha",
  ひ: "hi",
  ふ: "hu",
  へ: "he",
  ほ: "ho",
  ま: "ma",
  み: "mi",
  む: "mu",
  め: "me",
  も: "mo",
  や: "ya",
  ゆ: "yu",
  よ: "yo",
  ら: "ra",
  り: "ri",
  る: "ru",
  れ: "re",
  ろ: "ro",
  わ: "wa",
  ゐ: "wi",
  ゑ: "we",
  を: "wo",
  ん: "n",
  が: "ga",
  ぎ: "gi",
  ぐ: "gu",
  げ: "ge",
  ご: "go",
  ざ: "za",
  じ: "zi",
  ず: "zu",
  ぜ: "ze",
  ぞ: "zo",
  だ: "da",
  ぢ: "zi",
  づ: "zu",
  で: "de",
  ど: "do",
  ば: "ba",
  び: "bi",
  ぶ: "bu",
  べ: "be",
  ぼ: "bo",
  ぱ: "pa",
  ぴ: "pi",
  ぷ: "pu",
  ぺ: "pe",
  ぽ: "po",
  ゔ: "bu",
  // Small kana standing on their own. Digraphs are consumed by DIGRAPH_ROMAJI first.
  ぁ: "a",
  ぃ: "i",
  ぅ: "u",
  ぇ: "e",
  ぉ: "o",
  ゃ: "ya",
  ゅ: "yu",
  ょ: "yo",
  ゎ: "wa",
  // Gemination and long vowels are dropped: both only ever repeat a neighbouring
  // letter, and repeats are collapsed at the end anyway.
  っ: "",
  ー: "",
}

/** Alternative romaji spellings. Longer ones are applied first. */
const ROMAJI_VARIANTS: [RegExp, string][] = [
  [/shi/g, "si"],
  [/sha/g, "sya"],
  [/shu/g, "syu"],
  [/sho/g, "syo"],
  [/chi/g, "ti"],
  [/cha/g, "tya"],
  [/chu/g, "tyu"],
  [/cho/g, "tyo"],
  [/tsu/g, "tu"],
  [/jya/g, "zya"],
  [/jyu/g, "zyu"],
  [/jyo/g, "zyo"],
  [/ja/g, "zya"],
  [/ju/g, "zyu"],
  [/jo/g, "zyo"],
  [/ji/g, "zi"],
  [/fu/g, "hu"],
]

/** Separators that only get in the way of matching. */
const IGNORED = /[\s・･,、.。_/\\()（）\-‐―[\]{}"'`]/g

/**
 * Fold width, case, kana script and separators. The long-vowel mark survives: it
 * disappears on the way to romaji, but the kana-space comparison wants to keep
 * the shape of a word like "かーど".
 */
export const normalize = (value: string): string =>
  value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(IGNORED, "")

/** Fold romaji spellings and collapse runs of one letter (gemination, long vowels, "nn"). */
const canonicalizeRomaji = (value: string): string => {
  let result = value
  for (const [pattern, replacement] of ROMAJI_VARIANTS) {
    result = result.replace(pattern, replacement)
  }
  return result.replace(/(.)\1+/g, "$1")
}

/**
 * Project onto romaji: kana become latin letters and **everything else (latin,
 * digits, kanji) is left untouched**. Kanji survive because their reading is
 * unknown here - matching them is the normalized space's job.
 */
export const toRomajiKey = (value: string): string => {
  const normalized = normalize(value)

  let result = ""
  for (let i = 0; i < normalized.length; i++) {
    const pair = normalized.slice(i, i + 2)
    const digraph = DIGRAPH_ROMAJI[pair]
    if (digraph !== undefined) {
      result += digraph
      i++
      continue
    }

    const char = normalized[i] as string
    const kana = KANA_ROMAJI[char]
    result += kana !== undefined ? kana : char
  }

  return canonicalizeRomaji(result)
}

/** Whether needle's characters appear in haystack in order, gaps allowed. */
const isSubsequence = (haystack: string, needle: string): boolean => {
  let index = 0
  for (const char of haystack) {
    if (char === needle[index]) index++
    if (index === needle.length) return true
  }
  return needle.length === 0
}

/**
 * Whether a candidate's label matches the query. An empty query matches
 * everything (nothing has been narrowed yet).
 *
 * Skipping characters (subsequence) is allowed **only in the normalized space**.
 * One kana becomes two or three letters in romaji, so allowing it there would
 * match almost every candidate.
 */
export const matchesQuery = (label: string, query: string): boolean => {
  const q = normalize(query)
  if (!q) return true

  const l = normalize(label)
  if (l.includes(q)) return true
  if (q.length >= 2 && isSubsequence(l, q)) return true

  const romajiQuery = toRomajiKey(query)
  if (!romajiQuery) return false

  return toRomajiKey(label).includes(romajiQuery)
}
