const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all products
router.get('/', (req, res) => {
  try {
    const products = db.getProducts();
    const { category, search } = req.query;
    
    let filteredProducts = [...products];

    // Apply category filter if provided
    if (category) {
      filteredProducts = filteredProducts.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }

    // Apply search filter if provided
    if (search) {
      const searchLower = search.toLowerCase();
      filteredProducts = filteredProducts.filter(p => 
        p.name.toLowerCase().includes(searchLower) || 
        p.description.toLowerCase().includes(searchLower)
      );
    }

    res.json(filteredProducts);
  } catch (error) {
    console.error("Error in GET /api/products:", error);
    res.status(500).json({ error: "Server error retrieving products" });
  }
});

// GET single product by ID
router.get('/:id', (req, res) => {
  try {
    const product = db.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(product);
  } catch (error) {
    console.error(`Error in GET /api/products/${req.params.id}:`, error);
    res.status(500).json({ error: "Server error retrieving product details" });
  }
});

module.exports = router;
