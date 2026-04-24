/**
 * STATS CONTROLLER
 * Handles gamification: points, levels, badges, streaks.
 */

const db = require('../config/database');

const BADGE_DEFS = {
  'first-task':  { icon: '🌟', label: 'First Task!' },
  'on-time-5':   { icon: '⚡', label: '5 On-Time' },
  'no-overdue':  { icon: '🏆', label: 'No Overdue' },
  '7-streak':    { icon: '🔥', label: '7-Day Streak' },
  'level-5':     { icon: '🚀', label: 'Level 5' },
  'century':     { icon: '💯', label: '100 Points' },
};

function getStreak(tasks) {
  const done = tasks
    .filter(t => t.completedAt)
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
  if (!done.length) return 0;
  let streak = 0;
  const check = new Date();
  check.setHours(0, 0, 0, 0);
  const days = new Set(done.map(t => new Date(t.completedAt).toDateString()));
  while (days.has(check.toDateString())) {
    streak++;
    check.setDate(check.getDate() - 1);
  }
  return streak;
}

function checkNewBadges(stats, tasks) {
  const newBadges = [];
  const completed = tasks.filter(t => t.status === 'completed');
  const overdue = tasks.filter(
    t => t.status !== 'completed' && new Date(t.dueDate + 'T23:59:59') < new Date()
  );
  const onTimeCount = tasks.filter(
    t => t.completedAt && new Date(t.completedAt) <= new Date(t.dueDate + 'T23:59:59')
  ).length;

  const checks = {
    'first-task': completed.length >= 1,
    'on-time-5':  onTimeCount >= 5,
    'no-overdue': overdue.length === 0 && completed.length > 0,
    '7-streak':   getStreak(tasks) >= 7,
    'level-5':    stats.level >= 5,
    'century':    stats.points >= 100,
  };

  Object.entries(checks).forEach(([id, earned]) => {
    if (earned && !stats.badges.includes(id)) newBadges.push(id);
  });

  return newBadges;
}

const StatsController = {
  // GET /api/stats
  get(req, res) {
    try {
      const stats = db.stats.findByUser(req.user.id) ||
        { userId: req.user.id, points: 0, level: 1, badges: [], notifDismissed: false };
      const tasks = db.tasks.findByUser(req.user.id);

      // Compute derived stats
      const total = tasks.length;
      const done = tasks.filter(t => t.status === 'completed').length;
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const overdue = tasks.filter(
        t => t.status !== 'completed' && new Date(t.dueDate + 'T00:00:00') < today
      ).length;
      const rate = total ? Math.round(done / total * 100) : 0;
      const streak = getStreak(tasks);

      res.json({
        success: true,
        stats: { ...stats, total, done, pending: total - done, overdue, rate, streak }
      });
    } catch (err) {
      console.error('get stats error:', err);
      res.status(500).json({ success: false, error: 'Failed to fetch stats' });
    }
  },

  // POST /api/stats/award
  // Awards points and checks badges after a task action
  award(req, res) {
    try {
      const { points, reason } = req.body;
      if (typeof points !== 'number' || points < 0) {
        return res.status(400).json({ success: false, error: 'Invalid points value' });
      }

      const current = db.stats.findByUser(req.user.id) ||
        { userId: req.user.id, points: 0, level: 1, badges: [], notifDismissed: false };

      const newPoints = (current.points || 0) + points;
      const newLevel = Math.floor(newPoints / 100) + 1;
      const leveledUp = newLevel > (current.level || 1);

      // Check for new badges
      const tasks = db.tasks.findByUser(req.user.id);
      const updatedStats = { ...current, points: newPoints, level: newLevel };
      const newBadges = checkNewBadges(updatedStats, tasks);
      updatedStats.badges = [...(current.badges || []), ...newBadges];

      const saved = db.stats.upsert(req.user.id, updatedStats);

      res.json({
        success: true,
        stats: saved,
        newBadges: newBadges.map(id => ({ id, ...BADGE_DEFS[id] })),
        leveledUp,
        newLevel
      });
    } catch (err) {
      console.error('award points error:', err);
      res.status(500).json({ success: false, error: 'Failed to award points' });
    }
  },

  // PATCH /api/stats
  update(req, res) {
    try {
      const allowed = ['notifDismissed'];
      const changes = {};
      allowed.forEach(k => { if (req.body[k] !== undefined) changes[k] = req.body[k]; });
      const saved = db.stats.upsert(req.user.id, changes);
      res.json({ success: true, stats: saved });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to update stats' });
    }
  },

  // GET /api/stats/analytics
  analytics(req, res) {
    try {
      const tasks = db.tasks.findByUser(req.user.id);
      const today = new Date(); today.setHours(0, 0, 0, 0);

      // 7-day week data
      const weekData = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today); d.setDate(d.getDate() - i);
        const ds = d.toDateString();
        weekData.push({
          label: d.toLocaleDateString('en-US', { weekday: 'short' }),
          date: d.toISOString().split('T')[0],
          added: tasks.filter(t => new Date(t.createdAt).toDateString() === ds).length,
          done: tasks.filter(t => t.completedAt && new Date(t.completedAt).toDateString() === ds).length
        });
      }

      // Priority breakdown
      const priorities = {
        high: tasks.filter(t => t.priority === 'high').length,
        medium: tasks.filter(t => t.priority === 'medium').length,
        low: tasks.filter(t => t.priority === 'low').length
      };

      // Completion stats
      const total = tasks.length;
      const done = tasks.filter(t => t.status === 'completed').length;
      const overdue = tasks.filter(
        t => t.status !== 'completed' && new Date(t.dueDate + 'T00:00:00') < today
      ).length;
      const rate = total ? Math.round(done / total * 100) : 0;
      const weekDone = weekData.reduce((s, d) => s + d.done, 0);
      const streak = getStreak(tasks);

      res.json({
        success: true,
        analytics: { weekData, priorities, total, done, overdue, rate, weekDone, streak }
      });
    } catch (err) {
      console.error('analytics error:', err);
      res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
    }
  }
};

module.exports = StatsController;
