const express = require('express');
const cors = require('cors');
const path = require('path');

// Reference the shared database from the shop backend
const db = require('./shop/backend/db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ==========================================
// 1. SHOP ROUTES
// ==========================================
const shopAuth = require('./shop/backend/routes/auth');
const shopProducts = require('./shop/backend/routes/products');
const shopOrders = require('./shop/backend/routes/orders');
app.use('/api/auth', shopAuth);
app.use('/api/products', shopProducts);
app.use('/api/orders', shopOrders);

// ==========================================
// 2. ADMIN ROUTES (Merged from admin/backend/server.js)
// ==========================================
app.get('/api/admin/analytics', (req, res) => {
  try {
    const products = db.getProducts();
    const orders = db.getOrders();
    const users = db.getUsers();

    const totalOrders = orders.length;
    const totalUsers = users.length;
    const totalProducts = products.length;
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
    res.status(500).json({ error: "Failed to generate analytics" });
  }
});

app.get('/api/admin/products', (req, res) => {
  try { res.json(db.getProducts()); } catch (e) { res.status(500).json({ error: "Failed to fetch products" }); }
});

app.post('/api/admin/products', (req, res) => {
  try {
    const { name, category, price, description, stock, specs, features } = req.body;
    if (!name || !category || !price) {
      return res.status(400).json({ error: "Name, category, and price are required" });
    }
    const newProduct = db.createProduct({ name, category, price, description, stock, specs, features });
    res.status(201).json(newProduct);
  } catch (e) { res.status(500).json({ error: "Failed to create product" }); }
});

app.put('/api/admin/products/:id', (req, res) => {
  try {
    const updated = db.updateProduct(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: "Product not found" });
    res.json(updated);
  } catch (e) { res.status(500).json({ error: "Failed to update product" }); }
});

app.delete('/api/admin/products/:id', (req, res) => {
  try {
    const deleted = db.deleteProduct(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Product not found" });
    res.json({ success: true, message: "Product deleted" });
  } catch (e) { res.status(500).json({ error: "Failed to delete product" }); }
});

app.get('/api/admin/orders', (req, res) => {
  try { res.json(db.getOrders()); } catch (e) { res.status(500).json({ error: "Failed to fetch orders" }); }
});

app.patch('/api/admin/orders/:id', (req, res) => {
  try {
    const updated = db.updateOrderStatus(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: "Order not found" });
    res.json(updated);
  } catch (e) { res.status(500).json({ error: "Failed to update order" }); }
});

app.get('/api/admin/users', (req, res) => {
  try { res.json(db.getUsers()); } catch (e) { res.status(500).json({ error: "Failed to fetch users" }); }
});

// ==========================================
// 3. DELIVERY ROUTES (Merged from delivery/backend/server.js)
// ==========================================
app.get('/api/delivery/orders', (req, res) => {
  try { res.json(db.getOrders()); } catch (e) { res.status(500).json({ error: "Failed to fetch orders" }); }
});

app.patch('/api/delivery/orders/:id', (req, res) => {
  try {
    const updated = db.updateOrderStatus(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: "Order not found" });
    res.json(updated);
  } catch (e) { res.status(500).json({ error: "Failed to update order" }); }
});

// ==========================================
// 4. SERVE STATIC FRONTENDS
// ==========================================
// Serve Shop Frontend at the Root URL (/)
app.use(express.static(path.join(__dirname, 'shop/frontend')));

// Serve Admin Frontend at /admin URL
app.use('/admin', express.static(path.join(__dirname, 'admin/frontend')));

// Serve Delivery Frontend at /delivery URL
app.use('/delivery', express.static(path.join(__dirname, 'delivery/frontend')));

// Fallback HTML routing for Admin and Delivery (to support relative page links)
app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin/frontend', 'index.html'));
});

app.get('/delivery/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'delivery/frontend', 'index.html'));
});

// General fallback for Shop frontend
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'shop/frontend', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong on the server" });
});

app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(` Unified ElectroFlux Server running on port ${PORT} `);
  console.log(`===================================================`);
});
