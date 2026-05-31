// API configuration resolver
const API_BASE = '/api/admin';

// --- STATE MANAGEMENT ---
let state = {
  products: [],
  orders: [],
  users: [],
  analytics: {}
};

// --- CURRENCY FORMATTER (Indian Rupee ₹) ---
function formatPrice(amount) {
  return '₹' + Math.round(amount).toLocaleString('en-IN');
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  loadAllData();
  
  // Bind form actions
  document.getElementById('btn-open-add-product').addEventListener('click', openAddModal);
  document.getElementById('btn-close-modal').addEventListener('click', closeModal);
  document.getElementById('btn-cancel-modal').addEventListener('click', closeModal);
  document.getElementById('product-form').addEventListener('submit', handleProductSubmit);

  // Set up periodic sync (every 4 seconds) to keep dashboard statistics and tables updated in real-time
  setInterval(loadAllData, 4000);
});

// --- NAVIGATION ROUTING ---
function initNavigation() {
  const links = document.querySelectorAll('.menu-link');
  const sections = document.querySelectorAll('.dashboard-view');
  const titleHeader = document.getElementById('current-page-title');

  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Update active nav link
      links.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      // Update active view section
      const targetId = link.getAttribute('href').substring(1); // removes '#'
      sections.forEach(sec => {
        if (sec.id === `section-${targetId}`) {
          sec.classList.add('active');
        } else {
          sec.classList.remove('active');
        }
      });

      // Update page title string
      titleHeader.textContent = link.textContent.trim();
      
      // Trigger reload for selected view
      loadAllData();
    });
  });
}

// --- DATA FETCHING & SYNCHRONIZATION ---
async function loadAllData() {
  try {
    const [analyticsRes, productsRes, ordersRes, usersRes] = await Promise.all([
      fetch(`${API_BASE}/analytics`).then(r => r.json()),
      fetch(`${API_BASE}/products`).then(r => r.json()),
      fetch(`${API_BASE}/orders`).then(r => r.json()),
      fetch(`${API_BASE}/users`).then(r => r.json())
    ]);

    state.analytics = analyticsRes;
    state.products = productsRes;
    state.orders = ordersRes;
    state.users = usersRes;

    renderAnalytics();
    renderProducts();
    renderOrders();
    renderUsers();
  } catch (error) {
    console.error("Error synchronization data from database API:", error);
    showToast("Failed to fetch dashboard data. Make sure backend is running.", "error");
  }
}

// --- RENDER FUNCTIONS ---
function renderAnalytics() {
  const { totalOrders, totalUsers, totalProducts, totalRevenue, lowStockCount, activeDeliveries } = state.analytics;

  document.getElementById('stat-revenue').textContent = formatPrice(totalRevenue || 0);
  document.getElementById('stat-orders').textContent = totalOrders || 0;
  document.getElementById('stat-products').textContent = totalProducts || 0;
  document.getElementById('stat-low-stock').textContent = lowStockCount || 0;

  // Add highlight danger color if there are low stock warnings
  const lowStockIcon = document.getElementById('stat-low-stock-icon');
  if (lowStockCount > 0) {
    lowStockIcon.style.color = 'var(--danger)';
    lowStockIcon.style.background = 'rgba(239, 68, 68, 0.15)';
  } else {
    lowStockIcon.style.color = 'var(--text-muted)';
    lowStockIcon.style.background = 'rgba(255,255,255,0.05)';
  }

  // Populate low stock table list
  const lowStockListBody = document.getElementById('dashboard-low-stock-rows');
  const lowStockProducts = state.products.filter(p => p.stock <= 5);

  if (lowStockProducts.length === 0) {
    lowStockListBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--text-muted);">All product stock levels healthy</td></tr>`;
  } else {
    lowStockListBody.innerHTML = lowStockProducts.map(p => `
      <tr>
        <td style="font-weight:600; color:var(--text-primary);">${p.name}</td>
        <td>${p.category}</td>
        <td><span style="color:var(--danger); font-weight:700;">${p.stock} units</span></td>
      </tr>
    `).join('');
  }

  // Populate recent orders table list
  const recentOrdersBody = document.getElementById('dashboard-recent-orders-rows');
  // Get latest 5 orders
  const recentOrders = [...state.orders]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  if (recentOrders.length === 0) {
    recentOrdersBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">No orders found</td></tr>`;
  } else {
    recentOrdersBody.innerHTML = recentOrders.map(o => {
      const isDelivered = o.status === 'Delivered';
      const pillClass = isDelivered ? 'status-delivered' : 'status-transit';
      return `
        <tr>
          <td style="font-family:monospace; font-weight:700; color:var(--primary);">${o.id}</td>
          <td>${o.shippingDetails.name}</td>
          <td>${formatPrice(o.pricing.total)}</td>
          <td><span class="status-pill ${pillClass}">${o.status}</span></td>
        </tr>
      `;
    }).join('');
  }
}

function renderProducts() {
  const tableBody = document.getElementById('admin-products-rows');
  if (state.products.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">No products found in database</td></tr>`;
    return;
  }

  tableBody.innerHTML = state.products.map(p => {
    const isLow = p.stock <= 5;
    const stockStyle = isLow ? 'color: var(--danger); font-weight:700;' : 'color: var(--success); font-weight:600;';
    return `
      <tr id="prod-row-${p.id}">
        <td><img src="../../${p.image}" class="table-img" alt="${p.name}"></td>
        <td style="font-weight:600; color:var(--text-primary); max-width:240px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${p.name}">${p.name}</td>
        <td>${p.category}</td>
        <td>${formatPrice(p.price)}</td>
        <td><span style="${stockStyle}">${p.stock} ${isLow ? '⚠️' : ''}</span></td>
        <td>
          <div style="display:flex; gap:8px;">
            <button class="icon-btn" onclick="openEditModal('${p.id}')" title="Edit details"><i class="fas fa-edit"></i></button>
            <button class="icon-btn" style="color:var(--danger); background:rgba(239,68,68,0.05);" onclick="handleDeleteProduct('${p.id}')" title="Delete product"><i class="fas fa-trash-alt"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderOrders() {
  const tableBody = document.getElementById('admin-orders-rows');
  if (state.orders.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">No orders found in database</td></tr>`;
    return;
  }

  // Sort orders descending by placement date
  const sortedOrders = [...state.orders].sort((a, b) => new Date(b.date) - new Date(a.date));

  tableBody.innerHTML = sortedOrders.map(o => {
    const isDelivered = o.status === 'Delivered';
    const pillClass = isDelivered ? 'status-delivered' : 'status-transit';
    
    // Format timestamp
    const dateStr = new Date(o.date).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    let selectColor = 'var(--warning)';
    let selectBorderColor = 'rgba(251,191,36,0.3)';
    
    if (o.status === 'Delivered') {
      selectColor = 'var(--success)';
      selectBorderColor = 'rgba(34,197,94,0.3)';
    } else if (o.status === 'Arrived') {
      selectColor = 'var(--secondary)';
      selectBorderColor = 'rgba(96,165,250,0.3)';
    }

    return `
      <tr>
        <td style="font-family:monospace; font-weight:700; color:var(--primary);">${o.id}</td>
        <td>${dateStr}</td>
        <td>${o.userEmail}</td>
        <td>${formatPrice(o.pricing.total)}</td>
        <td>
          <select class="input-field" style="height:32px; padding:0 8px; font-size:0.75rem; border-color:${selectBorderColor}; color:${selectColor}; font-weight:700;" onchange="handleOrderStatusChange('${o.id}', this.value)">
            <option value="In Transit" ${o.status === 'In Transit' ? 'selected' : ''}>In Transit</option>
            <option value="Arrived" ${o.status === 'Arrived' ? 'selected' : ''}>Arrived</option>
            <option value="Delivered" ${o.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
          </select>
        </td>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            <div style="background:#ffffff; padding:2px; border-radius:4px; display:flex; align-items:center; justify-content:center; cursor:pointer; width:28px; height:28px; transition: var(--transition-fast);" onclick="previewOrderQR('${o.id}')" title="Click to view/print package label">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=24x24&color=0d1117&data=USER:${o.userId || 'guest'}|ORDER:${o.id}" alt="QR" style="width:24px; height:24px; display:block;">
            </div>
            <button class="icon-btn" style="width:28px; height:28px; font-size:0.75rem;" onclick="downloadOrderQR('${o.id}')" title="Download QR Label for Box">
              <i class="fas fa-download"></i>
            </button>
          </div>
        </td>
        <td>
          <button class="btn btn-secondary" style="padding:6px 12px; font-size:0.75rem;" onclick="viewOrderReceipt('${o.id}')">
            <i class="fas fa-receipt"></i> Details
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function renderUsers() {
  const tableBody = document.getElementById('admin-users-rows');
  if (state.users.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">No users found in database</td></tr>`;
    return;
  }

  tableBody.innerHTML = state.users.map(u => {
    const dateStr = new Date(u.createdAt).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
    return `
      <tr>
        <td style="font-family:monospace; font-size:0.8rem; color:var(--text-muted);">${u.id}</td>
        <td style="font-weight:600; color:var(--text-primary);">${u.name}</td>
        <td>${u.email}</td>
        <td>${dateStr}</td>
      </tr>
    `;
  }).join('');
}

// --- PRODUCT CREATE / UPDATE / DELETE FLOW ---
function openAddModal() {
  document.getElementById('modal-title').textContent = 'Add New Store Product';
  document.getElementById('form-product-id').value = '';
  document.getElementById('product-form').reset();
  document.getElementById('prod-image').value = 'assets/headphones.png'; // default fallback image
  document.getElementById('product-modal').classList.add('active');
}

function openEditModal(productId) {
  const p = state.products.find(item => item.id === productId);
  if (!p) return;

  document.getElementById('modal-title').textContent = 'Edit Product Details';
  document.getElementById('form-product-id').value = p.id;
  document.getElementById('prod-name').value = p.name;
  document.getElementById('prod-category').value = p.category;
  document.getElementById('prod-stock').value = p.stock;
  document.getElementById('prod-price').value = p.price;
  document.getElementById('prod-image').value = p.image;
  document.getElementById('prod-description').value = p.description;

  document.getElementById('product-modal').classList.add('active');
}

function closeModal() {
  document.getElementById('product-modal').classList.remove('active');
}

async function handleProductSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('form-product-id').value;
  const name = document.getElementById('prod-name').value;
  const category = document.getElementById('prod-category').value;
  const stock = Number(document.getElementById('prod-stock').value);
  const price = Number(document.getElementById('prod-price').value);
  const image = document.getElementById('prod-image').value;
  const description = document.getElementById('prod-description').value;

  const productData = { name, category, price, stock, image, description };

  const isEdit = id !== '';
  const url = isEdit ? `${API_BASE}/products/${id}` : `${API_BASE}/products`;
  const method = isEdit ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });

    if (!res.ok) throw new Error("Failed to save product database updates.");
    
    closeModal();
    showToast(isEdit ? "Product details updated successfully!" : "New product added to store!", "success");
    loadAllData();
  } catch (error) {
    console.error(error);
    showToast("Error saving product: " + error.message, "error");
  }
}

async function handleDeleteProduct(productId) {
  const p = state.products.find(item => item.id === productId);
  if (!p) return;

  if (!confirm(`Are you sure you want to delete "${p.name}"? This will remove it from the catalog permanently.`)) {
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/products/${productId}`, {
      method: 'DELETE'
    });

    if (!res.ok) throw new Error("Failed to delete product from database");

    showToast("Product deleted from store catalog", "info");
    loadAllData();
  } catch (error) {
    console.error(error);
    showToast("Error deleting product: " + error.message, "error");
  }
}

// --- ORDER STATUS AND VIEW DETAILS FLOW ---
async function handleOrderStatusChange(orderId, newStatus) {
  const updateData = { status: newStatus };
  
  // If status is updated to Delivered, generate signature receipt details dynamically
  if (newStatus === 'Delivered') {
    updateData.signatureCode = `SIG-SHA256-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    updateData.arrivalTime = new Date().toISOString();
  }

  try {
    const res = await fetch(`${API_BASE}/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });

    if (!res.ok) throw new Error("Failed to update status on server database.");

    showToast(`Order status updated to: ${newStatus}`, "success");
    loadAllData();
  } catch (error) {
    console.error(error);
    showToast("Error updating order: " + error.message, "error");
  }
}

function viewOrderReceipt(orderId) {
  const o = state.orders.find(item => item.id === orderId);
  if (!o) return;

  const receiptModal = document.createElement('div');
  receiptModal.className = 'modal-overlay active';
  
  const itemSummaryList = o.items.map(item => `
    <div style="display:flex; justify-content:space-between; font-size:0.85rem; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.03);">
      <span style="color:var(--text-secondary);">${item.name} (x${item.quantity})</span>
      <span style="font-weight:600;">${formatPrice(item.price * item.quantity)}</span>
    </div>
  `).join('');

  receiptModal.innerHTML = `
    <div class="glass-panel modal-card" style="max-width:480px; text-align:left;">
      <div class="modal-header">
        <h3 style="font-family:var(--font-heading); color:var(--primary);">Order Verification Card</h3>
        <button class="icon-btn" id="btn-close-receipt"><i class="fas fa-times"></i></button>
      </div>
 
      <div style="display:flex; flex-direction:column; gap:16px; margin-top: 10px;">
        <div style="display:flex; justify-content:space-between; border-bottom:1px dashed var(--border-light); padding-bottom:8px;">
          <div>
            <strong style="font-size:1rem; color:var(--text-primary);">Order #${o.id}</strong>
            <span style="display:block; font-size:0.75rem; color:var(--text-muted); margin-top:2px;">Placed on ${new Date(o.date).toLocaleString()}</span>
          </div>
          <span class="status-pill ${o.status === 'Delivered' ? 'status-delivered' : 'status-transit'}" style="height:fit-content;">${o.status}</span>
        </div>
 
        <div>
          <span style="display:block; font-size:0.72rem; color:var(--primary); font-weight:700; text-transform:uppercase; margin-bottom:6px;">Shipping Address</span>
          <div style="font-size:0.85rem; line-height:1.5; color:var(--text-secondary);">
            ${o.shippingDetails.name}<br>
            ${o.shippingDetails.address}<br>
            ${o.shippingDetails.city}, ${o.shippingDetails.state} - ${o.shippingDetails.pin}<br>
            Phone: +91 ${o.shippingDetails.phone}
          </div>
        </div>
 
        <div>
          <span style="display:block; font-size:0.72rem; color:var(--primary); font-weight:700; text-transform:uppercase; margin-bottom:6px;">Items Summary</span>
          ${itemSummaryList}
        </div>
 
        <div style="display:flex; justify-content:space-between; font-weight:700; font-size:0.95rem; margin-top: 4px;">
          <span>Grand Total Paid:</span>
          <span style="color:var(--secondary);">${formatPrice(o.pricing.total)}</span>
        </div>
 
        ${o.status === 'Delivered' ? `
          <div style="background:rgba(34,197,94,0.02); border:1px solid var(--success); border-radius:var(--radius-sm); padding:12px; display:flex; flex-direction:column; gap:6px;">
            <span style="font-size:0.72rem; color:var(--success); font-weight:700; text-transform:uppercase;">Digital Verification Hash Seal</span>
            <div style="font-size:0.8rem; font-family:monospace; color:var(--text-secondary); word-break:break-all;"><strong>Security Code:</strong> ${o.signatureCode}</div>
            <div style="font-size:0.8rem; color:var(--text-secondary);"><strong>Signed on:</strong> ${new Date(o.arrivalTime).toLocaleString()}</div>
            <div style="font-size:0.8rem; color:var(--text-secondary);"><strong>Seal Signature Name:</strong> <span style="font-style:italic; font-family:var(--font-heading); color:var(--primary); font-weight:500;">${o.shippingDetails.name}</span></div>
          </div>
        ` : `
          <div style="background:rgba(251,191,36,0.02); border:1px dashed rgba(251,191,36,0.3); border-radius:var(--radius-sm); padding:12px; font-size:0.8rem; color:var(--text-secondary); line-height:1.45;">
            <i class="fas fa-truck-fast" style="color:var(--warning); margin-right:6px;"></i> Package is currently in transit. Awaiting doorstep QR verification.
          </div>
        `}
 
        <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-light); border-radius:var(--radius-sm); padding:16px; display:flex; flex-direction:column; gap:12px;">
          <div style="display:flex; gap:16px; align-items:center;">
            <div style="background:#ffffff; padding:6px; border-radius:var(--radius-sm); display:flex; align-items:center; justify-content:center; cursor:pointer;" onclick="previewOrderQR('${o.id}')" title="Click to view full print-friendly label">
              <img id="receipt-qr-image" src="https://api.qrserver.com/v1/create-qr-code/?size=90x90&color=0d1117&data=USER:${o.userId || 'guest'}|ORDER:${o.id}" alt="Package QR Code" style="width:90px; height:90px; display:block;">
            </div>
            <div style="flex:1; display:flex; flex-direction:column; gap:8px;">
              <span style="font-size:0.7rem; color:var(--text-muted); font-weight:700; text-transform:uppercase;">Package Box QR Code</span>
              <span style="font-family:monospace; font-size:0.75rem; color:var(--text-secondary); word-break:break-all;">USER:${o.userId || 'guest'}|ORDER:${o.id}</span>
              <div style="display:flex; gap:8px;">
                <button type="button" class="btn btn-primary" id="btn-download-qr" style="padding:6px 12px; font-size:0.75rem; height:auto; align-self:flex-start; margin-top:2px;">
                  <i class="fas fa-download"></i> Download PNG
                </button>
                <button type="button" class="btn btn-secondary" onclick="previewOrderQR('${o.id}')" style="padding:6px 12px; font-size:0.75rem; height:auto; align-self:flex-start; margin-top:2px;">
                  <i class="fas fa-print"></i> Print Label
                </button>
              </div>
            </div>
          </div>
        </div>
 
        <button class="btn btn-secondary" style="width:100%; margin-top: 8px;" id="btn-close-receipt-ok">Close Details</button>
      </div>
    </div>
  `;

  document.body.appendChild(receiptModal);

  const closeReceipt = () => receiptModal.remove();
  document.getElementById('btn-close-receipt').addEventListener('click', closeReceipt);
  document.getElementById('btn-close-receipt-ok').addEventListener('click', closeReceipt);

  const downloadBtn = document.getElementById('btn-download-qr');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      const qrData = `USER:${o.userId || 'guest'}|ORDER:${o.id}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&color=0d1117&data=${encodeURIComponent(qrData)}`;
      downloadQRImage(qrUrl, o.id);
    });
  }
}

async function downloadQRImage(url, orderId) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `QR-BOX-LABEL-${orderId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(blobUrl);
    showToast("QR code box label downloaded!", "success");
  } catch (error) {
    console.error("CORS check or fetch error, opening in new tab instead:", error);
    window.open(url, '_blank');
  }
}

// --- GLOBAL ORDER QR CODE CONTROLS ---
window.downloadOrderQR = function(orderId) {
  const o = state.orders.find(item => item.id === orderId);
  if (!o) {
    showToast("Order not found.", "error");
    return;
  }
  const qrData = `USER:${o.userId || 'guest'}|ORDER:${o.id}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&color=0d1117&data=${encodeURIComponent(qrData)}`;
  downloadQRImage(qrUrl, o.id);
};

window.previewOrderQR = function(orderId) {
  const o = state.orders.find(item => item.id === orderId);
  if (!o) {
    showToast("Order not found.", "error");
    return;
  }

  const qrData = `USER:${o.userId || 'guest'}|ORDER:${o.id}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&color=0d1117&data=${encodeURIComponent(qrData)}`;

  const previewModal = document.createElement('div');
  previewModal.className = 'modal-overlay active';
  previewModal.id = 'qr-preview-modal';
  
  previewModal.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:20px; align-items:center;">
      <div class="glass-panel modal-card" id="print-label-card" style="max-width:420px; text-align:center; padding: 30px; background: #ffffff; color: #0d1117; border: 2px solid #0d1117; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
        <style>
          @media print {
            body * {
              visibility: hidden !important;
            }
            #print-label-card, #print-label-card * {
              visibility: visible !important;
            }
            #print-label-card {
              position: absolute !important;
              left: 50% !important;
              top: 50% !important;
              transform: translate(-50%, -50%) !important;
              width: 100% !important;
              max-width: 420px !important;
              border: 2px solid #000000 !important;
              background: #ffffff !important;
              color: #000000 !important;
              box-shadow: none !important;
              padding: 30px !important;
              margin: 0 !important;
            }
            #print-label-card div, #print-label-card strong, #print-label-card span, #print-label-card h3 {
              color: #000000 !important;
            }
            #print-label-card .printable-routing-details {
              background: #ffffff !important;
              border: 1px solid #000000 !important;
            }
          }
        </style>
        
        <div style="border-bottom: 2px solid #0d1117; padding-bottom: 12px; margin-bottom: 16px;">
          <h3 style="font-family: var(--font-heading); font-size: 1.5rem; color: #0d1117; margin: 0; text-transform: uppercase; letter-spacing: 1px; font-weight:800;">ElectroFlux</h3>
          <span style="font-size: 0.8rem; color: #555; font-weight: 700; letter-spacing: 0.5px;">PACKAGE ROUTING LABEL</span>
        </div>
        
        <div style="background:#ffffff; padding:10px; display:inline-block; border: 1px solid #ccc; margin-bottom: 16px; border-radius: var(--radius-sm);">
          <img src="${qrUrl}" alt="Box QR Code" style="width:180px; height:180px; display:block;">
        </div>
        
        <div class="printable-routing-details" style="text-align: left; font-family: monospace; font-size: 0.85rem; line-height: 1.5; color: #0d1117; background: #f4f6f9; padding: 12px; border-radius: var(--radius-sm); border: 1px solid #ddd;">
          <div style="border-bottom: 1px dashed #ccc; padding-bottom: 6px; margin-bottom: 6px;">
            <strong>ORDER ID:</strong> ${o.id}
          </div>
          <div style="border-bottom: 1px dashed #ccc; padding-bottom: 6px; margin-bottom: 6px;">
            <strong>USER ID:</strong> ${o.userId || 'guest'}
          </div>
          <div style="border-bottom: 1px dashed #ccc; padding-bottom: 6px; margin-bottom: 6px;">
            <strong>CUSTOMER:</strong> ${o.shippingDetails.name}
          </div>
          <div>
            <strong>PHONE:</strong> +91 ${o.shippingDetails.phone}
          </div>
        </div>
        
        <div style="margin-top: 16px; font-size: 0.68rem; color: #666; text-transform: uppercase; font-weight: 700; border-top: 1px solid #eee; padding-top: 12px;">
          Match QR code with scanner during package delivery
        </div>
      </div>
      
      <!-- Control Action Panel (hidden during print) -->
      <div style="display:flex; gap:12px; width:100%; max-width:420px; justify-content:center;" class="print-hide">
        <button class="btn btn-secondary" id="btn-close-qr-preview" style="flex:1;"><i class="fas fa-times"></i> Close</button>
        <button class="btn btn-primary btn-glow" id="btn-print-qr-label" style="flex:1.5;"><i class="fas fa-print"></i> Print Label</button>
        <button class="btn btn-primary" id="btn-download-qr-label" style="flex:1.5; background:var(--success); border-color:var(--success);"><i class="fas fa-download"></i> Download PNG</button>
      </div>
    </div>
  `;

  document.body.appendChild(previewModal);

  const closePreview = () => previewModal.remove();
  document.getElementById('btn-close-qr-preview').addEventListener('click', closePreview);
  
  document.getElementById('btn-print-qr-label').addEventListener('click', () => {
    window.print();
  });

  document.getElementById('btn-download-qr-label').addEventListener('click', () => {
    window.downloadOrderQR(orderId);
  });
};

// --- UTILITY: TOAST NOTIFICATIONS ---
function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconClass = 'info-circle';
  if (type === 'success') iconClass = 'check-circle';
  if (type === 'error') iconClass = 'exclamation-circle';
  if (type === 'warning') iconClass = 'exclamation-triangle';

  toast.innerHTML = `
    <i class="fas fa-${iconClass}"></i>
    <div style="font-size:0.9rem; font-weight:500;">${message}</div>
  `;

  container.appendChild(toast);

  // Automatically remove toast after 3.5s
  setTimeout(() => {
    toast.style.transform = 'translateX(120%)';
    setTimeout(() => {
      toast.remove();
    }, 400);
  }, 3500);
}
