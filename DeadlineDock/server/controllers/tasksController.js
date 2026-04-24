/**
 * TASKS CONTROLLER
 * Full CRUD for tasks scoped per authenticated user.
 * Includes AI priority suggestion logic server-side.
 */

const db = require('../config/database');

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/** Server-side AI priority suggestion based on deadline proximity */
function suggestPriority(dueDateStr) {
  if (!dueDateStr) return 'medium';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr + 'T00:00:00');
  due.setHours(0, 0, 0, 0);
  const hoursLeft = (due - today) / 3600000;
  if (hoursLeft <= 6)  return 'high';
  if (hoursLeft <= 24) return 'medium';
  if (hoursLeft <= 72) return 'medium';
  return 'low';
}

const TasksController = {
  // GET /api/tasks
  getAll(req, res) {
    try {
      const tasks = db.tasks.findByUser(req.user.id);
      // Sort: pending by position, completed by completedAt desc
      tasks.sort((a, b) => {
        if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
        if (a.status === 'pending') return (a.position || 0) - (b.position || 0);
        return new Date(b.completedAt || 0) - new Date(a.completedAt || 0);
      });
      res.json({ success: true, tasks });
    } catch (err) {
      console.error('getAll tasks error:', err);
      res.status(500).json({ success: false, error: 'Failed to fetch tasks' });
    }
  },

  // POST /api/tasks
  create(req, res) {
    try {
      const { name, subject, dueDate, priority, enableReminder } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, error: 'Task name is required' });
      }
      if (!dueDate) {
        return res.status(400).json({ success: false, error: 'Due date is required' });
      }

      const existingTasks = db.tasks.findByUser(req.user.id);
      const pendingCount = existingTasks.filter(t => t.status !== 'completed').length;

      // AI suggest priority if not provided or if auto
      const aiSuggested = suggestPriority(dueDate);
      const finalPriority = priority && ['high', 'medium', 'low'].includes(priority)
        ? priority
        : aiSuggested;

      const task = db.tasks.create({
        id: generateId(),
        userId: req.user.id,
        name: name.trim(),
        subject: subject ? subject.trim() : '',
        dueDate,
        priority: finalPriority,
        aiSuggested,
        status: 'pending',
        position: pendingCount + 1,
        enableReminder: enableReminder !== false,
        completedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      res.status(201).json({ success: true, task });
    } catch (err) {
      console.error('create task error:', err);
      res.status(500).json({ success: false, error: 'Failed to create task' });
    }
  },

  // PATCH /api/tasks/:id
  update(req, res) {
    try {
      const { id } = req.params;
      const allowed = ['name', 'subject', 'dueDate', 'priority', 'status',
                       'position', 'enableReminder', 'completedAt'];
      const changes = {};
      allowed.forEach(k => {
        if (req.body[k] !== undefined) changes[k] = req.body[k];
      });

      // If marking complete, set completedAt
      if (changes.status === 'completed' && !changes.completedAt) {
        changes.completedAt = new Date().toISOString();
      }
      if (changes.status === 'pending') {
        changes.completedAt = null;
      }

      // Recalculate AI suggestion if dueDate changed
      if (changes.dueDate) {
        changes.aiSuggested = suggestPriority(changes.dueDate);
      }

      const task = db.tasks.update(id, req.user.id, changes);
      if (!task) {
        return res.status(404).json({ success: false, error: 'Task not found' });
      }

      res.json({ success: true, task });
    } catch (err) {
      console.error('update task error:', err);
      res.status(500).json({ success: false, error: 'Failed to update task' });
    }
  },

  // DELETE /api/tasks/:id
  delete(req, res) {
    try {
      const { id } = req.params;
      const deleted = db.tasks.delete(id, req.user.id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Task not found' });
      }
      res.json({ success: true, message: 'Task deleted' });
    } catch (err) {
      console.error('delete task error:', err);
      res.status(500).json({ success: false, error: 'Failed to delete task' });
    }
  },

  // POST /api/tasks/reorder
  reorder(req, res) {
    try {
      const { orderedIds } = req.body;
      if (!Array.isArray(orderedIds)) {
        return res.status(400).json({ success: false, error: 'orderedIds must be an array' });
      }
      db.tasks.reorder(req.user.id, orderedIds);
      res.json({ success: true });
    } catch (err) {
      console.error('reorder tasks error:', err);
      res.status(500).json({ success: false, error: 'Failed to reorder tasks' });
    }
  },

  // GET /api/tasks/ai-suggest?dueDate=YYYY-MM-DD
  aiSuggest(req, res) {
    try {
      const { dueDate } = req.query;
      const priority = suggestPriority(dueDate);
      res.json({ success: true, priority });
    } catch (err) {
      res.status(500).json({ success: false, error: 'AI suggestion failed' });
    }
  }
};

module.exports = TasksController;
