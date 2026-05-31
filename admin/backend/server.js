const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5001;

// Enable CORS
app.use(cors());

// Body parsing
app.use(express.json());

// API: Analytics
app.get('/api/admin/analytics', (req, res) => {
  try {
    const products = db.getProducts();
    const orders = db.getOrders();
    const users = db.getUsers();

    // Calculations
    const totalOrders = orders.length;
    const totalUsers = users.length;
    const totalProducts = products.length;

    // Total revenue from Delivered orders
    const totalRevenue = orders
      .filter(o => o.status === 'Delivered')
      .reduce((sum, o) => sum + o.pricing.total, 0);

    const lowStockCount = products.filter(p => p.stock <= 5).length;
    const activeDeliveries = orders.filter(o => o.status !== 'Delivered').length;

    res.json({
      totalOrders,
      totalUsers,
      totalProducts,
      totalRevenue,
      lowStockCount,
      activeDeliveries
    });
  } catch (error) {
    console.error("Error generating admin analytics:", error);
    res.status(500).json({ error: "Failed to generate analytics dashboard stats" });
  }
});

// API: Products CRUD
app.get('/api/admin/products', (req, res) => {
  try {
    res.json(db.getProducts());
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

app.post('/api/admin/products', (req, res) => {
  try {
    const { name, category, price, description, stock, specs, features } = req.body;
    if (!name || !category || !price) {
      return res.status(400).json({ error: "Please enter product name, category, and price" });
    }
    const newProduct = db.createProduct({ name, category, price, description, stock, specs, features });
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(500).json({ error: "Failed to create product" });
  }
});

app.put('/api/admin/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updated = db.updateProduct(id, req.body);
    if (!updated) return res.status(404).json({ error: "Product not found" });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to update product" });
  }
});

app.delete('/api/admin/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deleted = db.deleteProduct(id);
    if (!deleted) return res.status(404).json({ error: "Product not found" });
    res.json({ success: true, message: "Product deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete product" });
  }
});

// API: Orders Management
app.get('/api/admin/orders', (req, res) => {
  try {
    res.json(db.getOrders());
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

app.patch('/api/admin/orders/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updated = db.updateOrderStatus(id, req.body);
    if (!updated) return res.status(404).json({ error: "Order not found" });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to update order status" });
  }
});

// API: Users List
app.get('/api/admin/users', (req, res) => {
  try {
    res.json(db.getUsers());
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Serve static frontend admin pages
const adminFrontendPath = path.join(__dirname, '../frontend');
app.use(express.static(adminFrontendPath));

// Fallback to index.html for client side routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(adminFrontendPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`  ElectroFlux Admin Server is running on port ${PORT} `);
  console.log(`  Local URL: http://localhost:${PORT}             `);
  console.log(`===================================================`);
});
