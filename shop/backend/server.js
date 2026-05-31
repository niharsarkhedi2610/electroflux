const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend development servers
app.use(cors());

// Body parsing middleware
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

// Serve static frontend files
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// Fallback for HTML5 client routing (optional, redirect to index.html if route not matched)
app.get('*', (req, res, next) => {
  // If requesting api routes, don't fallback to index.html, let them fail or proceed
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandle exception caught:", err.stack);
  res.status(500).json({ error: "Something went wrong on the server" });
});

app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`   ElectroFlux Server is running on port ${PORT}   `);
  console.log(`   Local URL: http://localhost:${PORT}             `);
  console.log(`===================================================`);
});
