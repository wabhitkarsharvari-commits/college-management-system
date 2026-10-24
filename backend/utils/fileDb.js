const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const queues = {};

function filePath(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

// Read a whole file. If it does not exist yet, return the fallback.
async function readAll(name, fallback = []) {
  try {
    const text = await fs.readFile(filePath(name), 'utf8');
    return JSON.parse(text);
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw new Error(`Could not read ${name}.json: ${err.message}`);
  }
}

async function writeAll(name, data) {
  const target = filePath(name);
  const temp = `${target}.tmp`;
  await fs.writeFile(temp, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(temp, target);
}

// Runs tasks for the same file one after another.
function enqueue(name, task) {
  const previous = queues[name] || Promise.resolve();
  const next = previous.then(task, task);
  queues[name] = next.catch(() => {});
  return next;
}

// Safe read-change-write. "change" receives the data, may modify it,
// and may return a value. If "change" throws, nothing is written.
function modify(name, change, fallback = []) {
  return enqueue(name, async () => {
    const data = await readAll(name, fallback);
    const result = await change(data);
    await writeAll(name, data);
    return result;
  });
}

function newId(prefix) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

module.exports = { readAll, writeAll, modify, newId };