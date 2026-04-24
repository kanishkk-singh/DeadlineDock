/**
 * DATABASE CONFIG
 * Pure JSON file-based database (no native bindings needed).
 * Acts as a lightweight relational DB with tables: users, tasks, stats.
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/db.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// Initialize DB structure if empty
const DEFAULT_DB = { users: [], tasks: [], stats: [] };

function readDB() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2));
      return { ...DEFAULT_DB };
    }
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch (e) {
    console.error('DB read error:', e.message);
    return { ...DEFAULT_DB };
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    console.error('DB write error:', e.message);
    return false;
  }
}

// Lightweight ORM-like interface
const db = {
  // ── USERS ──────────────────────────────────────
  users: {
    findAll() { return readDB().users; },
    findById(id) { return readDB().users.find(u => u.id === id) || null; },
    findByEmail(email) { return readDB().users.find(u => u.email === email) || null; },
    create(user) {
      const data = readDB();
      data.users.push(user);
      writeDB(data);
      return user;
    },
    update(id, changes) {
      const data = readDB();
      const idx = data.users.findIndex(u => u.id === id);
      if (idx === -1) return null;
      data.users[idx] = { ...data.users[idx], ...changes };
      writeDB(data);
      return data.users[idx];
    }
  },

  // ── TASKS ──────────────────────────────────────
  tasks: {
    findByUser(userId) {
      return readDB().tasks.filter(t => t.userId === userId);
    },
    findById(id, userId) {
      return readDB().tasks.find(t => t.id === id && t.userId === userId) || null;
    },
    create(task) {
      const data = readDB();
      data.tasks.push(task);
      writeDB(data);
      return task;
    },
    update(id, userId, changes) {
      const data = readDB();
      const idx = data.tasks.findIndex(t => t.id === id && t.userId === userId);
      if (idx === -1) return null;
      data.tasks[idx] = { ...data.tasks[idx], ...changes, updatedAt: new Date().toISOString() };
      writeDB(data);
      return data.tasks[idx];
    },
    delete(id, userId) {
      const data = readDB();
      const idx = data.tasks.findIndex(t => t.id === id && t.userId === userId);
      if (idx === -1) return false;
      data.tasks.splice(idx, 1);
      writeDB(data);
      return true;
    },
    reorder(userId, orderedIds) {
      const data = readDB();
      orderedIds.forEach((id, i) => {
        const idx = data.tasks.findIndex(t => t.id === id && t.userId === userId);
        if (idx !== -1) data.tasks[idx].position = i + 1;
      });
      writeDB(data);
      return true;
    }
  },

  // ── STATS (gamification) ──────────────────────
  stats: {
    findByUser(userId) {
      return readDB().stats.find(s => s.userId === userId) || null;
    },
    upsert(userId, changes) {
      const data = readDB();
      const idx = data.stats.findIndex(s => s.userId === userId);
      const defaults = { userId, points: 0, level: 1, badges: [], notifDismissed: false };
      if (idx === -1) {
        const newStats = { ...defaults, ...changes, updatedAt: new Date().toISOString() };
        data.stats.push(newStats);
        writeDB(data);
        return newStats;
      } else {
        data.stats[idx] = { ...data.stats[idx], ...changes, updatedAt: new Date().toISOString() };
        writeDB(data);
        return data.stats[idx];
      }
    }
  }
};

module.exports = db;
