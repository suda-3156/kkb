/**
 * 勘定科目の絞り込み。日本語入力で「打った通りに当たらない」のを減らすための、
 * 表記ゆれに寛容な照合。
 *
 * 照合は 2 つの空間で行う。
 *
 * 1. **正規化空間** — 全半角・かなカナ・記号を揃えただけの文字列。漢字はそのまま
 *    なので、漢字で打つ場合の飛ばし読み(「水熱」→「水道光熱費」)はここで当たる。
 * 2. **ローマ字空間** — かなをローマ字へ落とした文字列。かなと英字をまたぐ照合が
 *    ここで当たる(「ぱy」→「PayPay」、「kurejitto」→「クレジットカード」)。
 *
 * **漢字の読みは扱わない。** 「しょくひ」→「食費」は文字列だけからは導けず、辞書か
 * 形態素解析が要る。ここに持ち込むと数 MB 級の依存になるので、別の手段に任せる。
 */

/** ゃゅょ などを伴う 2 文字のかな。1 文字より先に引く。 */
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
  // 外来語に使う組み。カナ科目名(クレジット、ティッシュ)で実際に出る。
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
 * 1 文字のかな。「し」を shi ではなく si に寄せるなど、**ゆれのある音は片方に統一**
 * する。打つ側のゆれは canonicalizeRomaji が同じ形へ畳むので、両側が揃う。
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
  // 単独で出てきた小書き文字。拗音は DIGRAPH_ROMAJI が先に食う。
  ぁ: "a",
  ぃ: "i",
  ぅ: "u",
  ぇ: "e",
  ぉ: "o",
  ゃ: "ya",
  ゅ: "yu",
  ょ: "yo",
  ゎ: "wa",
  // 促音・長音は落とす。どちらも「直前/直後の文字の繰り返し」にしかならず、
  // 繰り返しは最後に畳むので、書き出しても結果は変わらない。
  っ: "",
  ー: "",
}

/** ローマ字入力のゆれ。長いものから先に当てる。 */
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

/** 照合の邪魔にしかならない区切り。 */
const IGNORED = /[\s・･,、.。_/\\()（）\-‐―[\]{}"'`]/g

/**
 * 全半角・大文字小文字・かなカナ・区切り記号を揃える。長音符は残す(ローマ字へ
 * 落とすときに消えるが、かなのまま比べる側では「かーど」の形を保ちたい)。
 */
export const normalize = (value: string): string =>
  value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(IGNORED, "")

/** ローマ字のゆれを畳み、連続する同じ文字を 1 つにする(促音・長音・nn の吸収)。 */
const canonicalizeRomaji = (value: string): string => {
  let result = value
  for (const [pattern, replacement] of ROMAJI_VARIANTS) {
    result = result.replace(pattern, replacement)
  }
  return result.replace(/(.)\1+/g, "$1")
}

/**
 * ローマ字空間へ落とす。かなはローマ字にし、**それ以外(英数字・漢字)はそのまま
 * 残す**。漢字が残るのは、読みが分からない以上そこは正規化空間の照合に任せる、
 * という割り切り。
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

/** needle の文字が haystack にこの順で現れるか(間に何が挟まってもよい)。 */
const isSubsequence = (haystack: string, needle: string): boolean => {
  let index = 0
  for (const char of haystack) {
    if (char === needle[index]) index++
    if (index === needle.length) return true
  }
  return needle.length === 0
}

/**
 * 候補のラベルが入力に一致するか。空の入力はすべて通す(絞り込み前の状態)。
 *
 * 飛ばし読み(部分列)を許すのは**正規化空間だけ**。ローマ字空間は 1 文字が 2〜3 字
 * に膨らむので、部分列まで許すとほとんどの候補が当たってしまう。
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
