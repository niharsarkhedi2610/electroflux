/*
=========================================
  ELECTROFLUX - FRONTEND APPLICATION JS
=========================================
*/

// API Base Resolution: relative when served, localhost:5000 when opened via file protocol
const API_BASE = window.location.protocol === 'file:' 
  ? 'http://localhost:5000/api' 
  : '/api';

// --- STATE MANAGEMENT ---
let state = {
  user: JSON.parse(localStorage.getItem('electroflux_user')) || null,
  token: localStorage.getItem('electroflux_token') || null,
  cart: JSON.parse(localStorage.getItem('electroflux_cart')) || [],
  products: []
};

// --- CURRENCY FORMATTER (Indian Rupee ₹) ---
function formatPrice(amount) {
  return '₹' + Math.round(amount).toLocaleString('en-IN');
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  initGlobalUI();
  updateAuthUI();
  updateCartCounters();
  
  // Page-specific initializers
  const path = window.location.pathname;
  if (path.endsWith('index.html') || path === '/' || path.endsWith('/')) {
    initHomePage();
  } else if (path.endsWith('product.html')) {
    initProductDetailPage();
  } else if (path.endsWith('cart.html')) {
    initCartPage();
  } else if (path.endsWith('login.html')) {
    initAuthPage();
  } else if (path.endsWith('delivery.html')) {
    initDeliveryPage();
  }

  // Start background monitoring for doorstep agent arrivals
  initGlobalNotificationWatcher();
});

// --- GLOBAL UI ACTIONS ---
function initGlobalUI() {
  // Header scroll effects
  const header = document.querySelector('header');
  if (header) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    });
  }

  // Mobile menu toggle
  const mobileMenuToggle = document.querySelector('.mobile-nav-toggle');
  const navMenu = document.querySelector('.nav-menu');
  if (mobileMenuToggle && navMenu) {
    mobileMenuToggle.addEventListener('click', () => {
      navMenu.classList.toggle('active');
      const icon = mobileMenuToggle.querySelector('i');
      if (icon) {
        icon.classList.toggle('fa-bars');
        icon.classList.toggle('fa-times');
      }
    });
  }

  // Profile dropdown toggle
  const profileBtn = document.getElementById('profile-menu-btn');
  const profileDropdown = document.getElementById('profile-dropdown');
  if (profileBtn && profileDropdown) {
    profileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      profileDropdown.classList.toggle('show');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
      profileDropdown.classList.remove('show');
    });
  }

  // Logout button handler
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }
}

// --- AUTHENTICATION ---
function updateAuthUI() {
  const authNav = document.getElementById('auth-nav');
  if (!authNav) return;

  if (state.user) {
    authNav.innerHTML = `
      <div class="user-profile-menu">
        <button class="icon-btn" id="profile-menu-btn" title="Profile">
          <i class="fas fa-user-circle"></i>
        </button>
        <div class="profile-dropdown glass-panel" id="profile-dropdown">
          <div class="dropdown-header">
            <div>Hi, ${state.user.name}</div>
            <div class="dropdown-user-email">${state.user.email}</div>
          </div>
          <a href="cart.html" class="dropdown-item">
            <i class="fas fa-shopping-cart"></i> My Cart
          </a>
          <a href="delivery.html" class="dropdown-item">
            <i class="fas fa-qrcode"></i> Confirm Delivery
          </a>
          <a href="#" class="dropdown-item" id="logout-btn">
            <i class="fas fa-sign-out-alt"></i> Log Out
          </a>
        </div>
      </div>
    `;
    // Re-bind click listeners for the newly injected dynamic DOM components
    initGlobalUI();
  } else {
    authNav.innerHTML = `
      <a href="login.html" class="btn btn-secondary">Sign In</a>
    `;
  }
}

async function login(email, password) {
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    state.user = data.user;
    state.token = data.token;
    localStorage.setItem('electroflux_user', JSON.stringify(data.user));
    localStorage.setItem('electroflux_token', data.token);
    
    updateAuthUI();
    showToast(`Welcome back, ${data.user.name}!`, 'success');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function register(name, email, password) {
  try {
    const response = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    state.user = data.user;
    state.token = data.token;
    localStorage.setItem('electroflux_user', JSON.stringify(data.user));
    localStorage.setItem('electroflux_token', data.token);

    updateAuthUI();
    showToast(`Account created! Welcome, ${data.user.name}.`, 'success');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function logout() {
  state.user = null;
  state.token = null;
  localStorage.removeItem('electroflux_user');
  localStorage.removeItem('electroflux_token');
  updateAuthUI();
  showToast('Logged out successfully', 'info');
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 1000);
}

// --- CART MANAGEMENT ---
function updateCartCounters() {
  const count = state.cart.reduce((total, item) => total + item.quantity, 0);
  const cartBadges = document.querySelectorAll('.cart-count-badge');
  cartBadges.forEach(badge => {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  });

  // Apply subtle micro-animation to cart icon
  const cartBtns = document.querySelectorAll('.icon-btn[href="cart.html"]');
  cartBtns.forEach(btn => {
    btn.style.animation = 'none';
    // Trigger reflow to restart animation
    void btn.offsetWidth;
    if (count > 0) {
      btn.style.animation = 'cartShake 0.6s ease';
    }
  });
}

function addToCart(product, quantity = 1, showNotification = true) {
  const existingItem = state.cart.find(item => item.id === product.id);

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    state.cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      category: product.category,
      quantity: quantity
    });
  }

  localStorage.setItem('electroflux_cart', JSON.stringify(state.cart));
  updateCartCounters();

  if (showNotification) {
    showToast(`Added ${quantity} x ${product.name} to cart.`, 'success');
  }
}

function removeFromCart(productId) {
  const item = state.cart.find(i => i.id === productId);
  state.cart = state.cart.filter(item => item.id !== productId);
  localStorage.setItem('electroflux_cart', JSON.stringify(state.cart));
  updateCartCounters();
  if (item) {
    showToast(`Removed ${item.name} from cart.`, 'info');
  }
}

function updateCartQuantity(productId, quantity) {
  const item = state.cart.find(item => item.id === productId);
  if (item) {
    item.quantity = Math.max(1, parseInt(quantity));
    localStorage.setItem('electroflux_cart', JSON.stringify(state.cart));
    updateCartCounters();
  }
}

function clearCart() {
  state.cart = [];
  localStorage.removeItem('electroflux_cart');
  updateCartCounters();
}

function getCartSubtotal() {
  return state.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

// --- DYNAMIC HOME PAGE ---
async function initHomePage() {
  const gridContainer = document.getElementById('products-grid');
  const categoryContainer = document.getElementById('category-chips');
  const searchInput = document.getElementById('search-input');
  
  if (!gridContainer) return;

  // Launch slideshow rotation on hero image preview
  initHeroSlideshow();

  // Show loading skeletal animation
  gridContainer.innerHTML = Array(4).fill(0).map(() => `
    <div class="glass-panel product-card" style="opacity: 0.6; min-height: 380px;">
      <div style="height: 200px; background: rgba(255,255,255,0.05); border-radius: var(--radius-md);"></div>
      <div style="margin-top: 15px; height: 20px; background: rgba(255,255,255,0.05); width: 60%;"></div>
      <div style="margin-top: 10px; height: 30px; background: rgba(255,255,255,0.05); width: 90%;"></div>
    </div>
  `).join('');

  try {
    const res = await fetch(`${API_BASE}/products`);
    state.products = await res.json();
    
    // Set up Category chips dynamically
    setupCategoryFilters(categoryContainer, gridContainer);
    
    // Initial Render
    renderProducts(state.products, gridContainer);
    
    // Wire up search
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const activeChip = document.querySelector('.filter-chip.active');
        const activeCategory = activeChip ? activeChip.dataset.category : 'all';
        
        let filtered = state.products.filter(p => 
          p.name.toLowerCase().includes(query) || 
          p.description.toLowerCase().includes(query)
        );
        
        if (activeCategory !== 'all') {
          filtered = filtered.filter(p => p.category.toLowerCase() === activeCategory.toLowerCase());
        }
        
        renderProducts(filtered, gridContainer);
      });
    }
  } catch (error) {
    console.error("Failed to load products:", error);
    gridContainer.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--danger)">
        <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 10px;"></i>
        <p>Could not load products. Please make sure the backend server is running.</p>
        <button class="btn btn-secondary" onclick="initHomePage()" style="margin-top: 15px;">Retry</button>
      </div>
    `;
  }
}

// Hero slideshow switcher (4s interval fade & Ken Burns zoom transition)
function initHeroSlideshow() {
  const slides = document.querySelectorAll('.hero-slide');
  if (slides.length === 0) return;

  let currentIdx = 0;
  setInterval(() => {
    slides[currentIdx].classList.remove('active');
    currentIdx = (currentIdx + 1) % slides.length;
    slides[currentIdx].classList.add('active');
  }, 4500); // 4.5 seconds rotation interval
}

function getCategoryIcon(cat) {
  switch (cat.toLowerCase()) {
    case 'all': return 'fa-border-all';
    case 'audio': return 'fa-headphones-simple';
    case 'wearables': return 'fa-clock';
    case 'accessories': return 'fa-keyboard';
    case 'displays': return 'fa-desktop';
    case 'smart home': return 'fa-house-laptop';
    case 'photography': return 'fa-camera';
    default: return 'fa-microchip';
  }
}

function setupCategoryFilters(container, gridContainer) {
  if (!container) return;

  const categories = ['all', ...new Set(state.products.map(p => p.category))];
  
  container.innerHTML = categories.map(cat => {
    const isAll = cat === 'all';
    const displayName = isAll ? 'All Gear' : cat;
    const icon = getCategoryIcon(cat);
    return `
      <div class="category-card glass-panel ${isAll ? 'active' : ''}" data-category="${cat}">
        <div class="category-icon-wrapper">
          <i class="fas ${icon}"></i>
        </div>
        <span class="category-card-name">${displayName}</span>
      </div>
    `;
  }).join('');

  container.addEventListener('click', (e) => {
    const card = e.target.closest('.category-card');
    if (!card) return;

    // Toggle active state
    document.querySelectorAll('.category-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');

    const selectedCat = card.dataset.category;
    const searchVal = document.getElementById('search-input')?.value.toLowerCase() || '';

    let filtered = state.products;

    if (selectedCat !== 'all') {
      filtered = filtered.filter(p => p.category.toLowerCase() === selectedCat.toLowerCase());
    }

    if (searchVal) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchVal) || 
        p.description.toLowerCase().includes(searchVal)
      );
    }

    renderProducts(filtered, gridContainer);
  });
}

function renderProducts(productsList, container) {
  if (productsList.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 60px; color: var(--text-secondary)">
        <i class="fas fa-search" style="font-size: 2.5rem; margin-bottom: 15px; opacity: 0.5;"></i>
        <p>No electronics products matched your criteria.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = productsList.map((product, index) => {
    // Generate stars for rating
    const fullStars = Math.floor(product.rating);
    const halfStar = product.rating % 1 >= 0.5 ? 1 : 0;
    const emptyStars = 5 - fullStars - halfStar;
    
    let starsHTML = '';
    for (let i = 0; i < fullStars; i++) starsHTML += '<i class="fas fa-star"></i>';
    if (halfStar) starsHTML += '<i class="fas fa-star-half-alt"></i>';
    for (let i = 0; i < emptyStars; i++) starsHTML += '<i class="far fa-star"></i>';

    return `
      <div class="glass-panel product-card animate-slide-up" style="animation-delay: ${index * 0.08}s;">
        <span class="card-badge">${product.category}</span>
        <div class="product-image-container">
          <img src="${product.image}" alt="${product.name}" loading="lazy">
        </div>
        <div class="product-info">
          <span class="product-category">${product.category}</span>
          <a href="product.html?id=${product.id}" class="product-name-link">
            <h3 class="product-name" title="${product.name}">${product.name}</h3>
          </a>
          <div class="product-rating">
            ${starsHTML}
            <span class="product-rating-count">(${product.reviewsCount})</span>
          </div>
          <div class="product-bottom">
            <span class="product-price">${formatPrice(product.price)}</span>
            <button class="card-cart-btn" data-id="${product.id}" title="Add to Cart">
              <i class="fas fa-shopping-bag"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Attach cart add events
  container.querySelectorAll('.card-cart-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const pId = btn.dataset.id;
      const targetProduct = state.products.find(p => p.id === pId);
      if (targetProduct) {
        addToCart(targetProduct, 1);
      }
    });
  });
}

// --- DYNAMIC PRODUCT DETAIL PAGE ---
async function initProductDetailPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');
  
  const detailContainer = document.getElementById('product-detail-container');
  if (!detailContainer) return;

  if (!productId) {
    detailContainer.innerHTML = `<p style="text-align:center; color: var(--danger)">No product ID specified in URL.</p>`;
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/products/${productId}`);
    if (!res.ok) throw new Error("Product not found");
    const product = await res.json();
    
    document.title = `${product.name} | ElectroFlux`;

    // Render details
    const fullStars = Math.floor(product.rating);
    const halfStar = product.rating % 1 >= 0.5 ? 1 : 0;
    const emptyStars = 5 - fullStars - halfStar;
    
    let starsHTML = '';
    for (let i = 0; i < fullStars; i++) starsHTML += '<i class="fas fa-star"></i>';
    if (halfStar) starsHTML += '<i class="fas fa-star-half-alt"></i>';
    for (let i = 0; i < emptyStars; i++) starsHTML += '<i class="far fa-star"></i>';

    const stockText = product.stock > 10 ? 'In Stock' : `Only ${product.stock} left in stock`;
    const stockClass = product.stock > 10 ? 'in-stock' : 'low-stock';

    detailContainer.innerHTML = `
      <a href="index.html" class="back-btn">
        <i class="fas fa-arrow-left"></i> Back to Products
      </a>
      <div class="detail-grid">
        <div class="detail-gallery">
          <div class="detail-main-image">
            <img src="${product.image}" alt="${product.name}">
          </div>
        </div>
        
        <div class="detail-meta">
          <span class="detail-category">${product.category}</span>
          <h1 class="detail-title">${product.name}</h1>
          
          <div class="detail-rating-row">
            <div class="product-rating" style="margin-bottom:0;">
              ${starsHTML}
              <span class="product-rating-count">(${product.reviewsCount} customer reviews)</span>
            </div>
            <span class="stock-status ${stockClass}">${stockText}</span>
          </div>
          
          <div class="detail-price">${formatPrice(product.price)}</div>
          <p class="detail-description">${product.description}</p>
          
          <div class="detail-specs-list">
            ${Object.entries(product.specs).map(([lbl, val]) => `
              <div class="spec-item">
                <span class="spec-label">${lbl}</span>
                <span class="spec-value">${val}</span>
              </div>
            `).join('')}
          </div>

          <div class="qty-add-row">
            <div class="qty-selector">
              <button class="qty-btn" id="qty-minus" aria-label="Decrease Quantity">-</button>
              <div class="qty-value" id="qty-count">1</div>
              <button class="qty-btn" id="qty-plus" aria-label="Increase Quantity">+</button>
            </div>
            <button class="btn btn-primary btn-glow detail-add-btn" id="detail-cart-btn">
              <i class="fas fa-shopping-cart"></i> Add to Shopping Cart
            </button>
          </div>

          <div class="detail-features">
            <h2 class="feature-title">Product Highlights</h2>
            <ul class="feature-list">
              ${product.features.map(f => `<li class="feature-item">${f}</li>`).join('')}
            </ul>
          </div>
        </div>
      </div>
    `;

    // Quantity selectors handlers
    const minusBtn = document.getElementById('qty-minus');
    const plusBtn = document.getElementById('qty-plus');
    const qtyVal = document.getElementById('qty-count');
    const addCartBtn = document.getElementById('detail-cart-btn');

    let currentQty = 1;

    minusBtn.addEventListener('click', () => {
      if (currentQty > 1) {
        currentQty--;
        qtyVal.textContent = currentQty;
      }
    });

    plusBtn.addEventListener('click', () => {
      if (currentQty < product.stock) {
        currentQty++;
        qtyVal.textContent = currentQty;
      } else {
        showToast("Maximum available stock reached.", "warning");
      }
    });

    addCartBtn.addEventListener('click', () => {
      addToCart(product, currentQty);
    });

  } catch (error) {
    console.error("Error drawing product details page:", error);
    detailContainer.innerHTML = `
      <div style="text-align: center; padding: 60px;">
        <i class="fas fa-bug" style="font-size: 2.5rem; color: var(--danger); margin-bottom: 20px;"></i>
        <h2>Error Loading Product</h2>
        <p style="color: var(--text-secondary); margin-top: 10px;">${error.message}</p>
        <a href="index.html" class="btn btn-primary" style="margin-top: 20px;">Back to Shop</a>
      </div>
    `;
  }
}

// --- SHOPPING CART PAGE ---
function initCartPage() {
  const itemsContainer = document.getElementById('cart-items');
  const summaryPanel = document.getElementById('cart-summary');
  
  if (!itemsContainer || !summaryPanel) return;

  renderCart();
}

function renderCart() {
  const itemsContainer = document.getElementById('cart-items');
  const summaryPanel = document.getElementById('cart-summary');

  // Update progress stepper to Step 1 (Cart Active)
  const stepCart = document.getElementById('step-cart');
  const stepShipping = document.getElementById('step-shipping');
  const stepComplete = document.getElementById('step-complete');
  const div1 = document.getElementById('step-div-1');
  const div2 = document.getElementById('step-div-2');
  if (stepCart) {
    stepCart.className = 'stepper-step step-active';
    stepShipping.className = 'stepper-step';
    stepComplete.className = 'stepper-step';
    if (div1) div1.className = 'stepper-divider';
    if (div2) div2.className = 'stepper-divider';
  }

  if (state.cart.length === 0) {
    itemsContainer.innerHTML = `
      <div class="empty-cart-view glass-panel">
        <i class="fas fa-shopping-basket empty-cart-icon"></i>
        <h2>Your Cart is Empty</h2>
        <p style="color: var(--text-secondary); margin: 10px 0 30px 0;">Look like you haven't added any electronic gears to your cart yet.</p>
        <a href="index.html" class="btn btn-primary btn-glow">Start Shopping</a>
      </div>
    `;
    summaryPanel.innerHTML = `
      <div class="cart-summary-panel glass-panel">
        <h2 class="summary-title">Summary</h2>
        <div class="summary-row">
          <span>Subtotal</span>
          <span>₹0</span>
        </div>
        <div class="summary-row">
          <span>Shipping (Local)</span>
          <span>₹0</span>
        </div>
        <div class="summary-row summary-total">
          <span>Total</span>
          <span class="summary-total-val">₹0</span>
        </div>
        <button class="btn btn-secondary checkout-btn" disabled>Checkout Locked</button>
      </div>
    `;
    return;
  }

  // Render items
  itemsContainer.innerHTML = state.cart.map(item => `
    <div class="glass-panel cart-item" data-id="${item.id}">
      <div class="cart-item-image">
        <img src="${item.image}" alt="${item.name}">
      </div>
      <div class="cart-item-info">
        <span class="cart-item-cat">${item.category}</span>
        <a href="product.html?id=${item.id}" class="cart-item-name">${item.name}</a>
      </div>
      <div class="cart-item-qty">
        <div class="qty-selector" style="display:inline-flex;">
          <button class="qty-btn item-qty-minus" data-id="${item.id}">-</button>
          <div class="qty-value">${item.quantity}</div>
          <button class="qty-btn item-qty-plus" data-id="${item.id}">+</button>
        </div>
      </div>
      <div class="cart-item-price">${formatPrice(item.price * item.quantity)}</div>
      <button class="icon-btn cart-item-delete" data-id="${item.id}" title="Remove Item" style="color: var(--danger); background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.2);">
        <i class="fas fa-trash-alt"></i>
      </button>
    </div>
  `).join('');

  // Bind item controls
  itemsContainer.querySelectorAll('.item-qty-minus').forEach(btn => {
    btn.addEventListener('click', () => {
      const pId = btn.dataset.id;
      const item = state.cart.find(i => i.id === pId);
      if (item && item.quantity > 1) {
        updateCartQuantity(pId, item.quantity - 1);
        renderCart();
      }
    });
  });

  itemsContainer.querySelectorAll('.item-qty-plus').forEach(btn => {
    btn.addEventListener('click', () => {
      const pId = btn.dataset.id;
      const item = state.cart.find(i => i.id === pId);
      if (item) {
        updateCartQuantity(pId, item.quantity + 1);
        renderCart();
      }
    });
  });

  itemsContainer.querySelectorAll('.cart-item-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const pId = btn.dataset.id;
      removeFromCart(pId);
      renderCart();
    });
  });

  // Calculate pricing
  const subtotal = getCartSubtotal();
  const shipping = subtotal > 10000 ? 0 : 500; // Free shipping over ₹10,000, otherwise ₹500
  const tax = subtotal * 0.18; // 18% GST standard in India
  const grandTotal = subtotal + shipping + tax;

  summaryPanel.innerHTML = `
    <div class="cart-summary-panel glass-panel">
      <h2 class="summary-title">Summary</h2>
      <div class="summary-row">
        <span>Subtotal</span>
        <span>${formatPrice(subtotal)}</span>
      </div>
      <div class="summary-row">
        <span>Shipping (Standard)</span>
        <span>${shipping === 0 ? '<span style="color:var(--success)">FREE</span>' : formatPrice(shipping)}</span>
      </div>
      <div class="summary-row">
        <span>GST (18%)</span>
        <span>${formatPrice(tax)}</span>
      </div>
      <div class="summary-row summary-total">
        <span>Total</span>
        <span class="summary-total-val">${formatPrice(grandTotal)}</span>
      </div>
      <button class="btn btn-primary btn-glow checkout-btn" id="checkout-trigger-btn">
        <i class="fas fa-credit-card"></i> Proceed to Checkout
      </button>
    </div>
  `;

  // Checkout binding
  const checkoutBtn = document.getElementById('checkout-trigger-btn');
  checkoutBtn.addEventListener('click', () => {
    if (!state.user) {
      showToast("Please sign in to complete your checkout process.", "warning");
      setTimeout(() => {
        window.location.href = 'login.html?redirect=cart.html';
      }, 1500);
      return;
    }

    // Scroll to cart items panel
    itemsContainer.scrollIntoView({ behavior: 'smooth' });

    // Update progress stepper to Step 2 (Shipping Active)
    const stepCart = document.getElementById('step-cart');
    const stepShipping = document.getElementById('step-shipping');
    const div1 = document.getElementById('step-div-1');
    if (stepCart) {
      stepCart.className = 'stepper-step step-completed';
      stepShipping.className = 'stepper-step step-active';
      if (div1) div1.className = 'stepper-divider divider-active';
    }

    // Render shipping & payment form on the left panel
    itemsContainer.innerHTML = `
      <div class="glass-panel animate-slide-up" style="padding: 30px; border-radius: var(--radius-lg);">
        <h2 class="auth-title" style="margin-bottom: 24px; font-size: 1.5rem; text-align: left; display: flex; align-items: center; gap: 10px;">
          <i class="fas fa-truck" style="color: var(--primary);"></i> Shipping Details
        </h2>
        <form id="checkout-form" style="display: flex; flex-direction: column; gap: 20px;">
          <div class="form-grid-2">
            <div class="input-group">
              <label class="input-label">Full Name</label>
              <input type="text" id="ship-name" class="input-field" value="${state.user.name}" required>
            </div>
            <div class="input-group">
              <label class="input-label">Mobile Number</label>
              <input type="tel" id="ship-phone" class="input-field" placeholder="10-digit mobile" pattern="[0-9]{10}" required>
            </div>
          </div>
          
          <div class="input-group">
            <label class="input-label">Street Address</label>
            <input type="text" id="ship-address" class="input-field" placeholder="Flat/House no., Floor, Street name" required>
          </div>

          <div class="form-grid-3">
            <div class="input-group">
              <label class="input-label">City</label>
              <input type="text" id="ship-city" class="input-field" placeholder="e.g. Mumbai" required>
            </div>
            <div class="input-group">
              <label class="input-label">State</label>
              <input type="text" id="ship-state" class="input-field" placeholder="e.g. Maharashtra" required>
            </div>
            <div class="input-group">
              <label class="input-label">PIN Code</label>
              <input type="text" id="ship-pin" class="input-field" placeholder="6-digit PIN" pattern="[0-9]{6}" required>
            </div>
          </div>

          <h2 class="auth-title" style="margin-top: 15px; margin-bottom: 20px; font-size: 1.5rem; text-align: left; display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-credit-card" style="color: var(--primary);"></i> Payment Method
          </h2>

          <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 10px;">
            <label class="glass-panel" style="padding: 12px 16px; display: flex; align-items: center; gap: 12px; cursor: pointer; border-radius: var(--radius-sm);">
              <input type="radio" name="payment-method" value="upi" checked style="accent-color: var(--primary);">
              <div>
                <strong style="display:block; font-size: 0.95rem;">UPI (GPay / PhonePe / BHIM)</strong>
                <span style="font-size: 0.75rem; color: var(--text-muted);">Instant transfer using secure UPI ID</span>
              </div>
            </label>

            <label class="glass-panel" style="padding: 12px 16px; display: flex; align-items: center; gap: 12px; cursor: pointer; border-radius: var(--radius-sm);">
              <input type="radio" name="payment-method" value="card" style="accent-color: var(--primary);">
              <div>
                <strong style="display:block; font-size: 0.95rem;">Credit or Debit Card</strong>
                <span style="font-size: 0.75rem; color: var(--text-muted);">Visa, MasterCard, RuPay cards supported</span>
              </div>
            </label>

            <label class="glass-panel" style="padding: 12px 16px; display: flex; align-items: center; gap: 12px; cursor: pointer; border-radius: var(--radius-sm);">
              <input type="radio" name="payment-method" value="cod" style="accent-color: var(--primary);">
              <div>
                <strong style="display:block; font-size: 0.95rem;">Cash on Delivery (COD)</strong>
                <span style="font-size: 0.75rem; color: var(--text-muted);">Pay securely at your doorstep</span>
              </div>
            </label>
          </div>

          <!-- Dynamic payment inputs -->
          <div id="payment-details-fields" style="padding: 20px; border-radius: var(--radius-md); background: rgba(255,255,255,0.01); border: 1px solid var(--border-light);">
            <!-- UPI Option Field -->
            <div id="payment-upi-group" class="input-group">
              <label class="input-label">UPI ID / VPA</label>
              <input type="text" id="payment-upi-id" class="input-field" placeholder="mobile@ybl or name@oksbi" required>
            </div>

            <!-- Card Option Fields -->
            <div id="payment-card-group" style="display: none; flex-direction: column; gap: 16px;">
              <div class="input-group">
                <label class="input-label">Cardholder Name</label>
                <input type="text" id="card-name" class="input-field" placeholder="Name written on card">
              </div>
              <div class="input-group">
                <label class="input-label">Card Number</label>
                <input type="text" id="card-number" class="input-field" placeholder="16-digit card number" pattern="[0-9]{16}">
              </div>
              <div class="form-grid-2">
                <div class="input-group">
                  <label class="input-label">Expiry Date</label>
                  <input type="text" id="card-expiry" class="input-field" placeholder="MM/YY">
                </div>
                <div class="input-group">
                  <label class="input-label">CVV</label>
                  <input type="password" id="card-cvv" class="input-field" placeholder="•••" pattern="[0-9]{3}">
                </div>
              </div>
            </div>

            <!-- COD Option Field -->
            <div id="payment-cod-group" style="display: none; color: var(--text-secondary); font-size: 0.9rem; line-height: 1.5;">
              <i class="fas fa-info-circle" style="color: var(--primary); margin-right: 6px;"></i> Place your order now. You can pay via cash or UPI QR scan when our delivery executive arrives.
            </div>
          </div>

          <div style="display: flex; gap: 16px; margin-top: 10px;">
            <button type="button" class="btn btn-secondary" id="checkout-cancel-btn" style="flex:1;">Back to Cart</button>
            <button type="submit" class="btn btn-primary btn-glow" id="checkout-submit-btn" style="flex:1.5;">Place Secure Order</button>
          </div>
        </form>
      </div>
    `;

    // Payment method toggles
    const pmRadios = document.querySelectorAll('input[name="payment-method"]');
    const upiGroup = document.getElementById('payment-upi-group');
    const cardGroup = document.getElementById('payment-card-group');
    const codGroup = document.getElementById('payment-cod-group');

    const upiIdInput = document.getElementById('payment-upi-id');
    const cardNameInput = document.getElementById('card-name');
    const cardNumberInput = document.getElementById('card-number');
    const cardExpiryInput = document.getElementById('card-expiry');
    const cardCvvInput = document.getElementById('card-cvv');

    pmRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === 'upi') {
          upiGroup.style.display = 'flex';
          cardGroup.style.display = 'none';
          codGroup.style.display = 'none';
          upiIdInput.required = true;
          cardNameInput.required = false;
          cardNumberInput.required = false;
          cardExpiryInput.required = false;
          cardCvvInput.required = false;
        } else if (val === 'card') {
          upiGroup.style.display = 'none';
          cardGroup.style.display = 'flex';
          codGroup.style.display = 'none';
          upiIdInput.required = false;
          cardNameInput.required = true;
          cardNumberInput.required = true;
          cardExpiryInput.required = true;
          cardCvvInput.required = true;
        } else if (val === 'cod') {
          upiGroup.style.display = 'none';
          cardGroup.style.display = 'none';
          codGroup.style.display = 'flex';
          upiIdInput.required = false;
          cardNameInput.required = false;
          cardNumberInput.required = false;
          cardExpiryInput.required = false;
          cardCvvInput.required = false;
        }
      });
    });

    // Back to cart click
    document.getElementById('checkout-cancel-btn').addEventListener('click', () => {
      renderCart();
    });

    // Checkout submission
    const form = document.getElementById('checkout-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('ship-name').value;
      const phone = document.getElementById('ship-phone').value;
      const address = document.getElementById('ship-address').value;
      const city = document.getElementById('ship-city').value;
      const stateVal = document.getElementById('ship-state').value;
      const pin = document.getElementById('ship-pin').value;
      
      const pMethod = document.querySelector('input[name="payment-method"]:checked').value;
      let methodText = '';
      if (pMethod === 'upi') {
        methodText = `UPI ID: ${upiIdInput.value}`;
      } else if (pMethod === 'card') {
        const lastFour = cardNumberInput.value.slice(-4) || 'XXXX';
        methodText = `Credit Card (ending in ${lastFour})`;
      } else {
        methodText = 'Cash on Delivery (COD)';
      }

      const submitBtn = document.getElementById('checkout-submit-btn');
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> Authorizing Gateway...`;

      setTimeout(() => {
        submitBtn.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> Securing Order Details...`;
        
        setTimeout(() => {
          showToast("Payment Successful!", "success");

          // Calculate delivery date (3 days from now)
          const deliveryDate = new Date();
          deliveryDate.setDate(deliveryDate.getDate() + 3);
          const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
          const deliveryDateString = deliveryDate.toLocaleDateString('en-IN', dateOptions);

          // Create persistent order
          const orderId = `FLUX-${Math.floor(Math.random() * 900000 + 100000)}`;
          const subtotal = getCartSubtotal();
          const shipping = subtotal > 10000 ? 0 : 500;
          const tax = subtotal * 0.18;
          const grandTotal = subtotal + shipping + tax;
          
          const newOrder = {
            id: orderId,
            date: new Date().toISOString(),
            status: 'In Transit',
            items: JSON.parse(JSON.stringify(state.cart)),
            shippingDetails: { name, phone, address, city, state: stateVal, pin },
            paymentDetails: { method: pMethod, methodText: methodText },
            pricing: { subtotal, shipping, tax, total: grandTotal },
            deliveryDate: deliveryDate.toISOString(),
            userEmail: state.user ? state.user.email : 'guest',
            userId: state.user ? state.user.id : 'guest'
          };
          
          // Write order to server database API
          fetch(`${API_BASE}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newOrder)
          }).then(res => {
            if (!res.ok) console.error("Failed to post order to server database");
          }).catch(err => console.error("Error creating server order:", err));

          // Clear cart
          clearCart();

          // Update progress stepper to Step 3 (Completed)
          const stepShipping = document.getElementById('step-shipping');
          const stepComplete = document.getElementById('step-complete');
          const div2 = document.getElementById('step-div-2');
          if (stepShipping) {
            stepShipping.className = 'stepper-step step-completed';
            stepComplete.className = 'stepper-step step-completed';
            if (div2) div2.className = 'stepper-divider divider-completed';
          }

          // Render Success Panel
          itemsContainer.innerHTML = `
            <div class="empty-cart-view glass-panel animate-slide-up" style="border-color: var(--success); padding: 40px; text-align: left;">
              <div style="text-align: center; margin-bottom: 24px;">
                <i class="fas fa-check-circle" style="font-size: 4.5rem; color: var(--success); margin-bottom: 16px;"></i>
                <h2 style="font-family: var(--font-heading); font-size: 2rem;">Order Placed Successfully!</h2>
                <p style="color: var(--text-secondary); margin-top: 6px;">Thank you for shopping at ElectroFlux.</p>
              </div>

              <div style="border-top: 1px solid var(--border-light); padding-top: 20px; margin-top: 20px; display: flex; flex-direction: column; gap: 16px;">
                <div>
                  <strong style="color: var(--primary); text-transform: uppercase; font-size: 0.8rem; letter-spacing: 1px; display: block; margin-bottom: 4px;">Shipping Address</strong>
                  <div style="font-size: 0.95rem; line-height: 1.5; color: var(--text-primary);">
                    ${name}<br>
                    ${address}<br>
                    ${city}, ${stateVal} - ${pin}<br>
                    Phone: +91 ${phone}
                  </div>
                </div>

                <div>
                  <strong style="color: var(--primary); text-transform: uppercase; font-size: 0.8rem; letter-spacing: 1px; display: block; margin-bottom: 4px;">Payment Summary</strong>
                  <div style="font-size: 0.95rem; color: var(--text-primary);">
                    Method: ${methodText}
                  </div>
                </div>

                <div style="background: rgba(59, 130, 246, 0.03); border: 1px dashed rgba(59, 130, 246, 0.2); padding: 15px; border-radius: var(--radius-sm); display: flex; align-items: center; gap: 12px;">
                  <i class="fas fa-truck-fast" style="color: var(--primary); font-size: 1.3rem;"></i>
                  <div>
                    <strong style="font-size: 0.9rem; display:block;">Guaranteed Delivery Date</strong>
                    <span style="font-size: 0.85rem; color: var(--text-secondary);">${deliveryDateString}</span>
                  </div>
                </div>

                <!-- Simulated Delivery QR Scanner Card -->
                <div class="glass-panel" style="padding: 20px; border-radius: var(--radius-md); background: rgba(59, 130, 246, 0.01); border: 1px solid var(--border-light); display: flex; flex-direction: column; gap: 16px; margin-top: 10px;" id="delivery-tracking-card">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                      <strong style="color: var(--primary); text-transform: uppercase; font-size: 0.72rem; letter-spacing: 1px; display: block; margin-bottom: 2px;">Delivery Status</strong>
                      <span style="font-size: 0.95rem; font-weight: 700; color: #fbbf24;" id="tracking-status">
                        <i class="fas fa-shipping-fast fa-spin" style="margin-right: 6px;"></i> In Transit (Out for Delivery)
                      </span>
                    </div>
                    <span class="glass-panel" style="padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight:700; color: var(--primary);">Track #${orderId}</span>
                  </div>
                  
                  <div style="position: relative; height: 6px; background: rgba(255, 255, 255, 0.05); border-radius: 3px; margin: 4px 0;">
                    <div style="position: absolute; left: 0; top: 0; height: 100%; width: 75%; background: linear-gradient(90deg, var(--primary), var(--secondary)); border-radius: 3px;" id="tracking-bar"></div>
                  </div>

                  <div style="display: flex; flex-direction: row; gap: 20px; align-items: center; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 200px;">
                      <div style="font-size: 0.82rem; color: var(--text-secondary); line-height: 1.45; margin-bottom: 12px;">
                        The delivery courier has arrived. Scan the delivery confirmation QR code on the package label to acknowledge receipt and digitally sign.
                      </div>
                      <button type="button" class="btn btn-primary btn-glow animate-pulse" id="start-scan-btn" style="height: 42px; font-size: 0.9rem; width: 100%;">
                        <i class="fas fa-qrcode"></i> Scan QR to Confirm Delivery
                      </button>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; background: #ffffff; padding: 10px; border-radius: var(--radius-sm);">
                      <img src="https://api.qrserver.com/v1/create-qr-code/?size=110x110&color=0d1117&data=USER:${state.user ? state.user.id : 'guest'}|ORDER:${orderId}" alt="Package QR Code" style="width: 110px; height: 110px; display: block;">
                      <span style="font-size: 0.65rem; color: #0d1117; font-weight: 700; font-family: monospace;">QR: USER:${state.user ? state.user.id : 'guest'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div style="text-align: center; margin-top: 30px;">
                <a href="index.html" class="btn btn-primary btn-glow">Continue Shopping</a>
              </div>
            </div>
          `;

          // Bind scanner actions to the dynamically injected scanner button
          bindScannerActions(name, orderId);

          // Clear summary panel
          summaryPanel.innerHTML = `
            <div class="cart-summary-panel glass-panel">
              <h2 class="summary-title">Summary</h2>
              <div class="summary-row">
                <span>Subtotal</span>
                <span>₹0</span>
              </div>
              <div class="summary-row summary-total">
                <span>Total</span>
                <span class="summary-total-val">₹0</span>
              </div>
              <button class="btn btn-secondary checkout-btn" disabled>Checkout Completed</button>
            </div>
          `;

          updateCartCounters();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 1200);
      }, 1500);
    });
  });
}

// --- DYNAMIC AUTHENTICATION CARD ---
function initAuthPage() {
  const tabLogin = document.getElementById('tab-login');
  const tabSignup = document.getElementById('tab-signup');
  const formLogin = document.getElementById('form-login');
  const formSignup = document.getElementById('form-signup');
  
  if (!tabLogin || !formLogin) return;

  // Swapping tabs handler
  tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabSignup.classList.remove('active');
    formLogin.classList.add('active');
    formSignup.classList.remove('active');
    clearAlerts();
  });

  tabSignup.addEventListener('click', () => {
    tabSignup.classList.add('active');
    tabLogin.classList.remove('active');
    formSignup.classList.add('active');
    formLogin.classList.remove('active');
    clearAlerts();
  });

  // Login execution
  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlerts();

    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    const btn = formLogin.querySelector('button[type="submit"]');
    const alertBox = document.getElementById('login-alert');

    if (!email || !pass) {
      showAlert(alertBox, "Please fill in all details.", "error");
      return;
    }

    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Authenticating...`;

    const result = await login(email, pass);
    
    if (result.success) {
      showAlert(alertBox, "Login successful! Redirecting...", "success");
      // Check query parameter redirect
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get('redirect') || 'index.html';
      setTimeout(() => {
        window.location.href = redirect;
      }, 1200);
    } else {
      btn.disabled = false;
      btn.textContent = "Sign In";
      showAlert(alertBox, result.error || "Credentials invalid. Try again.", "error");
    }
  });

  // Signup execution
  formSignup.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlerts();

    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const pass = document.getElementById('signup-password').value;
    const confirmPass = document.getElementById('signup-confirm-password').value;
    const btn = formSignup.querySelector('button[type="submit"]');
    const alertBox = document.getElementById('signup-alert');

    if (!name || !email || !pass || !confirmPass) {
      showAlert(alertBox, "Please fill in all details.", "error");
      return;
    }

    if (pass.length < 6) {
      showAlert(alertBox, "Password must be at least 6 characters.", "error");
      return;
    }

    if (pass !== confirmPass) {
      showAlert(alertBox, "Passwords do not match.", "error");
      return;
    }

    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Registering Account...`;

    const result = await register(name, email, pass);

    if (result.success) {
      showAlert(alertBox, "Account created! Logging in...", "success");
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get('redirect') || 'index.html';
      setTimeout(() => {
        window.location.href = redirect;
      }, 1200);
    } else {
      btn.disabled = false;
      btn.textContent = "Create Account";
      showAlert(alertBox, result.error || "Signup failed. Try again.", "error");
    }
  });
}

function showAlert(el, msg, type) {
  if (!el) return;
  el.textContent = msg;
  el.className = `form-alert alert-${type}`;
}

function clearAlerts() {
  document.querySelectorAll('.form-alert').forEach(el => {
    el.style.display = 'none';
  });
}

// --- UTILITIES: TOAST NOTIFICATIONS ---
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

  // Automatically remove toast after 3.5 seconds
  setTimeout(() => {
    toast.style.transform = 'translateX(120%)';
    setTimeout(() => {
      toast.remove();
    }, 400);
  }, 3500);
}

// --- DELIVERY QR SCANNER SIMULATOR & DIGITAL ACKNOWLEDGMENT ---
function playBeep() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime); // 1000Hz beep frequency
    gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime); // Sound volume
    
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.12); // Stop oscillator after 120ms
  } catch (err) {
    console.warn("AudioContext not allowed or supported by browser settings:", err);
  }
}

function playErrorBeep() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(150, audioCtx.currentTime); // low buzz
    gainNode.gain.setValueAtTime(0.18, audioCtx.currentTime);
    
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.3); // 300ms buzz
  } catch (err) {
    console.warn("AudioContext warning:", err);
  }
}

function loadScannerLibrary(callback) {
  if (window.Html5Qrcode) {
    callback(true);
    return;
  }
  const script = document.createElement('script');
  script.src = 'https://unpkg.com/html5-qrcode';
  script.onload = () => callback(true);
  script.onerror = () => {
    console.error("Failed to load html5-qrcode library from CDN.");
    callback(false);
  };
  document.head.appendChild(script);
}

function bindScannerActions(name, orderId = null) {
  const startScanBtn = document.getElementById('start-scan-btn');
  if (!startScanBtn) return;

  startScanBtn.addEventListener('click', () => {
    const scannerModal = document.createElement('div');
    scannerModal.id = 'scanner-modal';
    scannerModal.style.cssText = 'position: fixed; inset: 0; z-index: 9999; display: flex; align-items: center; justify-content: center; background: rgba(13, 17, 23, 0.95); backdrop-filter: blur(16px); padding: 24px; animation: popIn 0.3s ease;';
    
    const userId = state.user ? state.user.id : 'guest';
    const userEmail = state.user ? state.user.email : 'guest';
    const correctCode = `USER:${userId}|ORDER:${orderId}`;
    let html5QrCode = null;

    scannerModal.innerHTML = `
      <div class="glass-panel scanner-modal-content" style="width: 100%; max-width: 440px; padding: 24px; position: relative; border-radius: var(--radius-lg); text-align: center; border: 1px solid var(--border-light); box-shadow: var(--glass-shadow); display: flex; flex-direction: column; gap: 14px; max-height: 90vh; overflow-y: auto;">
        <div>
          <h3 style="font-family: var(--font-heading); font-size: 1.4rem; margin-bottom: 4px; color: var(--primary);">Package QR Verification</h3>
          <p style="font-size: 0.8rem; color: var(--text-secondary);">Verify delivery details by scanning the package box QR code label.</p>
        </div>
        
        <!-- Camera Controls -->
        <div id="camera-controls-row" style="display: none; flex-direction: column; gap: 6px; text-align: left;">
          <label style="font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); display: flex; justify-content: space-between;">
            <span>Select Active Camera</span>
            <span id="camera-status" style="color: var(--success);"><i class="fas fa-circle" style="font-size: 0.5rem; margin-right: 4px;"></i> Streaming</span>
          </label>
          <select id="camera-select" class="input-field" style="font-size: 0.8rem; height: 36px; padding: 0 10px; border-color: rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: var(--text-primary);"></select>
        </div>

        <div style="position: relative; width: 220px; height: 220px; margin: 0 auto; border-radius: var(--radius-md); border: 2px solid var(--primary); background: #0b0f1a; overflow: hidden; box-shadow: 0 0 20px rgba(59, 130, 246, 0.2);">
          <!-- corners decoration -->
          <div style="position: absolute; top: 12px; left: 12px; width: 18px; height: 18px; border-top: 3px solid var(--primary); border-left: 3px solid var(--primary); z-index: 10;"></div>
          <div style="position: absolute; top: 12px; right: 12px; width: 18px; height: 18px; border-top: 3px solid var(--primary); border-right: 3px solid var(--primary); z-index: 10;"></div>
          <div style="position: absolute; bottom: 12px; left: 12px; width: 18px; height: 18px; border-bottom: 3px solid var(--primary); border-left: 3px solid var(--primary); z-index: 10;"></div>
          <div style="position: absolute; bottom: 12px; right: 12px; width: 18px; height: 18px; border-bottom: 3px solid var(--primary); border-right: 3px solid var(--primary); z-index: 10;"></div>

          <!-- scanning laser line -->
          <div id="laser-line" style="position: absolute; width: 100%; height: 2px; background: var(--secondary); top: 0; left: 0; box-shadow: 0 0 8px var(--secondary); animation: laserScan 2.5s infinite linear; z-index: 9;"></div>

          <!-- Reader box where stream will be inserted -->
          <div id="reader" style="width: 100%; height: 100%;">
            <div id="reader-placeholder" style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 5;">
              <i class="fas fa-qrcode" style="font-size: 4.5rem; color: var(--text-secondary); opacity: 0.35;"></i>
              <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 10px; padding: 0 10px;" id="scanner-status-text">Initialising scanner camera...</div>
            </div>
          </div>
        </div>

        <div style="text-align: left; display: flex; flex-direction: column; gap: 6px;">
          <label style="font-size: 0.78rem; font-weight: 700; color: var(--text-secondary);">Scanned QR Label Data</label>
          <input type="text" id="qr-input-field" class="input-field" placeholder="Scan result code string" style="font-family: monospace; font-size: 0.85rem; text-align: center; text-transform: uppercase; border-color: rgba(255,255,255,0.15);" autofocus>
        </div>

        <div id="scanner-alert" style="display: none; padding: 8px 12px; border-radius: var(--radius-sm); font-size: 0.75rem; text-align: left; line-height: 1.4;"></div>

        <!-- Simulation Section -->
        <div style="padding: 10px; border-radius: var(--radius-md); background: rgba(255,255,255,0.02); border: 1px dashed var(--border-light); text-align: left;">
          <span style="font-size: 0.68rem; color: var(--text-muted); display: block; margin-bottom: 6px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Simulate Package Barcode Labels</span>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
            <button type="button" class="btn btn-secondary" id="sim-correct-btn" style="padding: 5px; font-size: 0.7rem; height: auto; text-align: center; border-color: rgba(34, 197, 94, 0.3); color: #22c55e;">
              <i class="fas fa-check-circle" style="margin-right: 4px;"></i> Correct QR
            </button>
            <button type="button" class="btn btn-secondary" id="sim-wrong-user-btn" style="padding: 5px; font-size: 0.7rem; height: auto; text-align: center; border-color: rgba(239, 68, 68, 0.3); color: #ef4444;">
              <i class="fas fa-user-slash" style="margin-right: 4px;"></i> Wrong User
            </button>
            <button type="button" class="btn btn-secondary" id="sim-wrong-order-btn" style="padding: 5px; font-size: 0.7rem; height: auto; text-align: center; border-color: rgba(239, 68, 68, 0.3); color: #ef4444;">
              <i class="fas fa-receipt" style="margin-right: 4px;"></i> Wrong Order
            </button>
            <button type="button" class="btn btn-secondary" id="sim-invalid-format-btn" style="padding: 5px; font-size: 0.7rem; height: auto; text-align: center;">
              <i class="fas fa-ban" style="margin-right: 4px;"></i> Garbage Text
            </button>
          </div>
        </div>

        <div style="display: flex; gap: 12px; margin-top: 4px;">
          <button type="button" class="btn btn-secondary" id="close-scanner-btn" style="flex:1; height: 38px; font-size: 0.85rem;">Cancel</button>
          <button type="button" class="btn btn-primary btn-glow" id="simulate-scan-btn" style="flex:1.5; height: 38px; font-size: 0.85rem;">Verify QR Code</button>
        </div>
      </div>
      
      <style>
        @keyframes laserScan {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
      </style>
    `;

    document.body.appendChild(scannerModal);

    const inputField = document.getElementById('qr-input-field');
    const alertBox = document.getElementById('scanner-alert');
    const statusText = document.getElementById('scanner-status-text');
    const simulateBtn = document.getElementById('simulate-scan-btn');
    const laserLine = document.getElementById('laser-line');

    inputField.focus();

    const clearAlert = () => {
      alertBox.style.display = 'none';
      alertBox.className = '';
    };

    const showAlertMessage = (msg, isSuccess) => {
      alertBox.style.display = 'block';
      alertBox.textContent = msg;
      alertBox.style.background = isSuccess ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)';
      alertBox.style.border = isSuccess ? '1px solid rgba(34, 197, 94, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)';
      alertBox.style.color = isSuccess ? '#4ade80' : '#f87171';
    };

    const cleanupCamera = async () => {
      if (html5QrCode) {
        try {
          if (html5QrCode.isScanning) {
            await html5QrCode.stop();
          }
        } catch (e) {
          console.warn("Error stopping scanner:", e);
        }
        html5QrCode = null;
      }
    };

    document.getElementById('close-scanner-btn').addEventListener('click', async () => {
      await cleanupCamera();
      scannerModal.remove();
    });

    loadScannerLibrary(async (success) => {
      if (!success || !window.Html5Qrcode) {
        statusText.innerHTML = "Camera active. Ready to Scan (Simulation mode).";
        return;
      }

      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          const controlsRow = document.getElementById('camera-controls-row');
          const selectField = document.getElementById('camera-select');
          controlsRow.style.display = 'flex';
          
          selectField.innerHTML = devices.map((d, idx) => {
            const label = d.label || `Camera ${idx + 1}`;
            return `<option value="${d.id}">${label}</option>`;
          }).join('');

          let selectedCameraId = devices[0].id;
          const backCam = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment'));
          if (backCam) {
            selectedCameraId = backCam.id;
            selectField.value = backCam.id;
          }

          html5QrCode = new Html5Qrcode("reader");

          const startScanning = async (camId) => {
            try {
              const placeholder = document.getElementById('reader-placeholder');
              if (placeholder) placeholder.style.display = 'none';

              await html5QrCode.start(
                camId,
                {
                  fps: 10,
                  qrbox: (w, h) => {
                    const boxSize = Math.min(180, w - 20);
                    return { width: boxSize, height: boxSize };
                  }
                },
                async (decodedText) => {
                  playBeep();
                  inputField.value = decodedText;
                  await cleanupCamera();
                  triggerVerify(decodedText);
                },
                (err) => {
                  // Silent scan error
                }
              );

              document.getElementById('camera-status').innerHTML = `<i class="fas fa-circle" style="font-size: 0.5rem; margin-right: 4px;"></i> Streaming`;
              document.getElementById('camera-status').style.color = 'var(--success)';
            } catch (err) {
              console.error("Scanner failed to start:", err);
              const placeholder = document.getElementById('reader-placeholder');
              if (placeholder) placeholder.style.display = 'flex';
              statusText.innerHTML = "Camera blocked or busy. Use simulator below.";
              document.getElementById('camera-status').innerHTML = `<i class="fas fa-exclamation-triangle" style="margin-right: 4px;"></i> Inactive`;
              document.getElementById('camera-status').style.color = 'var(--danger)';
            }
          };

          await startScanning(selectedCameraId);

          selectField.addEventListener('change', async (e) => {
            await cleanupCamera();
            html5QrCode = new Html5Qrcode("reader");
            await startScanning(e.target.value);
          });
        } else {
          statusText.innerHTML = "No cameras detected. Using simulation fallback.";
        }
      } catch (err) {
        console.warn("Unable to get cameras:", err);
        statusText.innerHTML = "Camera permission denied or unsupported. Using simulator.";
      }
    });

    document.getElementById('sim-correct-btn').addEventListener('click', () => {
      clearAlert();
      inputField.value = correctCode;
      statusText.innerHTML = "QR Loaded. Press 'Verify QR Code' to scan.";
    });

    document.getElementById('sim-wrong-user-btn').addEventListener('click', () => {
      clearAlert();
      inputField.value = `USER:999|ORDER:${orderId}`;
      statusText.innerHTML = "QR Loaded. Press 'Verify QR Code' to scan.";
    });

    document.getElementById('sim-wrong-order-btn').addEventListener('click', () => {
      clearAlert();
      inputField.value = `USER:${userId}|ORDER:FLUX-999999`;
      statusText.innerHTML = "QR Loaded. Press 'Verify QR Code' to scan.";
    });

    document.getElementById('sim-invalid-format-btn').addEventListener('click', () => {
      clearAlert();
      inputField.value = "INVALID_PACKAGE_TAG_XZ889";
      statusText.innerHTML = "QR Loaded. Press 'Verify QR Code' to scan.";
    });

    const triggerVerify = (explicitData = null) => {
      const qrData = explicitData || inputField.value.trim();
      if (!qrData) {
        showAlertMessage("Please enter or simulate a QR code first.", false);
        playErrorBeep();
        return;
      }

      simulateBtn.disabled = true;
      statusText.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> Reading QR code matrix...`;
      clearAlert();

      setTimeout(async () => {
        const match = qrData.match(/^USER:(.*?)\|ORDER:(.*)$/i);
        
        if (!match) {
          playErrorBeep();
          statusText.innerHTML = `<span style="color: var(--danger); font-weight:700;"><i class="fas fa-times-circle"></i> Decoding Failed</span>`;
          showAlertMessage("INVALID FORMAT: The scanned code structure is invalid. Expected USER:id|ORDER:id", false);
          simulateBtn.disabled = false;
          return;
        }

        const scannedUser = match[1].toLowerCase();
        const scannedOrder = match[2].toLowerCase();

        const matchesUser = (scannedUser === userId.toString().toLowerCase() || scannedUser === userEmail.toLowerCase());
        const matchesOrder = (scannedOrder === orderId.toLowerCase());

        if (matchesUser && matchesOrder) {
          playBeep();
          statusText.innerHTML = `<span style="color: var(--success); font-weight:700;"><i class="fas fa-check-circle"></i> Match Confirmed!</span>`;
          showAlertMessage("MATCH SUCCESSFUL: User ID and Order ID verified for this delivery.", true);
          laserLine.style.animation = 'none';
          laserLine.style.background = 'var(--success)';
          laserLine.style.boxShadow = '0 0 8px var(--success)';

          await cleanupCamera();

          setTimeout(() => {
            scannerModal.remove();
            showToast("Delivery Verified & Cryptographically Signed!", "success");

            const sigCode = `SIG-SHA256-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
            const ackTime = new Date().toISOString();

            if (orderId) {
              fetch(`${API_BASE}/orders/${orderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  status: 'Delivered',
                  signatureCode: sigCode,
                  arrivalTime: ackTime
                })
              }).then(res => {
                if (!res.ok) console.error("Failed to update order status on server database");
              }).catch(err => console.error("Error patching order status:", err));
            }

            const trackingCard = document.getElementById('delivery-tracking-card');
            if (trackingCard) {
              trackingCard.outerHTML = `
                <div class="glass-panel animate-slide-up" style="padding: 24px; border-radius: var(--radius-lg); background: rgba(34, 197, 94, 0.02); border: 1px solid var(--success); display: flex; flex-direction: column; gap: 16px; margin-top: 20px;">
                  <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 48px; height: 48px; border-radius: 50%; background: rgba(34, 197, 94, 0.1); border: 1px solid var(--success); display:flex; align-items:center; justify-content:center; color: var(--success); font-size:1.4rem;">
                      <i class="fas fa-clipboard-check"></i>
                    </div>
                    <div>
                      <h3 style="font-family: var(--font-heading); font-size: 1.25rem; margin: 0; color: var(--success); font-weight: 700;">Delivery Acknowledged</h3>
                      <span style="font-size: 0.78rem; color: var(--text-muted);">Verified Digital Receipt Cryptographic Seal</span>
                    </div>
                  </div>
                  
                  <div style="border-top: 1px solid var(--border-light); padding-top: 16px; font-size: 0.85rem; line-height: 1.6; color: var(--text-secondary); display: flex; flex-direction: column; gap: 8px;">
                    <div><strong>Receiver Name:</strong> ${name}</div>
                    <div><strong>Delivery Courier:</strong> Raj Kumar (Agent #9021)</div>
                    <div><strong>Order Status:</strong> <span style="color: var(--success); font-weight: 700;">Arrived & Verified</span></div>
                    <div><strong>Receipt Acknowledged:</strong> ${new Date(ackTime).toLocaleString('en-IN')}</div>
                    <div><strong>Security Code:</strong> <span style="font-family: monospace; color: var(--primary);">${sigCode}</span></div>
                  </div>

                  <div style="background: #0b0f1a; padding: 15px; border-radius: var(--radius-sm); border: 1px solid var(--border-light); text-align: center; position: relative;">
                    <span style="font-size: 0.72rem; color: var(--text-muted); display: block; margin-bottom: 6px; text-transform:uppercase; letter-spacing:0.5px;">Receiver's Digital Seal</span>
                    <span style="font-family: 'Outfit', sans-serif; font-size: 1.5rem; color: var(--primary); font-style: italic; font-weight: 500; letter-spacing: 0.5px;">${name}</span>
                    <div style="width: 80px; height: 1px; background: rgba(59, 130, 246, 0.4); margin: 8px auto 0 auto;"></div>
                  </div>
                </div>
              `;
            }

            const deliveryContainer = document.getElementById('delivery-content');
            if (deliveryContainer) {
              initDeliveryPage();
            }
          }, 1200);
        } else {
          playErrorBeep();
          statusText.innerHTML = `<span style="color: var(--danger); font-weight:700;"><i class="fas fa-exclamation-triangle"></i> Verification Failed</span>`;
          simulateBtn.disabled = false;
          
          let mismatchReason = "Verification Failed: ";
          if (!matchesUser && !matchesOrder) {
            mismatchReason += "User ID and Order ID mismatch.";
          } else if (!matchesUser) {
            mismatchReason += "User ID mismatch. Package belongs to another customer.";
          } else {
            mismatchReason += "Order ID mismatch. Package corresponds to a different order.";
          }
          showAlertMessage(mismatchReason, false);
        }
      }, 1000);
    };

    simulateBtn.addEventListener('click', () => triggerVerify());
    inputField.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        triggerVerify();
      }
    });
  });
}

// --- DYNAMIC ORDER TRACKING & QR ACKNOWLEDGMENT PAGE ---
let deliveryPollingInterval = null;

function playDoorbellSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const playChime = (freq, delay, duration) => {
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
      
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime + delay);
      gainNode.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + delay + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + delay + duration);
      
      oscillator.start(audioCtx.currentTime + delay);
      oscillator.stop(audioCtx.currentTime + delay + duration);
    };
    
    // Ding-Dong sound effect
    playChime(587.33, 0, 0.8); // Ding (D5)
    playChime(440.00, 0.35, 1.2); // Dong (A4)
  } catch (err) {
    console.warn("Could not play doorbell sound:", err);
  }
}

function startDeliveryPolling() {
  if (deliveryPollingInterval) return;
  
  deliveryPollingInterval = setInterval(() => {
    if (!state.user) {
      clearInterval(deliveryPollingInterval);
      deliveryPollingInterval = null;
      return;
    }
    
    fetch(`${API_BASE}/orders?email=${encodeURIComponent(state.user.email)}`)
      .then(res => {
        if (!res.ok) throw new Error("Sync poll error");
        return res.json();
      })
      .then(newOrders => {
        let statusChanged = false;
        
        newOrders.forEach(newO => {
          const oldO = state.orders.find(o => o.id === newO.id);
          if (oldO && oldO.status !== newO.status) {
            statusChanged = true;
            if (oldO.status === 'In Transit' && newO.status === 'Arrived') {
              playDoorbellSound();
              showToast(`🔔 Agent Arrived! Delivery executive is outside for Order #${newO.id}!`, "success");
            } else if (oldO.status === 'Arrived' && newO.status === 'Delivered') {
              showToast(`✅ Delivery Verified & Completed for Order #${newO.id}!`, "success");
            }
          }
        });
        
        if (statusChanged) {
          state.orders = newOrders;
          state.orders.sort((a, b) => new Date(b.date) - new Date(a.date));
          
          const container = document.getElementById('delivery-content');
          if (container) {
            renderOrdersList(container, state.orders);
          }
          
          const hasActive = state.orders.some(o => o.status === 'In Transit' || o.status === 'Arrived');
          if (!hasActive) {
            clearInterval(deliveryPollingInterval);
            deliveryPollingInterval = null;
          }
        }
      })
      .catch(err => console.warn("Failed to check delivery status:", err));
  }, 5000);
}

function initDeliveryPage() {
  const container = document.getElementById('delivery-content');
  if (!container) return;

  if (deliveryPollingInterval) {
    clearInterval(deliveryPollingInterval);
    deliveryPollingInterval = null;
  }

  if (!state.user) {
    container.innerHTML = `
      <div class="empty-cart-view glass-panel animate-slide-up" style="max-width: 600px; margin: 40px auto; padding: 50px 30px;">
        <i class="fas fa-lock empty-cart-icon" style="color: var(--warning);"></i>
        <h2>Sign In Required</h2>
        <p style="color: var(--text-secondary); margin: 12px 0 24px 0;">Please sign in to view your orders and verify package arrivals.</p>
        <a href="login.html?redirect=delivery.html" class="btn btn-primary btn-glow">Sign In Now</a>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="text-align: center; padding: 80px 0;">
      <i class="fas fa-circle-notch fa-spin" style="font-size: 2.5rem; color: var(--primary); margin-bottom: 20px;"></i>
      <p style="color: var(--text-secondary);">Loading your deliveries...</p>
    </div>
  `;

  fetch(`${API_BASE}/orders?email=${encodeURIComponent(state.user.email)}`)
    .then(res => {
      if (!res.ok) throw new Error("Could not fetch orders from server");
      return res.json();
    })
    .then(userOrders => {
      userOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
      state.orders = userOrders;

      if (userOrders.length === 0) {
        container.innerHTML = `
          <div class="empty-cart-view glass-panel animate-slide-up" style="max-width: 600px; margin: 40px auto; padding: 50px 30px;">
            <i class="fas fa-truck-fast empty-cart-icon" style="opacity: 0.4;"></i>
            <h2>No Scheduled Deliveries</h2>
            <p style="color: var(--text-secondary); margin: 12px 0 24px 0;">You don't have any placed orders yet. Buy some premium electronics gear to track deliveries!</p>
            <a href="index.html" class="btn btn-primary btn-glow">Start Shopping</a>
          </div>
        `;
        return;
      }

      renderOrdersList(container, userOrders);

      // Start background status updates polling if there are transit/arrived deliveries
      const hasActive = userOrders.some(o => o.status === 'In Transit' || o.status === 'Arrived');
      if (hasActive) {
        startDeliveryPolling();
      }
    })
    .catch(err => {
      console.error("Error loading deliveries:", err);
      container.innerHTML = `
        <div style="text-align: center; padding: 60px; color: var(--danger)">
          <i class="fas fa-exclamation-triangle" style="font-size: 2.5rem; margin-bottom: 20px;"></i>
          <h2>Failed to Load Deliveries</h2>
          <p style="color: var(--text-secondary); margin-top: 10px;">Make sure the server is online and try again.</p>
          <button class="btn btn-secondary" onclick="initDeliveryPage()" style="margin-top: 15px;">Retry</button>
        </div>
      `;
    });
}

function renderOrdersList(container, userOrders) {
  container.innerHTML = `
    <style>
      @keyframes pulseBorder {
        from { border-color: rgba(34, 197, 94, 0.25); box-shadow: 0 0 5px rgba(34, 197, 94, 0.1); }
        to { border-color: rgba(34, 197, 94, 0.95); box-shadow: 0 0 15px rgba(34, 197, 94, 0.25); }
      }
      @keyframes doorbellShake {
        0%, 100% { transform: rotate(0); }
        20%, 60% { transform: rotate(-10deg); }
        40%, 80% { transform: rotate(10deg); }
      }
      .doorbell-icon-pulse i {
        animation: doorbellShake 1.4s infinite ease-in-out;
      }
      .order-status-badge.status-arrived {
        background: rgba(96, 165, 250, 0.1) !important;
        color: var(--secondary) !important;
        border: 1px solid rgba(96, 165, 250, 0.2) !important;
      }
    </style>
    <div style="max-width: 720px; margin: 0 auto;">
      <h2 style="font-family: var(--font-heading); font-size: 1.8rem; margin-bottom: 24px; color: var(--text-primary); text-align: left; display: flex; align-items: center; gap: 12px;">
        <i class="fas fa-truck-ramp-box" style="color: var(--primary);"></i> Scheduled Deliveries
      </h2>
      <div style="display: flex; flex-direction: column; gap: 24px;">
        ${userOrders.map((order, idx) => {
          const formattedDate = new Date(order.date).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
          });
          
          const isDelivered = order.status === 'Delivered';
          const isArrived = order.status === 'Arrived';
          
          let badgeClass = 'status-transit';
          let badgeLabel = 'In Transit';
          let progressWidth = '50%';
          
          if (isDelivered) {
            badgeClass = 'status-delivered';
            badgeLabel = 'Arrived & Verified';
            progressWidth = '100%';
          } else if (isArrived) {
            badgeClass = 'status-arrived';
            badgeLabel = 'Agent at Doorstep';
            progressWidth = '80%';
          }
          
          return `
            <div class="glass-panel order-card animate-slide-up ${isDelivered ? 'delivered' : ''}" style="animation-delay: ${idx * 0.08}s;" id="order-card-${order.id}">
              <div class="order-header">
                <div>
                  <div class="order-id">Order #${order.id}</div>
                  <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 4px;">Placed on ${formattedDate}</div>
                </div>
                <div class="order-status-badge ${badgeClass}">${badgeLabel}</div>
              </div>

              ${isArrived ? `
                <div style="background: rgba(34, 197, 94, 0.04); border: 1px solid var(--success); border-radius: var(--radius-md); padding: 14px 18px; margin-top: 15px; margin-bottom: 5px; display: flex; align-items: center; gap: 14px; animation: pulseBorder 1.8s infinite alternate;" class="doorstep-arrival-banner">
                  <div style="width: 38px; height: 38px; border-radius: 50%; background: rgba(34, 197, 94, 0.15); display: flex; align-items: center; justify-content: center; color: var(--success); font-size: 1.2rem;" class="doorbell-icon-pulse">
                    <i class="fas fa-bell"></i>
                  </div>
                  <div>
                    <h4 style="margin: 0; color: var(--success); font-weight: 700; font-size: 0.9rem; font-family: var(--font-heading);">Delivery Agent Arrived!</h4>
                    <span style="font-size: 0.75rem; color: var(--text-secondary); display: block; margin-top: 2px;">Your delivery executive Raj Kumar is outside your door. Please scan the box QR code or show him this screen to verify details.</span>
                  </div>
                </div>
              ` : ''}

              <div class="order-items-list">
                ${order.items.map(item => `
                  <div class="order-item-row">
                    <div class="order-item-img">
                      <img src="${item.image}" alt="${item.name}">
                    </div>
                    <div class="order-item-details">
                      <div class="order-item-name">${item.name}</div>
                      <div class="order-item-qty-price">${item.quantity} x ${formatPrice(item.price)}</div>
                    </div>
                    <div style="font-family: var(--font-heading); font-weight: 700; color: var(--text-primary);">
                      ${formatPrice(item.price * item.quantity)}
                    </div>
                  </div>
                `).join('')}
              </div>

              <div style="display: flex; justify-content: space-between; border-top: 1px solid var(--border-light); padding-top: 16px; margin-top: 12px; font-size: 0.9rem;">
                <span style="color: var(--text-secondary);">Total Paid (Incl. GST):</span>
                <span style="font-family: var(--font-heading); font-weight: 800; color: var(--primary); font-size: 1.15rem;">
                  ${formatPrice(order.pricing.total)}
                </span>
              </div>

              <div class="tracking-timeline" style="margin-top: 24px; margin-bottom: 24px;">
                <div class="timeline-progress" style="width: ${progressWidth};"></div>
                
                <div class="timeline-step completed">
                  <div class="timeline-icon-box"><i class="fas fa-file-invoice"></i></div>
                  <span class="timeline-title">Placed</span>
                </div>
                
                <div class="timeline-step completed">
                  <div class="timeline-icon-box"><i class="fas fa-warehouse"></i></div>
                  <span class="timeline-title">Packed</span>
                </div>
                
                <div class="timeline-step ${isArrived || isDelivered ? 'completed' : 'active'}">
                  <div class="timeline-icon-box"><i class="fas fa-shipping-fast"></i></div>
                  <span class="timeline-title">Transit</span>
                </div>

                <div class="timeline-step ${isDelivered ? 'completed' : (isArrived ? 'active' : '')}">
                  <div class="timeline-icon-box"><i class="fas fa-house-chimney-user"></i></div>
                  <span class="timeline-title">Doorstep</span>
                </div>
                
                <div class="timeline-step ${isDelivered ? 'completed' : ''}">
                  <div class="timeline-icon-box"><i class="fas fa-file-signature"></i></div>
                  <span class="timeline-title">Signed</span>
                </div>
              </div>

              ${!isDelivered ? `
                <div style="background: rgba(251, 191, 36, 0.02); border: 1px dashed rgba(251, 191, 36, 0.25); border-radius: var(--radius-md); padding: 20px; display: flex; flex-direction: row; gap: 20px; align-items: center; margin-top: 20px; flex-wrap: wrap;">
                  <div style="flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 10px;">
                    <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5;">
                      <i class="fas fa-circle-exclamation" style="color: #fbbf24; margin-right: 6px;"></i>
                      <strong>Delivery Package Verification:</strong> Scan the QR code label printed on the package box to verify receiver matching and confirm delivery.
                    </div>
                    <button type="button" class="btn btn-primary btn-glow ${isArrived ? '' : 'animate-pulse'}" id="start-scan-btn-${order.id}" style="height: 40px; font-size: 0.85rem; width: 100%; ${isArrived ? 'background: var(--success); box-shadow: 0 0 10px rgba(34,197,94,0.3); border-color: var(--success);' : ''}">
                      <i class="fas fa-qrcode"></i> ${isArrived ? 'Scan Package QR to Confirm' : 'Scan Package QR to Verify'}
                    </button>
                  </div>
                  <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; background: #ffffff; padding: 10px; border-radius: var(--radius-sm);">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=110x110&color=0d1117&data=USER:${state.user ? state.user.id : 'guest'}|ORDER:${order.id}" alt="Package QR Code" style="width: 110px; height: 110px; display: block;">
                    <span style="font-size: 0.65rem; color: #0d1117; font-weight: 700; font-family: monospace;">QR: USER:${state.user ? state.user.id : 'guest'}</span>
                  </div>
                </div>
              ` : `
                <div class="delivery-receipt-box">
                  <div class="receipt-header-row">
                    <div style="width: 36px; height: 36px; border-radius: 50%; background: rgba(34, 197, 94, 0.1); border: 1px solid var(--success); display:flex; align-items:center; justify-content:center; color: var(--success); font-size:1.1rem;">
                      <i class="fas fa-check"></i>
                    </div>
                    <div>
                      <h4 class="receipt-title">Delivery Acknowledged</h4>
                      <span style="font-size: 0.72rem; color: var(--text-muted);">Cryptographically Verified Digital Receipt</span>
                    </div>
                  </div>
                  <div class="receipt-details-list">
                    <div><strong>Receiver Name:</strong> ${order.shippingDetails.name}</div>
                    <div><strong>Delivery Courier:</strong> Raj Kumar (Executive ID #9021)</div>
                    <div><strong>Order Status:</strong> <span style="color: var(--success); font-weight: 700;">Arrived & Verified</span></div>
                    <div><strong>Receipt Acknowledged:</strong> ${new Date(order.arrivalTime).toLocaleString('en-IN')}</div>
                    <div><strong>Receipt Signature Hash:</strong> <span style="font-family: monospace; color: var(--primary); font-size: 0.78rem;">${order.signatureCode}</span></div>
                  </div>

                  <div class="signature-seal-container">
                    <span class="signature-title">Receiver's Digital Seal Signature</span>
                    <span class="signature-font">${order.shippingDetails.name}</span>
                    <div class="signature-line"></div>
                  </div>
                </div>
              `}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  userOrders.forEach(order => {
    if (order.status !== 'Delivered') {
      const scanBtn = document.getElementById(`start-scan-btn-${order.id}`);
      if (scanBtn) {
        scanBtn.addEventListener('click', () => {
          const dummyScanBtn = document.createElement('button');
          dummyScanBtn.id = 'start-scan-btn';
          dummyScanBtn.style.display = 'none';
          document.body.appendChild(dummyScanBtn);

          const dummyTrackingCard = document.createElement('div');
          dummyTrackingCard.id = 'delivery-tracking-card';
          dummyTrackingCard.style.display = 'none';
          document.body.appendChild(dummyTrackingCard);

          bindScannerActions(order.shippingDetails.name, order.id);
          dummyScanBtn.click();

          dummyScanBtn.remove();
          dummyTrackingCard.remove();
        });
      }
    }
  });
}

// --- GLOBAL DOORSTEP ARRIVAL WATCHER (Browsing notifications) ---
let globalNotificationInterval = null;
let lastKnownStatuses = {};

function initGlobalNotificationWatcher() {
  if (!state.user) return;
  
  // Do not run global watcher if user is already on the tracking page (which has its own status flow)
  if (window.location.pathname.endsWith('delivery.html')) return;

  // Perform initial fetch to seed lastKnownStatuses so we only alert for new status changes
  fetch(`${API_BASE}/orders?email=${encodeURIComponent(state.user.email)}`)
    .then(res => {
      if (!res.ok) throw new Error();
      return res.json();
    })
    .then(orders => {
      orders.forEach(o => {
        lastKnownStatuses[o.id] = o.status;
      });
      startGlobalNotificationPolling();
    })
    .catch(err => console.warn("Failed to seed initial delivery statuses:", err));
}

function startGlobalNotificationPolling() {
  if (globalNotificationInterval) return;

  globalNotificationInterval = setInterval(() => {
    // Stop polling if user signed out or navigated to the delivery tracking page
    if (!state.user || window.location.pathname.endsWith('delivery.html')) {
      clearInterval(globalNotificationInterval);
      globalNotificationInterval = null;
      return;
    }

    fetch(`${API_BASE}/orders?email=${encodeURIComponent(state.user.email)}`)
      .then(res => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(orders => {
        orders.forEach(o => {
          const prevStatus = lastKnownStatuses[o.id];
          if (prevStatus && prevStatus === 'In Transit' && o.status === 'Arrived') {
            // Trigger Ding-Dong sound and slide-down banner
            playDoorbellSound();
            showDoorstepArrivalBanner(o);
          }
          lastKnownStatuses[o.id] = o.status;
        });
      })
      .catch(err => console.warn("Background delivery check failed:", err));
  }, 5000);
}

function showDoorstepArrivalBanner(order) {
  let banner = document.getElementById('global-doorstep-banner');
  if (banner) banner.remove();

  banner = document.createElement('div');
  banner.id = 'global-doorstep-banner';
  banner.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translate(-50%, -160%);
    z-index: 10000;
    width: 90%;
    max-width: 450px;
    background: rgba(16, 22, 37, 0.95);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1.5px solid var(--success);
    box-shadow: 0 12px 36px rgba(0, 0, 0, 0.65), 0 0 20px rgba(34, 197, 94, 0.2);
    border-radius: var(--radius-md);
    padding: 16px;
    display: flex;
    align-items: center;
    gap: 14px;
    cursor: pointer;
    transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  `;

  banner.innerHTML = `
    <div style="width: 40px; height: 40px; border-radius: 50%; background: rgba(34, 197, 94, 0.15); display: flex; align-items: center; justify-content: center; color: var(--success); font-size: 1.25rem;" class="bell-shake">
      <i class="fas fa-bell"></i>
    </div>
    <div style="flex: 1; text-align: left;" onclick="window.location.href='delivery.html'">
      <h4 style="margin: 0; color: var(--success); font-weight: 700; font-size: 0.92rem; font-family: var(--font-heading);">Delivery Agent Arrived!</h4>
      <span style="font-size: 0.78rem; color: var(--text-secondary); display: block; margin-top: 2px;">Raj Kumar is at your doorstep for Order #${order.id}. Click to open details.</span>
    </div>
    <button class="icon-btn" id="btn-close-global-banner" style="background:transparent; border:none; color:var(--text-muted); cursor:pointer; width: 24px; height: 24px;"><i class="fas fa-times"></i></button>
    
    <style>
      @keyframes bellRinging {
        0%, 100% { transform: rotate(0); }
        20%, 60% { transform: rotate(-15deg); }
        40%, 80% { transform: rotate(15deg); }
      }
      .bell-shake i {
        animation: bellRinging 1.5s infinite ease-in-out;
      }
    </style>
  `;

  document.body.appendChild(banner);

  // Trigger drop-down slide animation
  setTimeout(() => {
    banner.style.transform = 'translate(-50%, 0)';
  }, 100);

  // Close button click listener
  banner.querySelector('#btn-close-global-banner').addEventListener('click', (e) => {
    e.stopPropagation();
    banner.style.transform = 'translate(-50%, -160%)';
    setTimeout(() => banner.remove(), 500);
  });

  // Auto-dismiss after 15 seconds
  setTimeout(() => {
    if (document.body.contains(banner)) {
      banner.style.transform = 'translate(-50%, -160%)';
      setTimeout(() => banner.remove(), 500);
    }
  }, 15000);
}

