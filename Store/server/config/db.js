const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'artstore_user',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'artstore_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test de connexion
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('Connecté à la base de données MySQL');
        connection.release();
    } catch (err) {
        console.error('Erreur de connexion à MySQL:', err);
        process.exit(1);
    }
}

testConnection();

module.exports = pool;