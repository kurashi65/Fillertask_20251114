export const STORAGE_KEYS = {
  sentenceSets: "jp-task.sentenceSets.v1",
  taskSets: "jp-task.taskSets.v1",
  preferences: "jp-task.preferences.v1",
};

export const DATA_PATHS = {
  sentenceSets: "data/sentenceSets.json",
  taskSets: "data/taskSets.json",
};

export const DEFAULT_PREFERENCES = {
  trueKey: "f",
  falseKey: "j",
  showDebug: false,
  activeSentenceSetId: null,
  activeTaskSetId: null,
  displayMode: "pc",
  lastResultJson: "",
};

const BASE_SENTENCES = [
  { id: 1, text: "犬は四本足で歩く。", truth: true, tags: ["動物", "日常"] },
  { id: 2, text: "雨が降ると地面がぬれる。", truth: true, tags: ["自然", "日常"] },
  { id: 3, text: "冷蔵庫は食べ物を冷やす家電だ。", truth: true, tags: ["家電", "日常"] },
  { id: 4, text: "飛行機は空を飛ぶ乗り物である。", truth: true, tags: ["乗り物"] },
  { id: 5, text: "魚は水の中で暮らしている。", truth: true, tags: ["動物", "自然"] },
  { id: 6, text: "図書館では本を借りることができる。", truth: true, tags: ["施設"] },
  { id: 7, text: "猫は通常しっぽが生えている。", truth: true, tags: ["動物"] },
  { id: 8, text: "靴は足にはくものである。", truth: true, tags: ["日常"] },
  { id: 9, text: "太陽は昼間に空に見える。", truth: true, tags: ["自然"] },
  { id: 10, text: "ご飯は口から食べる。", truth: true, tags: ["食べ物"] },
  { id: 11, text: "テレビは足にはくものである。", truth: false, tags: ["家電", "silly"] },
  { id: 12, text: "自転車は海の中を泳いで進む。", truth: false, tags: ["乗り物", "silly"] },
  { id: 13, text: "魚は空の上で暮らしている。", truth: false, tags: ["動物", "silly"] },
  { id: 14, text: "冷蔵庫は本を読むための道具である。", truth: false, tags: ["家電", "silly"] },
  { id: 15, text: "鉛筆は食べ物であり，お皿に盛りつけて食べる。", truth: false, tags: ["silly"] },
  { id: 16, text: "犬は空を飛ぶために羽を使う。", truth: false, tags: ["動物", "silly"] },
  { id: 17, text: "信号の赤は『進め』を意味する。", truth: false, tags: ["日常", "silly"] },
  { id: 18, text: "月はチョコレートでできている。", truth: false, tags: ["自然", "silly"] },
  { id: 19, text: "靴は冷蔵庫の中にしまっておくものである。", truth: false, tags: ["日常", "silly"] },
  { id: 20, text: "雨の日は空から砂糖が降ってくる。", truth: false, tags: ["自然", "silly"] },
];

export const FALLBACK_SENTENCE_SETS = [
  {
    id: "set-basic",
    name: "基本セット",
    description: "日常的な真偽文を 20 文収録したセット",
    sentences: BASE_SENTENCES,
  },
];

export const FALLBACK_TASK_SETS = [
  {
    id: "task-demo",
    name: "デモタスク (120秒)",
    sentenceSetId: "set-basic",
    questionCount: 12,
    randomize: true,
    enableTimeLimit: true,
    durationSec: 120,
    showTimer: true,
    notes: "ウォームアップ用のサンプル設定",
  },
];
