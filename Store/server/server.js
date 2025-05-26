require("dotenv").config();
const express = require("express");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const path = require("path");
const passport = require("passport");
const db = require("./config/db");

const app = express();

// Middleware de base
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "../../public")));

// Configuration des sessions
app.use(
    session({
        secret: process.env.SESSION_SECRET || "votre_secret_tres_securise",
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === "production",
            maxAge: 24 * 60 * 60 * 1000, // 24 heures
        },
    })
);

// Initialisation de Passport
app.use(passport.initialize());
app.use(passport.session());

// Connexion à la base de données
db.connect((err) => {
    if (err) {
        console.error("Erreur de connexion à MySQL:", err);
        process.exit(1);
    }
    console.log("Connecté à la base de données MySQL");
});

// Routes
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const adminRoutes = require("./routes/adminRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);

// Route pour les fichiers statics (frontend)
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../../views/boutique.html"));
});

// Gestion des erreurs
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: "Erreur interne du serveur" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Serveur en écoute sur le port ${PORT}`);
});
