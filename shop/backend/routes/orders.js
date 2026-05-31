const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all orders, or filter by userEmail query parameter
router.get('/', (req, res) => {
  try {
    const orders = db.getOrders();
    const { email } = req.query;

    if (email) {
      const filtered = orders.filter(o => o.userEmail.toLowerCase() === email.toLowerCase());
      return res.json(filtered);
    }

    res.json(orders);
  } catch (error) {
    console.error("Error in GET /api/orders:", error);
    res.status(500).json({ error: "Server error retrieving orders" });
  }
});

// POST a new order
router.post('/', (req, res) => {
  try {
    const orderData = req.body;
    if (!orderData.id || !orderData.items || !orderData.pricing) {
      return res.status(400).json({ error: "Invalid order payload" });
    }

    const newOrder = db.createOrder(orderData);
    res.status(201).json(newOrder);
  } catch (error) {
    console.error("Error in POST /api/orders:", error);
    res.status(500).json({ error: "Server error creating order" });
  }
});

// PATCH /api/orders/:id to update order status / signature details
router.patch('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedOrder = db.updateOrderStatus(id, updateData);
    if (!updatedOrder) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json(updatedOrder);
  } catch (error) {
    console.error(`Error in PATCH /api/orders/${req.params.id}:`, error);
    res.status(500).json({ error: "Server error updating order" });
  }
});

module.exports = router;
