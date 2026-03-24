import type { TopicItem, NodeItem } from "../types";

export type ReviewPromptSet = {
  counter: string[];
  inquiry: string[];
};

type Lang = "ja" | "en";

type ReviewPromptInput = {
  topic: TopicItem;
  node: NodeItem;
  categories: string[];
  staleDays: number;
  hasEdges: boolean;
};

const COUNTER_BY_TYPE: Record<string, { ja: string; en: string }> = {
  "主張": {
    ja: "この主張が成り立たない条件は何か。",
    en: "Under what conditions would this claim fail?",
  },
  "根拠": {
    ja: "この根拠が崩れた場合、どの結論が弱くなるか。",
    en: "If this evidence weakens, which conclusion collapses with it?",
  },
  "反対意見": {
    ja: "この反対意見に対する最も強い再反論は何か。",
    en: "What is the strongest rebuttal to this counterargument?",
  },
  "理想": {
    ja: "この理想を優先しない場合の利点は何か。",
    en: "What benefits appear if this ideal is not prioritized?",
  },
  "問い": {
    ja: "この問い自体の前提を疑うと何が変わるか。",
    en: "What changes if the premise of this question is challenged?",
  },
  "感情": {
    ja: "別の解釈をすると、この感情は何に読み替わるか。",
    en: "If interpreted differently, what else could this feeling mean?",
  },
  "行動案": {
    ja: "この行動案の副作用や見落としているコストは何か。",
    en: "What side effects or hidden costs come with this action?",
  },
  "前提": {
    ja: "この前提が誤っていた場合、どこが破綻するか。",
    en: "If this assumption is wrong, what breaks first?",
  },
  "過去": {
    ja: "別の因果説明でこの出来事を読み替えるとどうなるか。",
    en: "How would this past event look under a different causal explanation?",
  },
};

const INQUIRY_BY_TYPE: Record<string, { ja: string; en: string }> = {
  "主張": {
    ja: "この主張を検証する最小の観測や実験は何か。",
    en: "What is the smallest observation or experiment that could test this claim?",
  },
  "根拠": {
    ja: "この根拠の出典と観測条件をどこまで明示できるか。",
    en: "How explicitly can the source and observation conditions for this evidence be stated?",
  },
  "反対意見": {
    ja: "この反対意見はどの主張を狙っているのか明示できているか。",
    en: "Is it explicit which claim this counterargument targets?",
  },
  "理想": {
    ja: "この理想を現実の判断基準に落とすと何が指標になるか。",
    en: "What metric would make this ideal actionable in practice?",
  },
  "問い": {
    ja: "この問いを答え可能にするために不足している条件は何か。",
    en: "What missing conditions would make this question answerable?",
  },
  "感情": {
    ja: "この感情を引き起こした出来事や文脈をどこまで具体化できるか。",
    en: "How specifically can the event or context behind this feeling be described?",
  },
  "行動案": {
    ja: "最初の一歩として 10 分以内に試せる行動は何か。",
    en: "What first step could be tried within 10 minutes?",
  },
  "前提": {
    ja: "この前提を支える観測・定義・境界条件は何か。",
    en: "What observations, definitions, or boundaries support this assumption?",
  },
  "過去": {
    ja: "この過去の出来事から現在に持ち越している解釈は何か。",
    en: "What interpretation from this past event is still being carried into the present?",
  },
};

function pushPrompt(list: string[], prompt?: string) {
  if (!prompt) return;
  if (!list.includes(prompt)) list.push(prompt);
}

export function buildReviewPromptSet(input: ReviewPromptInput, lang: Lang): ReviewPromptSet {
  const { topic, node, categories, staleDays, hasEdges } = input;
  const counter: string[] = [];
  const inquiry: string[] = [];
  const t = <T extends { ja: string; en: string }>(entry: T) => entry[lang];

  pushPrompt(counter, COUNTER_BY_TYPE[node.type] ? t(COUNTER_BY_TYPE[node.type]) : undefined);

  if (!node.counterArgumentNodeIds || node.counterArgumentNodeIds.length === 0) {
    pushPrompt(counter, lang === "ja"
      ? "このノードに正面から反対するノードを 1 つ作るなら、何を置くか。"
      : "If you had to add one direct opposing node here, what would it say?");
  }

  if (categories.includes("low-confidence") || node.evidenceBasis === "unverified") {
    pushPrompt(counter, lang === "ja"
      ? "どんな観測や資料が出たら、この見方を取り下げるべきか。"
      : "What observation or source would make this view worth retracting?");
    pushPrompt(inquiry, lang === "ja"
      ? "確信度を 1 段上げるために、次に確認すべき根拠は何か。"
      : "What evidence should be checked next to raise confidence by one step?");
  }

  if (!hasEdges || categories.includes("no-edges")) {
    pushPrompt(inquiry, lang === "ja"
      ? "このノードを最初に接続するなら、どのノードとの関係が一番意味を増やすか。"
      : "If this node were connected first, which relationship would add the most meaning?");
  }

  if (categories.includes("shallow")) {
    pushPrompt(inquiry, lang === "ja"
      ? "具体例・根拠・前提のうち、次に 1 段深くするなら何を足すべきか。"
      : "If you deepen this by one level, should you add an example, evidence, or an assumption?");
  }

  if (categories.includes("stale")) {
    pushPrompt(inquiry, lang === "ja"
      ? `この ${staleDays} 日で変わった事実・状況・優先度は何か。`
      : `What facts, context, or priorities changed over these ${staleDays} days?`);
  }

  if (categories.includes("no-extensions") && topic.activeMethods && topic.activeMethods.length > 0) {
    pushPrompt(inquiry, lang === "ja"
      ? `有効化中の方法論 (${topic.activeMethods[0]}) で最低 1 項目埋めるなら何を書くか。`
      : `If you fill one field for the active method (${topic.activeMethods[0]}), what would you write?`);
  }

  if (!node.layer || node.layer.trim() === "") {
    pushPrompt(inquiry, lang === "ja"
      ? "このノードはどの層に置くと他ノードとの役割差が見えるか。"
      : "Which layer would best clarify this node's role relative to the others?");
  }

  if (!node.group || node.group.trim() === "") {
    pushPrompt(inquiry, lang === "ja"
      ? "このノードを束ねる単位は何か。単独ではなく何の群として捉えるべきか。"
      : "What grouping unit makes this node easier to reason about instead of treating it as isolated?");
  }

  pushPrompt(inquiry, INQUIRY_BY_TYPE[node.type] ? t(INQUIRY_BY_TYPE[node.type]) : undefined);

  return {
    counter: counter.slice(0, 3),
    inquiry: inquiry.slice(0, 3),
  };
}
