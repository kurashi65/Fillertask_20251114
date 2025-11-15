import {
  initializeStore,
  getSentenceSets,
  getTaskSets,
  getPreferences,
  saveSentenceSets,
  saveTaskSets,
  savePreferences,
  reloadSentenceSetsFromFile,
  reloadTaskSetsFromFile,
} from "./dataStore.js";
import { createTaskRunner } from "./taskRunner.js";
import { clone, escapeHtml, shuffleArray, generateId } from "./utils.js";

let sentenceSets = [];
let taskSets = [];
let preferences = {};
let dom = {};
let taskRunner;
let sentenceEditIndex = null;

window.addEventListener("DOMContentLoaded", init);

async function init() {
  await initializeStore();
  sentenceSets = getSentenceSets();
  taskSets = getTaskSets();
  preferences = getPreferences();

  cacheDom();
  setupTaskRunner();
  wireEvents();
  switchTab("run-tab");
  renderAll();
}

function cacheDom() {
  dom = {
    sections: document.querySelectorAll("main section"),
    tabButtons: document.querySelectorAll(".tab-button"),
    participantTaskSelect: document.getElementById("participant-task-select"),
    participantTaskSummary: document.getElementById("participant-task-summary"),
    participantStart: document.getElementById("participant-start"),
    participantSetup: document.getElementById("participant-setup"),
    participantRunning: document.getElementById("participant-running"),
    participantFinished: document.getElementById("participant-finished"),
    sentenceText: document.getElementById("sentence-text"),
    btnTrue: document.getElementById("btn-true"),
    btnFalse: document.getElementById("btn-false"),
    statusDot: document.getElementById("status-dot"),
    statusLabel: document.getElementById("status-label"),
    statusCount: document.getElementById("status-count"),
    resultJson: document.getElementById("result-json"),
    participantReset: document.getElementById("participant-reset"),
    timerPanel: document.getElementById("timer-panel"),
    timerLabel: document.getElementById("timer-label"),
    timerValue: document.getElementById("timer-value"),
    trueKeyPill: document.getElementById("true-key-pill"),
    falseKeyPill: document.getElementById("false-key-pill"),
    taskTrueKeyLabel: document.getElementById("task-true-key-label"),
    taskFalseKeyLabel: document.getElementById("task-false-key-label"),
    openTasksetTab: document.getElementById("open-taskset-tab"),
    tasksetSelector: document.getElementById("taskset-selector"),
    tasksetName: document.getElementById("taskset-name"),
    tasksetSentenceSet: document.getElementById("taskset-sentence-set"),
    tasksetDatasetInfo: document.getElementById("taskset-dataset-info"),
    tasksetQuestionCount: document.getElementById("taskset-question-count"),
    tasksetRandomize: document.getElementById("taskset-randomize"),
    tasksetEnableTimer: document.getElementById("taskset-enable-timer"),
    tasksetDuration: document.getElementById("taskset-duration"),
    tasksetShowTimer: document.getElementById("taskset-show-timer"),
    tasksetNotes: document.getElementById("taskset-notes"),
    tasksetSave: document.getElementById("taskset-save"),
    tasksetNew: document.getElementById("taskset-new"),
    tasksetDuplicate: document.getElementById("taskset-duplicate"),
    tasksetDelete: document.getElementById("taskset-delete"),
    datasetSelector: document.getElementById("dataset-selector"),
    datasetName: document.getElementById("dataset-name"),
    datasetDescription: document.getElementById("dataset-description"),
    datasetMetaInfo: document.getElementById("dataset-meta-info"),
    datasetSave: document.getElementById("dataset-save"),
    datasetNew: document.getElementById("dataset-new"),
    datasetDuplicate: document.getElementById("dataset-duplicate"),
    datasetDelete: document.getElementById("dataset-delete"),
    datasetJson: document.getElementById("dataset-json"),
    datasetJsonApply: document.getElementById("dataset-json-apply"),
    datasetJsonDownload: document.getElementById("dataset-json-download"),
    datasetReload: document.getElementById("dataset-reload"),
    newSentenceText: document.getElementById("new-sentence-text"),
    newSentenceTruth: document.getElementById("new-sentence-truth"),
    newSentenceTags: document.getElementById("new-sentence-tags"),
    addSentence: document.getElementById("add-sentence"),
    updateSentence: document.getElementById("update-sentence"),
    cancelEditSentence: document.getElementById("cancel-edit-sentence"),
    sentenceEditHint: document.getElementById("sentence-edit-hint"),
    sentenceTableBody: document.getElementById("sentence-table-body"),
    tasksetJson: document.getElementById("taskset-json"),
    tasksetJsonApply: document.getElementById("taskset-json-apply"),
    tasksetJsonDownload: document.getElementById("taskset-json-download"),
    tasksetReload: document.getElementById("taskset-reload"),
    prefTrueKey: document.getElementById("pref-true-key"),
    prefFalseKey: document.getElementById("pref-false-key"),
    prefDebug: document.getElementById("pref-debug"),
    prefSave: document.getElementById("pref-save"),
  };
}

function setupTaskRunner() {
  taskRunner = createTaskRunner(dom, { logDebug });
}

function wireEvents() {
  dom.tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  dom.participantStart.addEventListener("click", startParticipantTask);
  dom.btnTrue.addEventListener("click", () => taskRunner.handleResponse(true));
  dom.btnFalse.addEventListener("click", () => taskRunner.handleResponse(false));
  dom.participantReset.addEventListener("click", () => taskRunner.reset());
  dom.participantTaskSelect.addEventListener("change", () => {
    preferences.activeTaskSetId = dom.participantTaskSelect.value || null;
    savePreferences();
    renderParticipantSummary();
  });
  dom.openTasksetTab.addEventListener("click", () => switchTab("taskset-tab"));

  document.addEventListener("keydown", (event) => {
    const handled = taskRunner.handleKeyPress(event.key);
    if (handled) {
      event.preventDefault();
    }
  });

  dom.tasksetSelector.addEventListener("change", () => {
    preferences.activeTaskSetId = dom.tasksetSelector.value || null;
    savePreferences();
    renderTasksetSection();
    renderParticipantSelectors();
    renderParticipantSummary();
  });
  dom.tasksetSentenceSet.addEventListener("change", updateTasksetDatasetInfo);
  dom.tasksetEnableTimer.addEventListener("change", handleTimerToggle);
  dom.tasksetSave.addEventListener("click", saveTasksetForm);
  dom.tasksetNew.addEventListener("click", () => {
    createTaskSet();
    renderTasksetSection();
    renderParticipantSelectors();
    renderParticipantSummary();
  });
  dom.tasksetDuplicate.addEventListener("click", () => {
    duplicateTaskSet();
    renderTasksetSection();
    renderParticipantSelectors();
    renderParticipantSummary();
  });
  dom.tasksetDelete.addEventListener("click", () => {
    deleteTaskSet();
    renderTasksetSection();
    renderParticipantSelectors();
    renderParticipantSummary();
  });

  dom.datasetSelector.addEventListener("change", () => {
    preferences.activeSentenceSetId = dom.datasetSelector.value || null;
    savePreferences();
    renderDatasetSection();
    renderTasksetSentenceOptions();
    renderParticipantSelectors();
    renderParticipantSummary();
  });
  dom.datasetSave.addEventListener("click", saveDatasetMeta);
  dom.datasetNew.addEventListener("click", () => {
    createDataset();
    renderDatasetSection();
    renderTasksetSentenceOptions();
    renderParticipantSelectors();
    renderParticipantSummary();
  });
  dom.datasetDuplicate.addEventListener("click", () => {
    duplicateDataset();
    renderDatasetSection();
    renderTasksetSentenceOptions();
    renderParticipantSelectors();
    renderParticipantSummary();
  });
  dom.datasetDelete.addEventListener("click", () => {
    deleteDataset();
    renderDatasetSection();
    renderTasksetSentenceOptions();
    renderParticipantSelectors();
    renderParticipantSummary();
  });
  dom.datasetJsonApply.addEventListener("click", applyDatasetJson);
  dom.datasetJsonDownload.addEventListener("click", downloadDatasetJson);
  dom.datasetReload.addEventListener("click", handleDatasetReload);
  dom.addSentence.addEventListener("click", addSentenceToDataset);
  dom.updateSentence.addEventListener("click", updateSentenceInDataset);
  dom.cancelEditSentence.addEventListener("click", () => resetSentenceForm());
  dom.sentenceTableBody.addEventListener("click", (event) => {
    const target = event.target.closest("button[data-index]");
    if (!target) return;
    const index = Number(target.dataset.index);
    const action = target.dataset.action;
    if (action === "delete") {
      removeSentence(index);
    } else if (action === "edit") {
      startSentenceEdit(index);
    }
  });

  dom.tasksetJsonApply.addEventListener("click", applyTasksetJson);
  dom.tasksetJsonDownload.addEventListener("click", downloadTasksetJson);
  dom.tasksetReload.addEventListener("click", handleTasksetReload);

  dom.prefSave.addEventListener("click", savePreferencesFromForm);
}

function renderAll() {
  renderDatasetSection();
  renderTasksetSentenceOptions();
  renderTasksetSection();
  updateTasksetJsonTextarea();
  renderParticipantSelectors();
  renderParticipantSummary();
  renderPreferencesSection();
  updateKeyLabels();
}

function switchTab(tabId) {
  dom.tabButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });
  dom.sections.forEach((section) => {
    section.classList.toggle("hidden", section.id !== tabId);
  });
}

function getActiveSentenceSet() {
  return sentenceSets.find((set) => set.id === preferences.activeSentenceSetId) || null;
}

function getActiveTaskSet() {
  return taskSets.find((set) => set.id === preferences.activeTaskSetId) || null;
}

function renderParticipantSelectors() {
  populateSelect(dom.participantTaskSelect, taskSets, true);
  if (preferences.activeTaskSetId) {
    dom.participantTaskSelect.value = preferences.activeTaskSetId;
  }
  dom.participantStart.disabled = taskSets.length === 0;
}

function renderParticipantSummary() {
  const taskSet = getActiveTaskSet();
  if (!taskSet) {
    dom.participantTaskSummary.innerText = "タスクセットがまだ存在しません。";
    return;
  }
  const sentenceSet = sentenceSets.find((set) => set.id === taskSet.sentenceSetId);
  const datasetName = sentenceSet ? sentenceSet.name : "（参照先なし）";
  const sentenceCount = sentenceSet ? sentenceSet.sentences.length : 0;
  const questionCount = taskSet.questionCount || sentenceCount;
  const limitText = taskSet.enableTimeLimit
    ? `${taskSet.durationSec} 秒 / ${taskSet.showTimer ? "表示" : "非表示"}`
    : "制限なし";
  dom.participantTaskSummary.innerHTML = `
    <strong>${escapeHtml(taskSet.name)}</strong><br />
    文データセット：${escapeHtml(datasetName)}（${sentenceCount} 文）<br />
    出題数：${questionCount} 問（${taskSet.randomize ? "ランダム抽出" : "順番通り"}）<br />
    制限時間：${limitText}${taskSet.notes ? `<br />メモ：${escapeHtml(taskSet.notes)}` : ""}`;
}

function startParticipantTask() {
  const taskSet = getActiveTaskSet();
  const sentenceSet = taskSet ? sentenceSets.find((set) => set.id === taskSet.sentenceSetId) : null;
  if (!taskSet || !sentenceSet) {
    alert("有効なタスクセットを選択してください。");
    return;
  }
  if (!sentenceSet.sentences.length) {
    alert("文データセットが空です。");
    return;
  }

  const pool = clone(sentenceSet.sentences);
  if (taskSet.randomize !== false) {
    shuffleArray(pool);
  }
  const limit = taskSet.questionCount
    ? Math.min(taskSet.questionCount, pool.length)
    : pool.length;
  const stimuli = pool.slice(0, limit);
  if (!stimuli.length) {
    alert("出題する文がありません。");
    return;
  }

  try {
    taskRunner.start({
      taskSet,
      sentenceSet,
      stimuli,
      preferences: { ...preferences },
    });
  } catch (error) {
    console.error(error);
    alert("タスクを開始できませんでした。コンソールを確認してください。");
  }
}

function renderTasksetSentenceOptions() {
  populateSelect(dom.tasksetSentenceSet, sentenceSets, false);
}

function renderTasksetSection() {
  populateSelect(dom.tasksetSelector, taskSets, false);
  const taskSet = getActiveTaskSet();
  if (!taskSet && taskSets.length) {
    preferences.activeTaskSetId = taskSets[0].id;
    savePreferences();
    renderTasksetSection();
    return;
  }
  if (!taskSet) {
    clearTasksetForm();
    updateTasksetJsonTextarea();
    return;
  }
  dom.tasksetSelector.value = taskSet.id;
  dom.tasksetName.value = taskSet.name;
  dom.tasksetSentenceSet.value = taskSet.sentenceSetId;
  dom.tasksetQuestionCount.value = taskSet.questionCount ?? "";
  dom.tasksetRandomize.checked = taskSet.randomize !== false;
  dom.tasksetEnableTimer.checked = taskSet.enableTimeLimit;
  dom.tasksetDuration.value = taskSet.durationSec ?? 120;
  dom.tasksetShowTimer.checked = Boolean(taskSet.showTimer);
  dom.tasksetNotes.value = taskSet.notes ?? "";
  handleTimerToggle();
  updateTasksetDatasetInfo();
  updateTasksetJsonTextarea();
}

function clearTasksetForm() {
  dom.tasksetName.value = "";
  dom.tasksetSentenceSet.value = "";
  dom.tasksetQuestionCount.value = "";
  dom.tasksetRandomize.checked = true;
  dom.tasksetEnableTimer.checked = true;
  dom.tasksetDuration.value = 120;
  dom.tasksetShowTimer.checked = true;
  dom.tasksetNotes.value = "";
  dom.tasksetDatasetInfo.textContent = "文データセットを作成してください";
}

function saveTasksetForm() {
  const taskSet = getActiveTaskSet();
  if (!taskSet) return;
  const name = dom.tasksetName.value.trim();
  const sentenceSetId = dom.tasksetSentenceSet.value;
  if (!name) {
    alert("タスクセット名を入力してください。");
    return;
  }
  if (!sentenceSetId) {
    alert("参照する文データセットを選択してください。");
    return;
  }
  const sentenceSet = sentenceSets.find((set) => set.id === sentenceSetId);
  if (!sentenceSet || !sentenceSet.sentences.length) {
    alert("選択した文データセットに文がありません。");
    return;
  }

  const questionCountValue = dom.tasksetQuestionCount.value.trim();
  const questionCount = questionCountValue ? Math.max(1, Number(questionCountValue)) : null;
  const enableTimeLimit = dom.tasksetEnableTimer.checked;
  const duration = Math.max(10, Number(dom.tasksetDuration.value) || 120);

  taskSet.name = name;
  taskSet.sentenceSetId = sentenceSetId;
  taskSet.questionCount = questionCount;
  taskSet.randomize = dom.tasksetRandomize.checked;
  taskSet.enableTimeLimit = enableTimeLimit;
  taskSet.durationSec = duration;
  taskSet.showTimer = enableTimeLimit ? dom.tasksetShowTimer.checked : false;
  taskSet.notes = dom.tasksetNotes.value.trim();
  saveTaskSets();
  renderTasksetSection();
  renderParticipantSelectors();
  renderParticipantSummary();
  alert("タスクセットを保存しました。");
}

function createTaskSet() {
  const newSet = {
    id: generateId("task"),
    name: `新規タスク ${taskSets.length + 1}`,
    sentenceSetId: sentenceSets[0]?.id || null,
    questionCount: null,
    randomize: true,
    enableTimeLimit: true,
    durationSec: 120,
    showTimer: true,
    notes: "",
  };
  taskSets.push(newSet);
  preferences.activeTaskSetId = newSet.id;
  saveTaskSets();
  savePreferences();
}

function duplicateTaskSet() {
  const source = getActiveTaskSet();
  if (!source) return;
  const copy = clone(source);
  copy.id = generateId("task");
  copy.name = `${source.name}（コピー）`;
  taskSets.push(copy);
  preferences.activeTaskSetId = copy.id;
  saveTaskSets();
  savePreferences();
}

function deleteTaskSet() {
  if (!taskSets.length) return;
  if (!confirm("選択中のタスクセットを削除しますか？")) return;
  const activeId = preferences.activeTaskSetId;
  const index = taskSets.findIndex((set) => set.id === activeId);
  if (index >= 0) {
    taskSets.splice(index, 1);
  }
  saveTaskSets();
  if (taskSets.length) {
    preferences.activeTaskSetId = taskSets[0].id;
  } else {
    preferences.activeTaskSetId = null;
  }
  savePreferences();
  updateTasksetJsonTextarea();
}

function updateTasksetDatasetInfo() {
  const id = dom.tasksetSentenceSet.value;
  const dataset = sentenceSets.find((set) => set.id === id);
  if (!dataset) {
    dom.tasksetDatasetInfo.textContent = "文データセットを作成してください";
    return;
  }
  dom.tasksetDatasetInfo.textContent = `${dataset.name}（${dataset.sentences.length} 文）`;
}

function handleTimerToggle() {
  const enabled = dom.tasksetEnableTimer.checked;
  dom.tasksetDuration.disabled = !enabled;
  dom.tasksetShowTimer.disabled = !enabled;
}

function renderDatasetSection() {
  populateSelect(dom.datasetSelector, sentenceSets, false);
  const dataset = getActiveSentenceSet();
  if (!dataset && sentenceSets.length) {
    preferences.activeSentenceSetId = sentenceSets[0].id;
    savePreferences();
    renderDatasetSection();
    return;
  }
  if (!dataset) {
    dom.datasetName.value = "";
    dom.datasetDescription.value = "";
    dom.datasetMetaInfo.textContent = "文データセットが存在しません";
    dom.datasetJson.value = "";
    dom.sentenceTableBody.innerHTML = "";
    resetSentenceForm();
    return;
  }
  dom.datasetSelector.value = dataset.id;
  dom.datasetName.value = dataset.name;
  dom.datasetDescription.value = dataset.description ?? "";
  dom.datasetMetaInfo.textContent = `${dataset.sentences.length} 文 / ID: ${dataset.id}`;
  dom.datasetJson.value = JSON.stringify(dataset.sentences, null, 2);
  renderSentenceTable(dataset);
  resetSentenceForm();
}

function renderSentenceTable(dataset) {
  dom.sentenceTableBody.innerHTML = "";
  dataset.sentences.forEach((sentence, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${escapeHtml(sentence.text)}</td>
      <td><span class="${sentence.truth ? "pill-true" : "pill-false"}">${sentence.truth ? "真" : "偽"}</span></td>
      <td>${(sentence.tags || [])
        .map((tag) => `<span class=\"tag\">${escapeHtml(tag)}</span>`)
        .join(" ")}</td>
      <td>
        <div class="inline-actions" style="justify-content:flex-start; gap:0.3rem;">
          <button class="btn btn-outline" data-index="${index}" data-action="edit" style="font-size: 0.7rem; padding: 0.2rem 0.6rem;">
            編集
          </button>
          <button class="btn btn-outline" data-index="${index}" data-action="delete" style="font-size: 0.7rem; padding: 0.2rem 0.6rem;">
            削除
          </button>
        </div>
      </td>
    `;
    dom.sentenceTableBody.appendChild(tr);
  });
}

function saveDatasetMeta() {
  const dataset = getActiveSentenceSet();
  if (!dataset) return;
  const name = dom.datasetName.value.trim();
  if (!name) {
    alert("セット名を入力してください。");
    return;
  }
  dataset.name = name;
  dataset.description = dom.datasetDescription.value.trim();
  saveSentenceSets();
  renderDatasetSection();
  renderTasksetSentenceOptions();
  renderParticipantSelectors();
  renderParticipantSummary();
  alert("文データセットを保存しました。");
}

function createDataset() {
  const newSet = {
    id: generateId("set"),
    name: `新規セット ${sentenceSets.length + 1}`,
    description: "",
    sentences: [],
  };
  sentenceSets.push(newSet);
  preferences.activeSentenceSetId = newSet.id;
  saveSentenceSets();
  savePreferences();
}

function duplicateDataset() {
  const dataset = getActiveSentenceSet();
  if (!dataset) return;
  const copy = clone(dataset);
  copy.id = generateId("set");
  copy.name = `${dataset.name}（コピー）`;
  sentenceSets.push(copy);
  preferences.activeSentenceSetId = copy.id;
  saveSentenceSets();
  savePreferences();
}

function deleteDataset() {
  if (sentenceSets.length <= 1) {
    alert("少なくとも 1 つの文データセットが必要です。");
    return;
  }
  if (!confirm("選択中の文データセットを削除しますか？")) return;
  const activeId = preferences.activeSentenceSetId;
  const index = sentenceSets.findIndex((set) => set.id === activeId);
  if (index >= 0) {
    sentenceSets.splice(index, 1);
  }
  preferences.activeSentenceSetId = sentenceSets[0]?.id || null;
  saveSentenceSets();
  savePreferences();
  taskSets.forEach((task) => {
    if (task.sentenceSetId === activeId) {
      task.sentenceSetId = sentenceSets[0]?.id || null;
    }
  });
  saveTaskSets();
}

async function handleDatasetReload() {
  if (!confirm("data/sentenceSets.json から文データセットを再読み込みしますか？\n※ 現在のブラウザ内の編集内容は上書きされます。")) {
    return;
  }
  const previousId = preferences.activeSentenceSetId;
  try {
    sentenceSets = await reloadSentenceSetsFromFile();
    if (!sentenceSets.length) {
      throw new Error("文データセットが空です。");
    }
    const stillExists = sentenceSets.some((set) => set.id === previousId);
    if (!stillExists) {
      preferences.activeSentenceSetId = sentenceSets[0].id;
      savePreferences();
    }
    renderDatasetSection();
    renderTasksetSentenceOptions();
    renderParticipantSelectors();
    renderParticipantSummary();
    resetSentenceForm();
    alert("JSON ファイルから文データセットを再読み込みしました。");
  } catch (error) {
    console.error(error);
    alert("JSON の再読み込みに失敗しました。HTTP 経由で開いているか、ファイルの構文をご確認ください。");
  }
}

function applyTasksetJson() {
  try {
    const parsed = JSON.parse(dom.tasksetJson.value);
    if (!Array.isArray(parsed) || !parsed.length) {
      alert("JSON は 1 件以上のタスクセットを含む配列である必要があります。");
      return;
    }
    for (const item of parsed) {
      if (typeof item.id !== "string" || typeof item.name !== "string") {
        alert("各タスクセットには id（文字列）と name（文字列）が必要です。");
        return;
      }
    }
    taskSets = parsed;
    saveTaskSets();
    if (!taskSets.some((set) => set.id === preferences.activeTaskSetId)) {
      preferences.activeTaskSetId = taskSets[0]?.id || null;
      savePreferences();
    }
    renderTasksetSection();
    renderParticipantSelectors();
    renderParticipantSummary();
    alert("タスクセットを JSON から更新しました。");
  } catch (error) {
    console.error(error);
    alert("タスクセット JSON の解析に失敗しました。");
  }
}

function downloadTasksetJson() {
  if (!taskSets.length) {
    alert("タスクセットがありません。");
    return;
  }
  const blob = new Blob([JSON.stringify(taskSets, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "taskSets-export.json";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function handleTasksetReload() {
  if (!confirm("data/taskSets.json からタスクセットを再読み込みしますか？\n※ 現在のブラウザ内の編集内容は上書きされます。")) {
    return;
  }
  const previousId = preferences.activeTaskSetId;
  try {
    taskSets = await reloadTaskSetsFromFile();
    if (!taskSets.length) {
      throw new Error("タスクセットが空です。");
    }
    if (!taskSets.some((set) => set.id === previousId)) {
      preferences.activeTaskSetId = taskSets[0].id;
      savePreferences();
    }
    renderTasksetSection();
    renderParticipantSelectors();
    renderParticipantSummary();
    alert("JSON ファイルからタスクセットを再読み込みしました。");
  } catch (error) {
    console.error(error);
    alert("タスクセットの再読み込みに失敗しました。HTTP 経由で開いているか、ファイルの構文をご確認ください。");
  }
}

function updateTasksetJsonTextarea() {
  if (!dom.tasksetJson) return;
  dom.tasksetJson.value = JSON.stringify(taskSets, null, 2);
}

function applyDatasetJson() {
  const dataset = getActiveSentenceSet();
  if (!dataset) return;
  try {
    const parsed = JSON.parse(dom.datasetJson.value);
    if (!Array.isArray(parsed)) {
      alert("JSON は配列である必要があります。");
      return;
    }
    for (const item of parsed) {
      if (typeof item.text !== "string" || typeof item.truth !== "boolean") {
        alert("各要素には text（文字列）と truth（真偽）が必要です。");
        return;
      }
    }
    dataset.sentences = parsed;
    saveSentenceSets();
    renderDatasetSection();
    renderParticipantSummary();
    resetSentenceForm();
    alert("JSON から文を更新しました。");
  } catch (error) {
    console.error(error);
    alert("JSON を解析できませんでした。");
  }
}

function downloadDatasetJson() {
  const dataset = getActiveSentenceSet();
  if (!dataset) return;
  const blob = new Blob([JSON.stringify(dataset.sentences, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${dataset.id || "sentences"}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function addSentenceToDataset() {
  const dataset = getActiveSentenceSet();
  if (!dataset) return;
  if (sentenceEditIndex !== null) {
    alert("既存の文を編集中です。更新するか、編集をキャンセルしてください。");
    return;
  }
  const values = collectSentenceFormValues();
  if (!values) return;
  const nextId = dataset.sentences.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
  dataset.sentences.push({ id: nextId, text: values.text, truth: values.truth, tags: values.tags });
  saveSentenceSets();
  renderDatasetSection();
  renderParticipantSummary();
}

function removeSentence(index) {
  const dataset = getActiveSentenceSet();
  if (!dataset) return;
  if (!confirm("この文を削除しますか？")) return;
  dataset.sentences.splice(index, 1);
  saveSentenceSets();
  renderDatasetSection();
  renderParticipantSummary();
}

function startSentenceEdit(index) {
  const dataset = getActiveSentenceSet();
  if (!dataset) return;
  const sentence = dataset.sentences[index];
  if (!sentence) return;
  sentenceEditIndex = index;
  dom.newSentenceText.value = sentence.text;
  dom.newSentenceTruth.value = sentence.truth ? "true" : "false";
  dom.newSentenceTags.value = (sentence.tags || []).join(", ");
  dom.addSentence.classList.add("hidden");
  dom.updateSentence.classList.remove("hidden");
  dom.cancelEditSentence.classList.remove("hidden");
  dom.sentenceEditHint.textContent = `#${index + 1} の文を編集中です。内容を変更して「文を更新」を押してください。`;
}

function collectSentenceFormValues() {
  const text = dom.newSentenceText.value.trim();
  if (!text) {
    alert("文を入力してください。");
    return null;
  }
  const truth = dom.newSentenceTruth.value === "true";
  const tags = dom.newSentenceTags.value
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
  return { text, truth, tags };
}

function updateSentenceInDataset() {
  if (sentenceEditIndex === null) return;
  const dataset = getActiveSentenceSet();
  if (!dataset) return;
  const values = collectSentenceFormValues();
  if (!values) return;
  const target = dataset.sentences[sentenceEditIndex];
  if (!target) {
    resetSentenceForm();
    return;
  }
  dataset.sentences[sentenceEditIndex] = {
    ...target,
    text: values.text,
    truth: values.truth,
    tags: values.tags,
  };
  saveSentenceSets();
  renderDatasetSection();
  renderParticipantSummary();
  resetSentenceForm();
}

function resetSentenceForm() {
  sentenceEditIndex = null;
  if (dom.newSentenceText) dom.newSentenceText.value = "";
  if (dom.newSentenceTags) dom.newSentenceTags.value = "";
  if (dom.newSentenceTruth) dom.newSentenceTruth.value = "true";
  if (dom.addSentence) dom.addSentence.classList.remove("hidden");
  if (dom.updateSentence) dom.updateSentence.classList.add("hidden");
  if (dom.cancelEditSentence) dom.cancelEditSentence.classList.add("hidden");
  if (dom.sentenceEditHint) dom.sentenceEditHint.textContent = "";
}

function renderPreferencesSection() {
  dom.prefTrueKey.value = preferences.trueKey || "f";
  dom.prefFalseKey.value = preferences.falseKey || "j";
  dom.prefDebug.checked = Boolean(preferences.showDebug);
}

function savePreferencesFromForm() {
  const trueKey = (dom.prefTrueKey.value || "f").trim();
  const falseKey = (dom.prefFalseKey.value || "j").trim();
  preferences.trueKey = trueKey.charAt(0) || "f";
  preferences.falseKey = falseKey.charAt(0) || "j";
  preferences.showDebug = dom.prefDebug.checked;
  savePreferences();
  updateKeyLabels();
  alert("操作設定を保存しました。");
}

function updateKeyLabels() {
  const trueKey = (preferences.trueKey || "f").toUpperCase();
  const falseKey = (preferences.falseKey || "j").toUpperCase();
  dom.trueKeyPill.textContent = `本当だと思う：${trueKey} キー`;
  dom.falseKeyPill.textContent = `うそだと思う：${falseKey} キー`;
  dom.taskTrueKeyLabel.textContent = `${trueKey} = 本当`;
  dom.taskFalseKeyLabel.textContent = `${falseKey} = うそ`;
}

function populateSelect(selectEl, list, allowEmpty) {
  if (!selectEl) return;
  selectEl.innerHTML = "";
  if (allowEmpty) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "タスクセットを選択";
    selectEl.appendChild(opt);
  }
  list.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.name;
    selectEl.appendChild(option);
  });
}

function logDebug(...args) {
  if (preferences.showDebug) {
    console.log("[DEBUG]", ...args);
  }
}
