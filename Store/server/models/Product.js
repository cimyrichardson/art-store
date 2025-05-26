const pool = require('../config/db');

class Product {
    /**
     * Récupère tous les produits avec pagination et filtres
     * @param {Object} options - Options de recherche
     * @param {number} [options.limit=10]
     * @param {number} [options.offset=0]
     * @param {number} [options.categoryId]
     * @param {string} [options.search]
     * @param {string} [options.sort='newest']
     * @returns {Promise<Array>} Liste des produits
     */
    static async findAll({ limit = 10, offset = 0, categoryId, search, sort = 'newest' }) {
        let query = `
            SELECT p.*, c.name as category_name 
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.category_id
            WHERE 1=1
        `;
        const params = [];

        if (categoryId) {
            query += ' AND p.category_id = ?';
            params.push(categoryId);
        }

        if (search) {
            query += ' AND (p.name LIKE ? OR p.description LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        // Options de tri
        const sortOptions = {
            'price_asc': 'p.price ASC',
            'price_desc': 'p.price DESC',
            'newest': 'p.created_at DESC',
            'popular': 'p.is_featured DESC, p.created_at DESC'
        };

        query += ` ORDER BY ${sortOptions[sort] || 'p.created_at DESC'}`;
        query += ' LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const [products] = await pool.execute(query, params);
        return products;
    }

    /**
     * Compte le nombre total de produits avec les mêmes filtres
     * @param {Object} filters - Filtres de recherche
     * @returns {Promise<number>} Nombre total de produits
     */
    static async count(filters = {}) {
        let query = 'SELECT COUNT(*) as total FROM products WHERE 1=1';
        const params = [];

        if (filters.categoryId) {
            query += ' AND category_id = ?';
            params.push(filters.categoryId);
        }

        if (filters.search) {
            query += ' AND (name LIKE ? OR description LIKE ?)';
            params.push(`%${filters.search}%`, `%${filters.search}%`);
        }

        const [result] = await pool.execute(query, params);
        return result[0].total;
    }

    /**
     * Trouve un produit par son ID
     * @param {number} id 
     * @returns {Promise<Object|null>} Le produit ou null si non trouvé
     */
    static async findById(id) {
        const [rows] = await pool.execute(
            `SELECT p.*, c.name as category_name 
             FROM products p
             LEFT JOIN categories c ON p.category_id = c.category_id
             WHERE p.product_id = ?`,
            [id]
        );
        return rows[0] || null;
    }

    /**
     * Crée un nouveau produit
     * @param {Object} productData - Données du produit
     * @returns {Promise<number>} ID du nouveau produit
     */
    static async create(productData) {
        const { name, description, price, category_id, stock_quantity = 0, image_url = null } = productData;
        const [result] = await pool.execute(
            `INSERT INTO products 
             (name, description, price, category_id, stock_quantity, image_url) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [name, description, price, category_id, stock_quantity, image_url]
        );
        return result.insertId;
    }

    /**
     * Met à jour un produit
     * @param {number} id 
     * @param {Object} updateData - Données à mettre à jour
     * @returns {Promise<boolean>} True si mis à jour
     */
    static async update(id, updateData) {
        const { name, description, price, category_id, stock_quantity, image_url } = updateData;
        const [result] = await pool.execute(
            `UPDATE products SET 
             name = ?, description = ?, price = ?, category_id = ?, 
             stock_quantity = ?, image_url = ?
             WHERE product_id = ?`,
            [name, description, price, category_id, stock_quantity, image_url, id]
        );
        return result.affectedRows > 0;
    }

    /**
     * Supprime un produit
     * @param {number} id 
     * @returns {Promise<boolean>} True si supprimé
     */
    static async delete(id) {
        const [result] = await pool.execute(
            'DELETE FROM products WHERE product_id = ?',
            [id]
        );
        return result.affectedRows > 0;
    }

    /**
     * Met à jour le stock d'un produit
     * @param {number} productId 
     * @param {number} quantityChange - Peut être négatif
     * @returns {Promise<boolean>} True si mis à jour
     */
    static async updateStock(productId, quantityChange) {
        const [result] = await pool.execute(
            'UPDATE products SET stock_quantity = stock_quantity + ? WHERE product_id = ?',
            [quantityChange, productId]
        );
        return result.affectedRows > 0;
    }
}

module.exports = Product;