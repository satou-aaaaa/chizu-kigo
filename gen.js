// 地図記号よみの問題を作る（ブラウザと node の両方で使う）。データは data.js（CHIZU_DATA）。
// 問題の札（tag）は "種類|記号の番号|種"。同じ札なら、どの端末でも同じ問題（選び肢・並び）になる。
// 乱数 R は呼ぶ回数が毎回同じになるように使う（sort の比較の中では引かない）。
(function (root) {
  "use strict";
  const D = typeof module !== "undefined" && module.exports ? require("./data.js") : root.CHIZU_DATA;
  const { CATS, SYMS, PAIRS, LIST } = D;
  // 今日の5問・上級に使う記号の数。記号を足してもここを変えなければ、過去の日の問題は変わらない
  const DAILY_N = 39;
  const EPOCH = "2026-11-07";
  const LV = ["やさしい", "ふつう", "むずかしい"];
  // 種類：g0 記号→名前・b1 名前→記号・g2 形のわけ（記号と名前から、形のもとを選ぶ）
  const KINDS = [
    { id: "g0", lv: 0, name: "記号よみ", how: "記号を見て、何の場所かを当てる" },
    { id: "b1", lv: 1, name: "記号さがし", how: "場所の名前から、記号を選ぶ" },
    { id: "g2", lv: 2, name: "形のわけ", how: "記号が何の形からできたかを当てる" },
  ];
  const BY = Object.fromEntries(KINDS.map((k) => [k.id, k]));

  function seedOf(str) { let h = 2166136261; for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const shuffle = (R, arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pickN = (R, arr, n) => shuffle(R, arr).slice(0, n);

  const poolOf = (i) => (i < DAILY_N ? SYMS.slice(0, DAILY_N) : SYMS);
  const paired = (a, b) => PAIRS.some(([x, y]) => (x === a.id && y === b.id) || (x === b.id && y === a.id));
  // 形のわけの問題にできるのは、国土地理院のページに形の説明がある記号だけ
  const hasWhy = (s) => !!s.k;

  function make(tag) {
    const [kind, si] = String(tag).split("|"), s = SYMS[+si], K = BY[kind];
    if (!s || !K) throw new Error("知らない札: " + tag);
    const R = rng(seedOf(tag)), pool = poolOf(s.i);
    const P = { tag, kind, lv: K.lv, name: K.name, s, ans: s.i };
    // 答えと、なかまの近い3つ（よく似た組・形のわけの同じものは入れない）
    const ok = pool.filter((x) => x.i !== s.i && !paired(x, s) && (kind !== "g2" || (hasWhy(x) && x.k !== s.k)));
    const near = [...shuffle(R, ok.filter((x) => x.c === s.c)), ...shuffle(R, ok.filter((x) => x.c !== s.c))];
    const pick = [];
    for (const x of near) { if (pick.length >= 3) break; if (!pick.some((y) => paired(x, y))) pick.push(x); }
    P.opts = shuffle(R, [s.i, ...pick.map((x) => x.i)]);
    P.look = kind === "g2" ? "記号を、何かの道具や、ものを上や横から見た形だと思って見てみましょう。" : `「${CATS[s.c]}」のなかまの記号です。`;
    return P;
  }

  // 今日の5問：全部の記号を種で並べた列を、1日5つずつ前から使う（1周するまで同じ記号は出ない）
  const dayIndex = (date) => Math.round((Date.parse(date) - Date.parse(EPOCH)) / 864e5);
  const cyc = {};
  const cycle = (c) => cyc[c] || (cyc[c] = shuffle(rng(seedOf("cycle:" + c)), [...Array(DAILY_N).keys()]));
  // 周のつなぎ目で同じ記号が重なったら、その日のぶんは新しい周のおしりから借りる
  function dailySyms(date) {
    const n = Math.max(0, dayIndex(date)), out = [];
    for (let p = n * 5; p < n * 5 + 5; p++) {
      const c = Math.floor(p / DAILY_N); let w = cycle(c)[p % DAILY_N];
      for (let k = DAILY_N - 1; out.includes(w); k--) w = cycle(c)[k];
      out.push(w);
    }
    return out;
  }
  // 5つのうち、形のわけにできる最後の1つをむずかしいに。残りを前から記号よみ2・記号さがし2
  function dailyTags(date) {
    const ws = dailySyms(date);
    let h = -1; for (let j = ws.length - 1; j >= 0; j--) if (hasWhy(SYMS[ws[j]])) { h = j; break; }
    const rest = ws.filter((_, j) => j !== h), kinds = ["g0", "g0", "b1", "b1", "g0"];
    const tags = rest.map((w, j) => `${kinds[j]}|${w}|${date}`);
    if (h >= 0) tags.push(`g2|${ws[h]}|${date}`);
    return tags;
  }
  // 上級：今日の5つと重ねず、形のわけにできる記号から3つ
  function hardTags(date) {
    const today = dailySyms(date), R = rng(seedOf("hard:" + date));
    const cand = SYMS.slice(0, DAILY_N).filter((s) => hasWhy(s) && !today.includes(s.i)).map((s) => s.i);
    return pickN(R, cand, 3).map((w) => `g2|${w}|h${date}`);
  }
  // 練習・とことんで出せる組（種類と記号）。形のわけは hasWhy の記号だけ
  const combos = (kind) => SYMS.filter((s) => kind !== "g2" || hasWhy(s)).map((s) => s.i);

  const CHIZU = { CATS, SYMS, PAIRS, LIST, KINDS, BY, LV, DAILY_N, EPOCH, seedOf, rng, shuffle, pickN, make, dailySyms, dailyTags, hardTags, hasWhy, combos, paired };
  if (typeof module !== "undefined" && module.exports) module.exports = CHIZU;
  else root.CHIZU = CHIZU;
})(typeof self !== "undefined" ? self : this);
