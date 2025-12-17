export function createTaskRunner(dom, { logDebug = () => {}, onTaskFinished = () => {} } = {}) {
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
    state.taskSet = {
      ...taskSet,
      showTimer: taskSet.showTimer !== false,
      showQuestionCount: taskSet.showQuestionCount === true,
    };
    state.sentenceSet = sentenceSet;
    state.preferences = preferences;
    state.startTime = performance.now();
    state.timeLimitMs = state.taskSet.enableTimeLimit ? (state.taskSet.durationSec || 0) * 1000 : 0;
    state.timeLimitTriggered = false;

    dom.participantSetup.classList.add("hidden");
    dom.participantFinished.classList.add("hidden");
    dom.participantRunning.classList.remove("hidden");

    if (state.taskSet.enableTimeLimit) {
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
        logDebug("Time limit reached");
        endTask();
      }
    }, 100);
  }

  function stopTimerLoop() {
    if (state.timerId) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
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
    const json = JSON.stringify(payload, null, 2);
    try {
      onTaskFinished(payload, json);
    } catch (error) {
      console.error("Failed to handle finished task payload", error);
    }
  }

  function reset() {
    stopTimerLoop();
    state.running = false;
    dom.participantFinished.classList.add("hidden");
    dom.participantRunning.classList.add("hidden");
    dom.participantSetup.classList.remove("hidden");
    if (dom.participantReady) {
      dom.participantReady.disabled = false;
    }
    dom.sentenceText.textContent = "";
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
