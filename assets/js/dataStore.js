import {
  STORAGE_KEYS,
  DATA_PATHS,
  DEFAULT_PREFERENCES,
  FALLBACK_SENTENCE_SETS,
  FALLBACK_TASK_SETS,
} from "./constants.js";
import { clone } from "./utils.js";

let sentenceSets = [];
let taskSets = [];
let preferences = { ...DEFAULT_PREFERENCES };

export async function initializeStore() {
  sentenceSets = clone(
    await loadCollection(STORAGE_KEYS.sentenceSets, DATA_PATHS.sentenceSets, FALLBACK_SENTENCE_SETS)
  );
  taskSets = clone(
    await loadCollection(STORAGE_KEYS.taskSets, DATA_PATHS.taskSets, FALLBACK_TASK_SETS)
  );
  preferences = {
    ...DEFAULT_PREFERENCES,
    ...loadPreferencesFromStorage(),
  };

  if (!preferences.activeSentenceSetId && sentenceSets.length) {
    preferences.activeSentenceSetId = sentenceSets[0].id;
  }
  if (!preferences.activeTaskSetId && taskSets.length) {
    preferences.activeTaskSetId = taskSets[0].id;
  }
  savePreferences();

  return {
    sentenceSets,
    taskSets,
    preferences,
  };
}

export function getSentenceSets() {
  return sentenceSets;
}

export function getTaskSets() {
  return taskSets;
}

export function getPreferences() {
  return preferences;
}

export function saveSentenceSets() {
  writeStorage(STORAGE_KEYS.sentenceSets, sentenceSets);
}

export function saveTaskSets() {
  writeStorage(STORAGE_KEYS.taskSets, taskSets);
}

export function savePreferences() {
  writeStorage(STORAGE_KEYS.preferences, preferences);
}

export async function reloadSentenceSetsFromFile() {
  const fresh = await fetchJson(DATA_PATHS.sentenceSets);
  if (!fresh || !Array.isArray(fresh) || !fresh.length) {
    throw new Error("JSON から文データを読み込めませんでした。");
  }
  sentenceSets = clone(fresh);
  saveSentenceSets();
  return sentenceSets;
}

export async function reloadTaskSetsFromFile() {
  const fresh = await fetchJson(DATA_PATHS.taskSets);
  if (!fresh || !Array.isArray(fresh) || !fresh.length) {
    throw new Error("JSON からタスクセットを読み込めませんでした。");
  }
  taskSets = clone(fresh);
  saveTaskSets();
  return taskSets;
}

async function loadCollection(storageKey, filePath, fallback) {
  const stored = readStorage(storageKey);
  if (stored && Array.isArray(stored) && stored.length) {
    return stored;
  }
  const fetched = await fetchJson(filePath);
  if (fetched && Array.isArray(fetched) && fetched.length) {
    writeStorage(storageKey, fetched);
    return fetched;
  }
  writeStorage(storageKey, fallback);
  return fallback;
}

function loadPreferencesFromStorage() {
  const stored = readStorage(STORAGE_KEYS.preferences);
  return stored ? stored : DEFAULT_PREFERENCES;
}

async function fetchJson(path) {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${path}`);
    }
    return await response.json();
  } catch (error) {
    console.warn("Could not load", path, error);
    return null;
  }
}

function readStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error("Failed to read storage", key, error);
    return null;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error("Failed to write storage", key, error);
  }
}
