import { round } from "../utils/math";
import { autoNodePosition } from "../projection/sphere";

export const PRESETS = ["free", "mandala", "semantic", "strata", "zettelkasten", "para", "gtd", "poincare", "hebbian", "dialectic", "toulmin", "causal", "kj"] as const;
export const PARA_BUCKETS = ["Projects", "Areas", "Resources", "Archives"] as const;

export const PRESET_GUIDES: Record<string, { ja: string; en: string }> = {
  free: { ja: "自由配置。制約なしで始める基準形です。", en: "Free layout. Unconstrained starting mode." },
  mandala: { ja: "中心テーマと周辺8要素に分けて広げます。", en: "Expand from one center theme into 8 surrounding elements." },
  semantic: { ja: "意味連関を優先して関連語を束ねます。", en: "Group related ideas by semantic association." },
  strata: { ja: "地層的に層を分け、抽象から具体へ落とします。", en: "Layer ideas from abstract to concrete like strata." },
  zettelkasten: { ja: "接続理由を重視し、孤立ノードを発見します。", en: "Emphasize linking reasons and detect orphan notes." },
  para: { ja: "Projects / Areas / Resources / Archives で整理します。", en: "Organize with Projects / Areas / Resources / Archives." },
  gtd: { ja: "実行管理向け。inbox / next / waiting などへ振り分けます。", en: "Execution-focused. Sort into inbox / next / waiting and more." },
  poincare: { ja: "ポアンカレ球体モデル。中心が核概念、境界へ向かうほど周辺的・探索的になります。双曲幾何の距離感覚で階層を表現します。", en: "Poincaré ball model. Core concepts at center, peripheral ideas near boundary. Hyperbolic distance encodes conceptual hierarchy." },
  hebbian: { ja: "ヘッブ則モデル。「共に発火するニューロンは結びつく」原理で、刺激→知覚→統合→反応の神経回路的構造を作ります。エッジ重みがシナプス強度を表します。", en: "Hebbian model. 'Neurons that fire together wire together.' Builds stimulus→perception→integration→response circuits. Edge weights represent synaptic strength." },
  dialectic: { ja: "弁証法。テーゼ（正）→アンチテーゼ（反）→ジンテーゼ（合）の螺旋で思考を上昇させます。対立を統合に昇華する構造。", en: "Hegelian dialectic. Thesis→Antithesis→Synthesis spiral. Elevates thinking by sublating opposition into higher unity." },
  toulmin: { ja: "トゥールミン論証モデル。主張(Claim)・根拠(Data)・論拠(Warrant)・裏付(Backing)・限定(Qualifier)・反駁(Rebuttal)の6要素で議論を構造化します。", en: "Toulmin argument model. Structures reasoning into Claim, Data, Warrant, Backing, Qualifier, and Rebuttal." },
  causal: { ja: "因果ループ図（システム思考）。強化ループ(R)と均衡ループ(B)でフィードバック構造を可視化します。レバレッジ・ポイントの発見に。", en: "Causal loop diagram (systems thinking). Visualize reinforcing (R) and balancing (B) feedback loops to find leverage points." },
  kj: { ja: "KJ法（親和図法）。散在するアイデアをボトムアップで親和性グループに束ね、表札をつけて構造化します。川喜田二郎の発想法。", en: "KJ method (affinity diagram). Group scattered ideas bottom-up by affinity, label clusters, and discover emergent structure." },
};

export function createSeedBundle(preset: string) {
  const seeds: any = {
    free: {
      nodes: [
        { label: "主題", type: "主張", tense: "現在", position: [0, 0, 0], note: "中心テーマ", size: 0.75, group: "core", layer: "h1" },
        { label: "背景", type: "前提", tense: "過去", position: [-2, 0.6, 0.4], note: "前提条件", size: 0.6, group: "context", layer: "h1" },
        { label: "理想", type: "理想", tense: "未来", position: [2, 1, 0.8], note: "目指す状態", size: 0.7, group: "future", layer: "h1" },
      ],
      edges: [
        { fromIndex: 0, toIndex: 1, relation: "参照", meaning: "背景参照", weight: 1 },
        { fromIndex: 0, toIndex: 2, relation: "到達点", meaning: "理想へ", weight: 1 },
      ],
    },
    mandala: {
      nodes: [
        { label: "中心", type: "主張", tense: "現在", position: [0, 0, 0], note: "核", size: 0.8, group: "center", layer: "h1" },
        { label: "要素1", type: "問い", tense: "現在", position: [-2, 2, 0], note: "", size: 0.6, group: "ring", layer: "h1" },
        { label: "要素2", type: "問い", tense: "現在", position: [0, 2, 0], note: "", size: 0.6, group: "ring", layer: "h1" },
        { label: "要素3", type: "問い", tense: "現在", position: [2, 2, 0], note: "", size: 0.6, group: "ring", layer: "h1" },
        { label: "要素4", type: "問い", tense: "現在", position: [-2, 0, 0], note: "", size: 0.6, group: "ring", layer: "h1" },
        { label: "要素5", type: "問い", tense: "現在", position: [2, 0, 0], note: "", size: 0.6, group: "ring", layer: "h1" },
        { label: "要素6", type: "問い", tense: "現在", position: [-2, -2, 0], note: "", size: 0.6, group: "ring", layer: "h1" },
        { label: "要素7", type: "問い", tense: "現在", position: [0, -2, 0], note: "", size: 0.6, group: "ring", layer: "h1" },
        { label: "要素8", type: "問い", tense: "現在", position: [2, -2, 0], note: "", size: 0.6, group: "ring", layer: "h1" },
      ],
      edges: Array.from({ length: 8 }, (_, i) => ({ fromIndex: 0, toIndex: i + 1, relation: "具体化", meaning: "マンダラ展開", weight: 1 })),
    },
    semantic: {
      nodes: [
        { label: "概念", type: "主張", tense: "現在", position: [0, 0, 0], note: "意味中心", size: 0.75, group: "semantic", layer: "h1" },
        { label: "同義", type: "参照", tense: "現在", position: [-1.8, 1, 0], note: "近い意味", size: 0.55, group: "semantic", layer: "h2" },
        { label: "対義", type: "反対意見", tense: "現在", position: [1.8, 1, -0.4], note: "反対側", size: 0.6, group: "semantic", layer: "h2" },
        { label: "具体例", type: "根拠", tense: "現在", position: [0, -1.8, 0.6], note: "具体例", size: 0.58, group: "semantic", layer: "h2" },
      ],
      edges: [
        { fromIndex: 0, toIndex: 1, relation: "参照", meaning: "近似", weight: 1 },
        { fromIndex: 0, toIndex: 2, relation: "反論", meaning: "対立", weight: 1 },
        { fromIndex: 0, toIndex: 3, relation: "具体化", meaning: "例示", weight: 1 },
      ],
    },
    strata: {
      nodes: [
        { label: "抽象層", type: "主張", tense: "現在", position: [0, 2, 0], note: "上位概念", size: 0.7, group: "layer-1", layer: "h1" },
        { label: "中間層", type: "前提", tense: "現在", position: [0, 0, 0], note: "構造", size: 0.62, group: "layer-2", layer: "h2" },
        { label: "具体層", type: "行動案", tense: "未来", position: [0, -2, 0], note: "実装", size: 0.62, group: "layer-3", layer: "h3" },
      ],
      edges: [
        { fromIndex: 0, toIndex: 1, relation: "生成", meaning: "抽象から構造へ", weight: 1 },
        { fromIndex: 1, toIndex: 2, relation: "実装", meaning: "構造から行動へ", weight: 1 },
      ],
    },
    zettelkasten: {
      nodes: [
        { label: "Permanent note", type: "主張", tense: "現在", position: [0, 0, 0], note: "恒久ノート", size: 0.7, group: "linked", layer: "zettel" },
        { label: "Bridge note", type: "根拠", tense: "現在", position: [1.8, 0.9, 0.6], note: "接続理由", size: 0.58, group: "linked", layer: "zettel" },
        { label: "Orphan note", type: "問い", tense: "現在", position: [-1.8, -0.8, -0.6], note: "未接続検出用", size: 0.58, group: "orphan", layer: "inbox" },
      ],
      edges: [{ fromIndex: 0, toIndex: 1, relation: "参照", meaning: "接続", weight: 1 }],
    },
    para: {
      nodes: PARA_BUCKETS.map((label, i) => ({ label, type: "主張", tense: "現在", position: autoNodePosition(i, PARA_BUCKETS.length), note: `${label} bucket`, size: 0.65, group: "para", layer: "para" })),
      edges: [],
    },
    gtd: {
      nodes: ["inbox", "next", "waiting", "someday", "review"].map((label, i) => ({ label, type: "行動案", tense: "現在", position: [round(-3.2 + i * 1.6), 0, 0] as [number, number, number], note: label, size: 0.58, group: label, layer: "gtd" })),
      edges: [],
    },
    poincare: {
      nodes: [
        { label: "核概念", type: "主張", tense: "現在", position: [0, 0, 0] as [number, number, number], note: "ポアンカレ球の原点。最も基底的な概念。", size: 0.85, group: "nucleus", layer: "core" },
        { label: "近傍A", type: "根拠", tense: "現在", position: [0.6, 0.5, 0.3] as [number, number, number], note: "核に近い内圏。測地線距離が短い。", size: 0.65, group: "inner", layer: "geodesic" },
        { label: "近傍B", type: "根拠", tense: "現在", position: [-0.5, 0.6, -0.4] as [number, number, number], note: "核に近い内圏。", size: 0.65, group: "inner", layer: "geodesic" },
        { label: "中間帯", type: "問い", tense: "現在", position: [1.3, -0.6, 0.8] as [number, number, number], note: "中間距離。概念の分岐点。", size: 0.55, group: "middle", layer: "geodesic" },
        { label: "境界域A", type: "前提", tense: "過去", position: [1.9, 1.0, 0.6] as [number, number, number], note: "球面境界付近。周辺的・探索的概念。", size: 0.45, group: "boundary", layer: "horizon" },
        { label: "境界域B", type: "理想", tense: "未来", position: [-1.8, -1.3, 0.9] as [number, number, number], note: "境界付近。双曲的に無限遠。到達困難な理想。", size: 0.45, group: "boundary", layer: "horizon" },
      ],
      edges: [
        { fromIndex: 0, toIndex: 1, relation: "生成", meaning: "核から近傍への測地線", weight: 1.2 },
        { fromIndex: 0, toIndex: 2, relation: "生成", meaning: "核から近傍への測地線", weight: 1.2 },
        { fromIndex: 1, toIndex: 3, relation: "具体化", meaning: "内圏から中間帯へ", weight: 0.8 },
        { fromIndex: 2, toIndex: 3, relation: "参照", meaning: "内圏から中間帯へ合流", weight: 0.7 },
        { fromIndex: 3, toIndex: 4, relation: "到達点", meaning: "中間から境界へ（距離急増）", weight: 0.5 },
        { fromIndex: 3, toIndex: 5, relation: "到達点", meaning: "中間から境界へ（距離急増）", weight: 0.5 },
      ],
    },
    hebbian: {
      nodes: [
        { label: "刺激", type: "前提", tense: "過去", position: [-2.2, 0, 0] as [number, number, number], note: "プレシナプス入力。外部からの信号。", size: 0.65, group: "input", layer: "pre" },
        { label: "知覚", type: "感情", tense: "現在", position: [-0.8, 1.2, 0.5] as [number, number, number], note: "感覚処理。刺激の受容と変換。", size: 0.6, group: "hidden", layer: "synapse" },
        { label: "記憶痕跡", type: "過去", tense: "過去", position: [-0.8, -1.2, -0.5] as [number, number, number], note: "長期増強(LTP)された既存の記憶。", size: 0.6, group: "hidden", layer: "synapse" },
        { label: "統合", type: "主張", tense: "現在", position: [0.4, 0, 0] as [number, number, number], note: "連合野。知覚と記憶の同時発火で結合強化。", size: 0.8, group: "association", layer: "synapse" },
        { label: "抑制", type: "反対意見", tense: "現在", position: [0.4, 0, 1.6] as [number, number, number], note: "抑制性介在ニューロン。過剰発火を制御。", size: 0.5, group: "inhibitory", layer: "modulator" },
        { label: "反応", type: "行動案", tense: "未来", position: [2.2, 0, 0] as [number, number, number], note: "ポストシナプス出力。行動・判断の生成。", size: 0.65, group: "output", layer: "post" },
        { label: "強化信号", type: "根拠", tense: "現在", position: [0.4, -2.0, 0] as [number, number, number], note: "ドーパミン的報酬信号。成功した経路を強化。", size: 0.55, group: "reward", layer: "modulator" },
      ],
      edges: [
        { fromIndex: 0, toIndex: 1, relation: "生成", meaning: "刺激→知覚（感覚伝達）", weight: 1.0 },
        { fromIndex: 0, toIndex: 2, relation: "参照", meaning: "刺激→記憶（想起トリガー）", weight: 0.6 },
        { fromIndex: 1, toIndex: 3, relation: "影響", meaning: "知覚→統合（同時発火）", weight: 1.0 },
        { fromIndex: 2, toIndex: 3, relation: "影響", meaning: "記憶→統合（同時発火で結合強化）", weight: 1.0 },
        { fromIndex: 4, toIndex: 3, relation: "調整", meaning: "抑制→統合（過剰発火防止）", weight: 0.8 },
        { fromIndex: 3, toIndex: 5, relation: "実装", meaning: "統合→反応（出力生成）", weight: 1.2 },
        { fromIndex: 5, toIndex: 6, relation: "生成", meaning: "反応→強化信号（結果フィードバック）", weight: 0.7 },
        { fromIndex: 6, toIndex: 3, relation: "支持", meaning: "強化→統合（シナプス可塑性）", weight: 0.9 },
      ],
    },
    dialectic: {
      nodes: [
        { label: "テーゼ（正）", type: "主張", tense: "現在", position: [-1.8, -1.0, 0] as [number, number, number], note: "出発点となる命題。現状の信念や立場。", size: 0.7, group: "thesis", layer: "d1" },
        { label: "アンチテーゼ（反）", type: "反対意見", tense: "現在", position: [1.8, -1.0, 0] as [number, number, number], note: "テーゼへの否定・矛盾。対立する力。", size: 0.7, group: "antithesis", layer: "d1" },
        { label: "矛盾の核心", type: "問い", tense: "現在", position: [0, -0.2, 0.8] as [number, number, number], note: "正と反が衝突する地点。止揚の契機。", size: 0.55, group: "tension", layer: "d1" },
        { label: "ジンテーゼ（合）", type: "理想", tense: "未来", position: [0, 1.6, 0] as [number, number, number], note: "対立を包含し超越した統合。次の正になる。", size: 0.8, group: "synthesis", layer: "d2" },
        { label: "新たなテーゼ", type: "問い", tense: "未来", position: [0, 2.8, 0.5] as [number, number, number], note: "ジンテーゼが次の螺旋の出発点になる。", size: 0.55, group: "next-cycle", layer: "d3" },
      ],
      edges: [
        { fromIndex: 0, toIndex: 2, relation: "問題提起", meaning: "テーゼが矛盾を内包", weight: 1.0 },
        { fromIndex: 1, toIndex: 2, relation: "反論", meaning: "アンチテーゼが矛盾を顕在化", weight: 1.0 },
        { fromIndex: 2, toIndex: 3, relation: "生成", meaning: "矛盾から止揚（アウフヘーベン）", weight: 1.3 },
        { fromIndex: 0, toIndex: 3, relation: "影響", meaning: "正の要素を保存", weight: 0.6 },
        { fromIndex: 1, toIndex: 3, relation: "影響", meaning: "反の要素を保存", weight: 0.6 },
        { fromIndex: 3, toIndex: 4, relation: "生成", meaning: "合が新たな正になる（螺旋上昇）", weight: 0.8 },
      ],
    },
    toulmin: {
      nodes: [
        { label: "主張 (Claim)", type: "主張", tense: "現在", position: [0, 1.8, 0] as [number, number, number], note: "論証の結論。聞き手に受け入れさせたい命題。", size: 0.8, group: "claim", layer: "conclusion" },
        { label: "根拠 (Data)", type: "根拠", tense: "過去", position: [-1.8, -0.6, 0] as [number, number, number], note: "主張を支える事実・観察・証拠。", size: 0.7, group: "data", layer: "ground" },
        { label: "論拠 (Warrant)", type: "前提", tense: "現在", position: [0, 0.4, 0.6] as [number, number, number], note: "根拠から主張への推論を正当化する原理。", size: 0.65, group: "warrant", layer: "bridge" },
        { label: "裏付 (Backing)", type: "根拠", tense: "過去", position: [0, -1.4, 1.0] as [number, number, number], note: "論拠自体の信頼性を支える権威・理論。", size: 0.55, group: "backing", layer: "ground" },
        { label: "限定 (Qualifier)", type: "感情", tense: "現在", position: [1.6, 0.8, -0.4] as [number, number, number], note: "主張の確信度。「おそらく」「通常は」等。", size: 0.5, group: "qualifier", layer: "conclusion" },
        { label: "反駁 (Rebuttal)", type: "反対意見", tense: "現在", position: [1.8, -0.6, 0] as [number, number, number], note: "主張が成り立たない例外条件。", size: 0.6, group: "rebuttal", layer: "ground" },
      ],
      edges: [
        { fromIndex: 1, toIndex: 0, relation: "支持", meaning: "根拠が主張を支持", weight: 1.2 },
        { fromIndex: 2, toIndex: 0, relation: "支持", meaning: "論拠が推論を正当化", weight: 1.0 },
        { fromIndex: 1, toIndex: 2, relation: "参照", meaning: "根拠を論拠が橋渡し", weight: 0.8 },
        { fromIndex: 3, toIndex: 2, relation: "支持", meaning: "裏付が論拠を補強", weight: 0.7 },
        { fromIndex: 4, toIndex: 0, relation: "調整", meaning: "限定が主張の確度を調整", weight: 0.6 },
        { fromIndex: 5, toIndex: 0, relation: "反論", meaning: "反駁が主張の例外を指摘", weight: 0.9 },
      ],
    },
    causal: {
      nodes: [
        { label: "状態A", type: "主張", tense: "現在", position: [-1.6, 1.2, 0] as [number, number, number], note: "システム内の変数。増減が他に波及する。", size: 0.7, group: "variable", layer: "system" },
        { label: "状態B", type: "主張", tense: "現在", position: [1.6, 1.2, 0] as [number, number, number], note: "Aの変化に影響される変数。", size: 0.7, group: "variable", layer: "system" },
        { label: "状態C", type: "主張", tense: "現在", position: [1.6, -1.2, 0] as [number, number, number], note: "Bの変化に影響される変数。", size: 0.7, group: "variable", layer: "system" },
        { label: "状態D", type: "主張", tense: "現在", position: [-1.6, -1.2, 0] as [number, number, number], note: "Cの変化がAに戻る帰還点。", size: 0.7, group: "variable", layer: "system" },
        { label: "R: 強化ループ", type: "問い", tense: "現在", position: [0, 0, 1.0] as [number, number, number], note: "正のフィードバック。変化を加速させる。雪だるま効果。", size: 0.55, group: "loop-label", layer: "meta" },
        { label: "B: 均衡ループ", type: "感情", tense: "現在", position: [0, 0, -1.0] as [number, number, number], note: "負のフィードバック。変化を減衰させ安定に戻す。", size: 0.55, group: "loop-label", layer: "meta" },
        { label: "レバレッジ", type: "行動案", tense: "未来", position: [0, 2.2, 0.5] as [number, number, number], note: "介入点。小さな変更で大きなシステム変化を起こせる箇所。", size: 0.6, group: "leverage", layer: "intervention" },
      ],
      edges: [
        { fromIndex: 0, toIndex: 1, relation: "影響", meaning: "A↑→B↑（同方向=強化）", weight: 1.0 },
        { fromIndex: 1, toIndex: 2, relation: "影響", meaning: "B↑→C↑（同方向=強化）", weight: 1.0 },
        { fromIndex: 2, toIndex: 3, relation: "影響", meaning: "C↑→D↑（同方向=強化）", weight: 1.0 },
        { fromIndex: 3, toIndex: 0, relation: "影響", meaning: "D↑→A↑（ループ閉合=R）", weight: 1.0 },
        { fromIndex: 2, toIndex: 0, relation: "調整", meaning: "C↑→A↓（逆方向=均衡B）", weight: 0.7 },
        { fromIndex: 6, toIndex: 0, relation: "実装", meaning: "レバレッジからAへ介入", weight: 0.8 },
      ],
    },
    kj: {
      nodes: [
        { label: "表札：グループα", type: "主張", tense: "現在", position: [-1.6, 1.8, 0] as [number, number, number], note: "グループの本質を一言で表す表札。抽象化の結果。", size: 0.7, group: "alpha", layer: "label" },
        { label: "断片a1", type: "問い", tense: "現在", position: [-2.2, 0.6, 0.3] as [number, number, number], note: "個別のアイデア・気づき。カード1枚分。", size: 0.5, group: "alpha", layer: "card" },
        { label: "断片a2", type: "問い", tense: "現在", position: [-1.0, 0.6, -0.3] as [number, number, number], note: "a1と親和性の高いカード。", size: 0.5, group: "alpha", layer: "card" },
        { label: "表札：グループβ", type: "主張", tense: "現在", position: [1.6, 1.8, 0] as [number, number, number], note: "別の親和グループの表札。", size: 0.7, group: "beta", layer: "label" },
        { label: "断片b1", type: "問い", tense: "現在", position: [1.0, 0.6, 0.3] as [number, number, number], note: "βグループのカード。", size: 0.5, group: "beta", layer: "card" },
        { label: "断片b2", type: "問い", tense: "現在", position: [2.2, 0.6, -0.3] as [number, number, number], note: "βグループのカード。", size: 0.5, group: "beta", layer: "card" },
        { label: "孤立カード", type: "感情", tense: "現在", position: [0, -1.0, 0.6] as [number, number, number], note: "どのグループにも属さない断片。新グループの種になりうる。", size: 0.45, group: "orphan", layer: "card" },
        { label: "上位構造", type: "理想", tense: "未来", position: [0, 2.8, 0] as [number, number, number], note: "グループ間の関係を見出した上位の構造化。", size: 0.65, group: "meta", layer: "structure" },
      ],
      edges: [
        { fromIndex: 1, toIndex: 0, relation: "具体化", meaning: "断片→表札（帰属）", weight: 0.8 },
        { fromIndex: 2, toIndex: 0, relation: "具体化", meaning: "断片→表札（帰属）", weight: 0.8 },
        { fromIndex: 4, toIndex: 3, relation: "具体化", meaning: "断片→表札（帰属）", weight: 0.8 },
        { fromIndex: 5, toIndex: 3, relation: "具体化", meaning: "断片→表札（帰属）", weight: 0.8 },
        { fromIndex: 0, toIndex: 7, relation: "生成", meaning: "グループαが上位構造に寄与", weight: 1.0 },
        { fromIndex: 3, toIndex: 7, relation: "生成", meaning: "グループβが上位構造に寄与", weight: 1.0 },
        { fromIndex: 0, toIndex: 3, relation: "参照", meaning: "グループ間の関係線", weight: 0.6 },
      ],
    },
  };
  return seeds[preset] || seeds.free;
}
