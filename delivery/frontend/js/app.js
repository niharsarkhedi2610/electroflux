const API_BASE = '/api/delivery';

// --- STATE ---
let state = {
  orders: []
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  loadAllData();
  
  // Modal close handlers
  document.getElementById('btn-close-security').addEventListener('click', closeSecurityModal);
  document.getElementById('btn-close-security-ok').addEventListener('click', closeSecurityModal);
  
  // Set up periodic sync (every 6 seconds) to auto-detect client doorstep scan completions
  setInterval(loadAllData, 6000);
});

// --- NAVIGATION ROUTING ---
function initNavigation() {
  const btnActive = document.getElementById('btn-nav-active');
  const btnCompleted = document.getElementById('btn-nav-completed');
  const titleHeader = document.getElementById('current-page-title');
  const secActive = document.getElementById('section-active');
  const secCompleted = document.getElementById('section-completed');

  const switchView = (target) => {
    if (target === 'active') {
      btnActive.classList.add('active');
      btnCompleted.classList.remove('active');
      secActive.classList.add('active');
      secCompleted.classList.remove('active');
      titleHeader.textContent = "Active Deliveries";
    } else {
      btnActive.classList.remove('active');
      btnCompleted.classList.add('active');
      secActive.classList.remove('active');
      secCompleted.classList.add('active');
      titleHeader.textContent = "Completed Jobs";
    }
  };

  btnActive.addEventListener('click', (e) => {
    e.preventDefault();
    switchView('active');
  });

  btnCompleted.addEventListener('click', (e) => {
    e.preventDefault();
    switchView('completed');
  });
}

// --- DATA FETCHING ---
async function loadAllData() {
  try {
    const res = await fetch(`${API_BASE}/orders`);
    if (!res.ok) throw new Error("Could not sync deliveries list");
    
    state.orders = await res.json();
    
    // Sort descending by date
    state.orders.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    renderStats();
    renderActiveDeliveries();
    renderCompletedDeliveries();
  } catch (error) {
    console.error("Sync error:", error);
    showToast("Server connection error during sync", "error");
  }
}

// --- RENDER STATS ---
function renderStats() {
  const pending = state.orders.filter(o => o.status === 'In Transit' || o.status === 'Arrived').length;
  const completed = state.orders.filter(o => o.status === 'Delivered').length;

  document.getElementById('stat-pending').textContent = pending;
  document.getElementById('stat-completed').textContent = completed;
}

// --- RENDER ACTIVE LIST ---
function renderActiveDeliveries() {
  const container = document.getElementById('active-deliveries-container');
  const activeOrders = state.orders.filter(o => o.status === 'In Transit' || o.status === 'Arrived');

  if (activeOrders.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-route" style="font-size: 3rem; color: var(--text-muted); opacity: 0.35;"></i>
        <p style="margin-top: 15px; color: var(--text-muted);">No active deliveries in your queue.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = activeOrders.map(o => {
    const isArrived = o.status === 'Arrived';
    const statusLabel = isArrived ? 'Arrived' : 'In Transit';
    const statusClass = isArrived ? 'status-arrived' : 'status-transit';
    
    // Format items preview
    const itemsCount = o.items.reduce((sum, item) => sum + item.quantity, 0);
    const priceFormatted = '₹' + Math.round(o.pricing.total).toLocaleString('en-IN');

    return `
      <div class="glass-panel delivery-card animate-slide-up" id="delivery-card-${o.id}">
        <div class="card-header">
          <div>
            <span class="order-id">Order #${o.id}</span>
            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">Placed ${new Date(o.date).toLocaleDateString()}</div>
          </div>
          <span class="status-badge ${statusClass}">${statusLabel}</span>
        </div>
        
        <div class="card-body">
          <div class="info-group">
            <span class="info-label">Customer Contact</span>
            <span class="info-value" style="font-weight:600; color:var(--text-primary);">${o.shippingDetails.name}</span>
            <span class="info-value"><i class="fas fa-phone-alt" style="font-size:0.75rem; color:var(--primary); margin-right:4px;"></i> +91 ${o.shippingDetails.phone}</span>
          </div>
          
          <div class="info-group">
            <span class="info-label">Shipping Address</span>
            <span class="info-value" style="line-height:1.4;">
              ${o.shippingDetails.address}, ${o.shippingDetails.city}, ${o.shippingDetails.state} - ${o.shippingDetails.pin}
            </span>
          </div>

          <div class="info-group" style="grid-column: 1 / -1; display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,0.03); padding-top:10px;">
            <div>
              <span class="info-label">Package Items</span>
              <span class="info-value" style="display:block;">${itemsCount} items in shipping box</span>
            </div>
            <div style="text-align:right;">
              <span class="info-label">COD Total Collect</span>
              <span class="info-value" style="font-family:var(--font-heading); font-weight:700; color:var(--primary); font-size:1.05rem;">${priceFormatted}</span>
            </div>
          </div>
        </div>

        <div class="card-actions">
          ${isArrived ? `
            <div style="color:var(--secondary); font-size:0.82rem; font-weight:600; display:flex; align-items:center; gap:8px;" class="pulse-indicator-wrap">
              <span class="pulse-indicator" style="background-color:var(--secondary); box-shadow:0 0 8px var(--secondary);"></span>
              <span>Awaiting doorstep verification scan...</span>
            </div>
          ` : `
            <button class="btn btn-primary" onclick="markArrived('${o.id}')">
              <i class="fas fa-door-open"></i> Notify: Arrived at Location
            </button>
          `}
        </div>
      </div>
    `;
  }).join('');
}

// --- RENDER COMPLETED LIST ---
function renderCompletedDeliveries() {
  const container = document.getElementById('completed-deliveries-container');
  const completedOrders = state.orders.filter(o => o.status === 'Delivered');

  if (completedOrders.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-clipboard-question" style="font-size: 3rem; color: var(--text-muted); opacity: 0.35;"></i>
        <p style="margin-top: 15px; color: var(--text-muted);">No completed deliveries in your queue.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = completedOrders.map(o => {
    const completeTime = o.arrivalTime ? new Date(o.arrivalTime).toLocaleString() : 'N/A';
    return `
      <div class="glass-panel delivery-card animate-slide-up" style="border-color:rgba(34,197,94,0.15);">
        <div class="card-header">
          <div>
            <span class="order-id" style="color:var(--success);">Order #${o.id}</span>
            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">Delivered on ${completeTime}</div>
          </div>
          <span class="status-badge status-delivered">Completed</span>
        </div>

        <div class="card-body">
          <div class="info-group">
            <span class="info-label">Customer Name</span>
            <span class="info-value" style="font-weight:600;">${o.shippingDetails.name}</span>
          </div>
          <div class="info-group">
            <span class="info-label">Courier Signature Seal</span>
            <span class="info-value" style="font-family:monospace; font-size:0.78rem; color:var(--success); font-weight:600;">${o.signatureCode || 'VERIFIED'}</span>
          </div>
        </div>

        <div class="card-actions">
          <button class="btn btn-secondary" style="font-size:0.75rem; padding:6px 12px;" onclick="viewSecurityDetails('${o.id}')">
            <i class="fas fa-lock"></i> Security Details
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// --- ACTIONS ---
async function markArrived(orderId) {
  try {
    const res = await fetch(`${API_BASE}/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Arrived' })
    });

    if (!res.ok) throw new Error("Could not update delivery status");

    showToast("Customer notified! Arrived status set.", "success");
    loadAllData();
  } catch (error) {
    console.error("Error setting arrival status:", error);
    showToast("Failed to notify customer. Try again.", "error");
  }
}

function viewSecurityDetails(orderId) {
  const o = state.orders.find(item => item.id === orderId);
  if (!o) return;

  const content = document.getElementById('security-details-content');
  
  content.innerHTML = `
    <div style="text-align:center; padding:10px 0; border-bottom:1px dashed var(--border-light);">
      <div style="width:50px; height:50px; border-radius:50%; background:rgba(34,197,94,0.1); border:1px solid var(--success); display:flex; align-items:center; justify-content:center; margin:0 auto 10px auto; color:var(--success); font-size:1.5rem;">
        <i class="fas fa-shield-halved"></i>
      </div>
      <strong style="color:var(--success); font-size:1.05rem;">Digital Signature Verified</strong>
      <span style="display:block; font-size:0.75rem; color:var(--text-muted); margin-top:2px;">Secured Handover Complete</span>
    </div>

    <div style="font-size:0.85rem; display:flex; flex-direction:column; gap:10px;">
      <div style="display:flex; justify-content:space-between;">
        <span style="color:var(--text-muted);">Order ID:</span>
        <strong style="font-family:monospace; color:var(--primary);">${o.id}</strong>
      </div>
      <div style="display:flex; justify-content:space-between;">
        <span style="color:var(--text-muted);">Receiver Name:</span>
        <span style="font-weight:600; color:var(--text-primary);">${o.shippingDetails.name}</span>
      </div>
      <div style="display:flex; justify-content:space-between;">
        <span style="color:var(--text-muted);">Handover Time:</span>
        <span style="color:var(--text-secondary);">${new Date(o.arrivalTime).toLocaleString()}</span>
      </div>
      <div style="display:flex; flex-direction:column; gap:4px; margin-top:4px;">
        <span style="color:var(--text-muted);">Verification Cryptographic Seal:</span>
        <div style="font-family:monospace; background:rgba(0,0,0,0.25); border:1px solid var(--border-light); padding:8px 12px; border-radius:var(--radius-sm); color:var(--success); font-size:0.8rem; word-break:break-all;">
          ${o.signatureCode}
        </div>
      </div>
    </div>
  `;

  document.getElementById('security-modal').classList.add('active');
}

function closeSecurityModal() {
  document.getElementById('security-modal').classList.remove('active');
}

// --- UTILITY: TOASTS ---
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

  toast.innerHTML = `
    <i class="fas fa-${iconClass}"></i>
    <div style="font-size:0.85rem; font-weight:500;">${message}</div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transform = 'translateX(120%)';
    setTimeout(() => {
      toast.remove();
    }, 400);
  }, 3000);
}

// Global functions for inline HTML event click bindings
window.markArrived = markArrived;
window.viewSecurityDetails = viewSecurityDetails;
