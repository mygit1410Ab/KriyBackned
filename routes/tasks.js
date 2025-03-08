const express = require("express");
const Task = require("../models/Task");
const auth = require("../middleware/auth");
const router = express.Router();

// Create a task (default status: pending)
router.post("/", auth, async (req, res) => {
  const { title, description } = req.body;

  try {
    const task = new Task({ title, description, user: req.userId });
    await task.save();
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get all tasks for the logged-in user (both completed and pending)
router.get("/", auth, async (req, res) => {
  try {
    const tasks = await Task.find({ user: req.userId });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get all completed tasks for the logged-in user
router.get("/completed", auth, async (req, res) => {
  try {
    const tasks = await Task.find({ user: req.userId, status: "completed" });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get a specific task
router.get("/:id", auth, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.userId });
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Update a task (title, description, or status)
router.put("/:id", auth, async (req, res) => {
  const { title, description, status } = req.body;

  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { title, description, status },
      { new: true }
    );
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Update task status dynamically
router.patch("/:id/status", auth, async (req, res) => {
  const { status } = req.body; // Allow dynamic status updates

  try {
    // Validate the status
    if (!["pending", "completed"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    // Update the task status
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { status }, // Update status dynamically
      { new: true }
    );
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Delete a task (works for both pending and completed tasks)
router.delete("/:id", auth, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      user: req.userId,
    });
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    res.json({ message: "Task deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
