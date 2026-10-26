const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const directory = path.join(__dirname, "..", "data", "vocabulary");
const context = { window: { BIMBA_VOCABULARY: [] } };
vm.createContext(context);
for (const file of fs.readdirSync(directory).filter(name => name.endsWith(".js")).sort()) {
  vm.runInContext(fs.readFileSync(path.join(directory, file), "utf8"), context, { filename: file });
}

const entries = context.window.BIMBA_VOCABULARY;
const allowedTypes = new Set(["word", "expression", "collocation", "phrasal verb"]);
const allowedLevels = new Set(["A1", "A2", "B1", "B2", "C1"]);
const requiredThemes = new Set(["food", "home", "people", "work", "travel", "health", "shopping", "technology", "nature", "education", "money", "social"]);
const ids = new Set();
const keys = new Set();
const errors = [];
for (const entry of entries) {
  if (!entry.id || ids.has(entry.id)) errors.push(`ID duplicado o vacío: ${entry.id || "(vacío)"}`);
  if (entry.id) ids.add(entry.id);
  const key = `${entry.theme}:${entry.word.toLowerCase()}:${entry.type}`;
  if (keys.has(key)) errors.push(`Duplicado temático: ${key}`);
  keys.add(key);
  if (!entry.theme || !entry.subtopic || !entry.word || !entry.meaning || !entry.example) errors.push(`Campos obligatorios incompletos: ${entry.id}`);
  if (!allowedTypes.has(entry.type)) errors.push(`Tipo no permitido en ${entry.id}: ${entry.type}`);
  if (!allowedLevels.has(entry.cefr)) errors.push(`CEFR no permitido en ${entry.id}: ${entry.cefr}`);
  if (!["high", "medium", "low"].includes(entry.frequency)) errors.push(`Frecuencia no permitida en ${entry.id}: ${entry.frequency}`);
  if (!Number.isInteger(entry.priority) || entry.priority < 1 || entry.priority > 3) errors.push(`Prioridad no permitida en ${entry.id}: ${entry.priority}`);
  if (!Array.isArray(entry.exercises) || entry.exercises.length === 0) errors.push(`Sin ejercicios asociados: ${entry.id}`);
}
for (const theme of requiredThemes) {
  const uniqueWords = new Set(entries.filter(entry => entry.theme === theme).map(entry => entry.word.trim().toLowerCase()));
  if (uniqueWords.size < 1000) errors.push(`Cobertura insuficiente en ${theme}: ${uniqueWords.size}/1000 palabras únicas`);
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Vocabulario válido: ${entries.length} unidades, ${ids.size} IDs únicos.`);
}
