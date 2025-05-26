const express = require("express");
const router = express.Router();
const passport = require("passport");
const User = require("../models/User");

// Inscription
router.post("/register", async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    // Validation simple
    if (!username || !email || !password) {
      return res.status(400).json({ message: "Tous les champs sont requis" });
    }

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: "Cet email est déjà utilisé" });
    }

    const userId = await User.create({ username, email, password });
    res.status(201).json({ message: "Utilisateur créé avec succès", userId });
  } catch (err) {
    next(err);
  }
});

// Connexion
router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      return res.status(401).json({ message: info.message });
    }
    req.logIn(user, (err) => {
      if (err) return next(err);
      return res.json({
        message: "Connexion réussie",
        user: { id: user.user_id, username: user.username, role: user.role },
      });
    });
  })(req, res, next);
});

// Déconnexion
router.post("/logout", (req, res) => {
  req.logout(() => {
    res.json({ message: "Déconnexion réussie" });
  });
});

module.exports = router;
