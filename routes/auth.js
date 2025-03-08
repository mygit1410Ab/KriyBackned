const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const auth = require("../middleware/auth"); // Import the auth middleware
const router = express.Router();

// Signup route
router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    user = new User({ name, email, password: hashedPassword });
    await user.save();

    // Generate access token (expires in 30 days)
    const accessToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    // Generate refresh token (expires in 60 days)
    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "60d" }
    );

    // Save refresh token to the user document
    user.refreshToken = refreshToken;
    await user.save();

    // Return tokens
    res.status(201).json({ accessToken, refreshToken });
  } catch (err) {
    console.error(err); // Log the error for debugging
    res.status(500).json({ message: "Server error" });
  }
});

// Login route
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate access token (expires in 30 days)
    const accessToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    // Generate refresh token (expires in 60 days)
    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "60d" }
    );

    // Save refresh token to the user document
    user.refreshToken = refreshToken;
    await user.save();

    // Return tokens
    res.json({ accessToken, refreshToken });
  } catch (err) {
    console.error(err); // Log the error for debugging
    res.status(500).json({ message: "Server error" });
  }
});

// Refresh token route
router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;

  try {
    // Verify the refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    // Find the user
    const user = await User.findById(decoded.userId);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    // Generate a new access token (expires in 30 days)
    const accessToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    // Return the new access token
    res.json({ accessToken });
  } catch (err) {
    console.error(err); // Log the error for debugging
    res.status(401).json({ message: "Invalid refresh token" });
  }
});

// Logout route
router.post("/logout", async (req, res) => {
  const { refreshToken } = req.body;

  try {
    // Find the user by refresh token
    const user = await User.findOne({ refreshToken });
    if (!user) {
      return res.status(400).json({ message: "Invalid refresh token" });
    }

    // Clear the refresh token
    user.refreshToken = null;
    await user.save();

    res.json({ message: "Logged out successfully" });
  } catch (err) {
    console.error(err); // Log the error for debugging
    res.status(500).json({ message: "Server error" });
  }
});

// Get user details
router.get("/me", auth, async (req, res) => {
  try {
    // Find the user by userId (from the JWT token)
    const user = await User.findById(req.userId).select(
      "-password -refreshToken"
    ); // Exclude sensitive fields
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return user details
    res.json(user);
  } catch (err) {
    console.error(err); // Log the error for debugging
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
