const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5002;

// Enable CORS
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// API: Retrieve orders for delivery executive dashboard
app.get('/api/delivery/orders', (req, res) => {
  try {
    const orders = db.getOrders();
    res.json(orders);
  } catch (error) {
    console.error("Error in GET /api/delivery/orders:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// API: Update order status (In Transit -> Arrived)
app.patch('/api/delivery/orders/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updated = db.updateOrderStatus(id, updateData);
    if (!updated) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json(updated);
  } catch (error) {
    console.error(`Error in PATCH /api/delivery/orders/${req.params.id}:`, error);
    res.status(500).json({ error: "Failed to update order status" });
  }
});

// Serve static frontend delivery pages
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// Fallback client routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`  ElectroFlux Delivery Server is running on port ${PORT} `);
  console.log(`  Local URL: http://localhost:${PORT}             `);
  console.log(`===================================================`);
});
