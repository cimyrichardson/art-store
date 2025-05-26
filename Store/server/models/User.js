const pool = require('../config/db');
const bcrypt = require('bcryptjs');

class User {
    /**
     * Trouve un utilisateur par son email
     * @param {string} email 
     * @returns {Promise<Object|null>} L'utilisateur ou null si non trouvé
     */
    static async findByEmail(email) {
        const [rows] = await pool.execute(
            'SELECT * FROM users WHERE email = ?', 
            [email]
        );
        return rows[0] || null;
    }

    /**
     * Trouve un utilisateur par son ID (sans le mot de passe)
     * @param {number} id 
     * @returns {Promise<Object|null>} L'utilisateur ou null si non trouvé
     */
    static async findById(id) {
        const [rows] = await pool.execute(
            'SELECT user_id, username, email, role, created_at FROM users WHERE user_id = ?', 
            [id]
        );
        return rows[0] || null;
    }

    /**
     * Crée un nouvel utilisateur
     * @param {Object} userData - Données de l'utilisateur
     * @param {string} userData.username
     * @param {string} userData.email
     * @param {string} userData.password
     * @returns {Promise<number>} ID du nouvel utilisateur
     */
    static async create({ username, email, password }) {
        const hashedPassword = await bcrypt.hash(password, 12);
        const [result] = await pool.execute(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            [username, email, hashedPassword]
        );
        return result.insertId;
    }

    /**
     * Met à jour les informations d'un utilisateur
     * @param {number} id 
     * @param {Object} updateData - Données à mettre à jour
     * @returns {Promise<boolean>} True si mis à jour
     */
    static async update(id, { username, email }) {
        const [result] = await pool.execute(
            'UPDATE users SET username = ?, email = ? WHERE user_id = ?',
            [username, email, id]
        );
        return result.affectedRows > 0;
    }

    /**
     * Change le mot de passe d'un utilisateur
     * @param {number} id 
     * @param {string} newPassword 
     * @returns {Promise<boolean>} True si mis à jour
     */
    static async changePassword(id, newPassword) {
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        const [result] = await pool.execute(
            'UPDATE users SET password = ? WHERE user_id = ?',
            [hashedPassword, id]
        );
        return result.affectedRows > 0;
    }

    /**
     * Compare un mot de passe avec le hash stocké
     * @param {string} password 
     * @param {string} hash 
     * @returns {Promise<boolean>} True si correspond
     */
    static async comparePassword(password, hash) {
        return await bcrypt.compare(password, hash);
    }
}

module.exports = User;