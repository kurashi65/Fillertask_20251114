import { formatTime } from "./utils.js";

export function createTaskRunner(dom, { logDebug = () => {} } = {}) {
  const state = {
    queue: [],
    index: -1,
    responses: [],
    running: false,
    taskSet: null,
    sentenceSet: null,
    preferences: null,
    timerId: null,
    startTime: 0,
    timeLimitMs: 0,
    timeLimitTriggered: false,
  };

  function start({ taskSet, sentenceSet, stimuli, preferences }) {
    if (!Array.isArray(stimuli) || !stimuli.length) {
      throw new Error("刺激が存在しません");
    }
    state.queue = stimuli;
    state.index = -1;
    state.responses = [];
    state.running = true;
    state.taskSet = taskSet;
    state.sentenceSet = sentenceSet;
    state.preferences = preferences;
    state.startTime = performance.now();
    state.timeLimitMs = taskSet.enableTimeLimit ? (taskSet.durationSec || 0) * 1000 : 0;
    state.timeLimitTriggered = false;

    dom.participantSetup.classList.add("hidden");
    dom.participantFinished.classList.add("hidden");
    dom.participantRunning.classList.remove("hidden");
    dom.statusDot.classList.remove("timeup");
    dom.statusLabel.textContent = "実行中";
    dom.statusCount.textContent = `0 / ${state.queue.length}`;

    const shouldShowTimer = taskSet.enableTimeLimit && taskSet.showTimer;
    dom.timerPanel.classList.toggle("hidden", !shouldShowTimer);
    if (shouldShowTimer) {
      updateTimerDisplay();
    }
    if (taskSet.enableTimeLimit) {
      startTimerLoop();
    } else {
      stopTimerLoop();
    }

    nextSentence();
  }

  function startTimerLoop() {
    stopTimerLoop();
    state.timerId = setInterval(() => {
      const elapsed = performance.now() - state.startTime;
      if (!state.timeLimitTriggered && elapsed >= state.timeLimitMs) {
        state.timeLimitTriggered = true;
        dom.statusDot.classList.add("timeup");
        dom.statusLabel.textContent = "時間経過（この回答で終了）";
      }
      if (state.taskSet?.showTimer) {
        updateTimerDisplay();
      }
    }, 100);
  }

  function stopTimerLoop() {
    if (state.timerId) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  function updateTimerDisplay() {
    if (!state.taskSet?.enableTimeLimit) return;
    const elapsed = performance.now() - state.startTime;
    const remaining = Math.max(state.timeLimitMs - elapsed, 0);
    dom.timerValue.textContent = formatTime(remaining / 1000);
  }

  function nextSentence() {
    state.index += 1;
    if (state.index >= state.queue.length) {
      endTask();
      return;
    }
    const stimulus = state.queue[state.index];
    dom.sentenceText.textContent = stimulus.text;
  }

  function handleResponse(isTrueResponse) {
    if (!state.running || state.index < 0 || state.index >= state.queue.length) return;
    const stimulus = state.queue[state.index];
    const now = performance.now();
    const elapsed = now - state.startTime;
    const response = {
      trial: state.responses.length + 1,
      sentenceId: stimulus.id ?? null,
      text: stimulus.text,
      truth: stimulus.truth,
      tags: stimulus.tags || [],
      responseTrue: isTrueResponse,
      correct: Boolean(stimulus.truth) === Boolean(isTrueResponse),
      timeSinceStartMs: Math.round(elapsed),
      timestamp: new Date().toISOString(),
      timeLimitReached: state.timeLimitTriggered,
    };
    state.responses.push(response);
    dom.statusCount.textContent = `${state.responses.length} / ${state.queue.length}`;
    logDebug("Response", response);

    if (state.timeLimitTriggered) {
      endTask();
      return;
    }

    nextSentence();
  }

  function endTask() {
    stopTimerLoop();
    if (!state.running) return;
    state.running = false;
    dom.participantRunning.classList.add("hidden");
    dom.participantFinished.classList.remove("hidden");
    dom.statusLabel.textContent = "終了";

    const payload = {
      finishedAt: new Date().toISOString(),
      taskSet: state.taskSet,
      sentenceSet: {
        id: state.sentenceSet?.id ?? null,
        name: state.sentenceSet?.name ?? null,
      },
      totalTrials: state.responses.length,
      responses: state.responses,
      preferences: {
        trueKey: state.preferences?.trueKey,
        falseKey: state.preferences?.falseKey,
      },
    };
    dom.resultJson.value = JSON.stringify(payload, null, 2);
  }

  function reset() {
    stopTimerLoop();
    state.running = false;
    dom.participantFinished.classList.add("hidden");
    dom.participantRunning.classList.add("hidden");
    dom.participantSetup.classList.remove("hidden");
    dom.sentenceText.textContent = "";
    dom.resultJson.value = "";
    dom.statusLabel.textContent = "待機中";
    dom.statusCount.textContent = "0 / 0";
    dom.statusDot.classList.remove("timeup");
    dom.timerPanel.classList.add("hidden");
  }

  function handleKeyPress(key) {
    if (!state.running) return false;
    const lower = key.toLowerCase();
    const trueKey = (state.preferences?.trueKey || "f").toLowerCase();
    const falseKey = (state.preferences?.falseKey || "j").toLowerCase();
    if (lower === trueKey) {
      handleResponse(true);
      return true;
    }
    if (lower === falseKey) {
      handleResponse(false);
      return true;
    }
    return false;
  }

  return {
    start,
    handleResponse,
    handleKeyPress,
    reset,
    isRunning: () => state.running,
  };
}
