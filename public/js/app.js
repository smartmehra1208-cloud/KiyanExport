// ===== KIYAN WELLNESS B2C ENHANCED CLIENT APPLICATION =====

let cart = JSON.parse(sessionStorage.getItem('kiyan_cart') || sessionStorage.getItem('kiyan_cart') || '[]');
let currentUser = JSON.parse(sessionStorage.getItem('kiyan_user') || sessionStorage.getItem('kiyan_user') || 'null');
let currentSlide = 0;
let currentModalProduct = null;
let productsData = [];
let activeCategory = 'all';
let currentSearchQuery = '';
let appliedPromoCode = null;

// ===== SKELETON (SKULL) IMAGE LOADER MANAGEMENT =====
function onImageLoad(img) {
  if (!img) return;
  img.classList.add('loaded-img', 'loaded');
  img.classList.remove('img-loading');
  const parent = img.closest('.skeleton-wrapper, .product-image, .pm-main-img-wrap, .about-img-wrap');
  if (parent) {
    parent.classList.add('loaded');
  }
}

function loadRazorpaySdk() {
  return new Promise((resolve) => {
    if (typeof Razorpay !== 'undefined') return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function onImageError(img, fallbackUrl = '/images/kiyan-logo.png') {
  if (!img) return;
  img.onerror = null;
  img.src = fallbackUrl;
  img.classList.add('loaded-img', 'loaded');
  img.classList.remove('img-loading');
  const parent = img.closest('.skeleton-wrapper, .product-image, .pm-main-img-wrap, .about-img-wrap');
  if (parent) {
    parent.classList.add('loaded');
  }
}

function initSkeletonLoaders(context = document) {
  const images = context.querySelectorAll('img');
  images.forEach(img => {
    if (!img.classList.contains('loaded-img')) {
      img.classList.add('img-loading');
      if (img.complete && img.naturalWidth > 0) {
        onImageLoad(img);
      } else {
        img.addEventListener('load', () => onImageLoad(img), { once: true });
        img.addEventListener('error', () => onImageError(img), { once: true });
      }
    }
  });
}

// DOM Loaded Initialization
document.addEventListener('DOMContentLoaded', () => {
  initSlider();
  fetchProducts();
  updateCartUI();
  updateAuthUI();
  setupFilterListeners();
  setupScrollListener();
  initSkeletonLoaders();
  fetchAndApplySiteContent();
  initScrollReveal();
  updateB2BCalculator();
});

// ===== TOP BAR SCROLL HIDE LISTENER =====
function setupScrollListener() {
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      document.body.classList.add('scrolled');
    } else {
      document.body.classList.remove('scrolled');
    }
  });
}

// ===== MOBILE MENU TOGGLE =====
function toggleMobileMenu() {
  const drawer = document.getElementById('mobileNavDrawer');
  const overlay = document.getElementById('mobileNavOverlay');
  if (drawer) {
    const isActive = drawer.classList.toggle('active');
    drawer.style.display = isActive ? 'flex' : 'none';
  }
  if (overlay) {
    const isActive = overlay.classList.toggle('active');
    overlay.style.display = isActive ? 'block' : 'none';
  }
}

// ===== PAGE NAVIGATION (SPA) =====
function openAdminDirectly() {
  const cleanEmail = currentUser ? (currentUser.email || '').toLowerCase().trim() : '';
  const isAdmin = currentUser && (currentUser.role === 'admin' || cleanEmail === 'admin@kiyanexports.com' || cleanEmail === 'admin@kiyanwellness.com' || cleanEmail === 'sales@kiyanexports.com' || cleanEmail === 'admin@kiorawellness.com');

  if (!isAdmin) {
    alert('🔒 Administrator Access Required:\n\nPlease login with Admin credentials (e.g. admin@kiyanwellness.com) to access the Admin Panel.');
    openAuthModal('login');
    return;
  }

  sessionStorage.removeItem('kiyan_admin_preview');
  updateAuthUI();
  document.body.classList.add('admin-mode-active');
  const standaloneDash = document.getElementById('adminStandaloneDashboard');
  if (standaloneDash) standaloneDash.style.display = 'block';
  renderAdminStandaloneTable();
  fetchAndApplySiteContent();
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
}

function showPage(pageId, element) {
  if (pageId === 'admin') {
    openAdminDirectly();
    return;
  }

  const drawer = document.getElementById('mobileNavDrawer');
  const overlay = document.getElementById('mobileNavOverlay');
  if (drawer) {
    drawer.classList.remove('active');
    drawer.style.display = 'none';
  }
  if (overlay) {
    overlay.classList.remove('active');
    overlay.style.display = 'none';
  }

  const pages = document.querySelectorAll('.page-section');
  pages.forEach(page => page.classList.remove('active-page'));

  const targetPage = document.getElementById(pageId);
  if (targetPage) {
    targetPage.classList.add('active-page');
    // Scroll window instantly to top (0,0) so page title starts cleanly!
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }

  // Toggle body subpage class
  if (pageId === 'home') {
    document.body.classList.remove('subpage-active');
  } else {
    document.body.classList.remove('subpage-active');
  }

  // Update Nav Links
  const navLinks = document.querySelectorAll('.nav-links a');
  navLinks.forEach(link => link.classList.remove('active'));
  if (element) {
    element.classList.add('active');
  }

  // Ensure grids render cleanly on page change
  if (productsData.length > 0) {
    renderFilteredProducts();
  }
}

// ===== USER AUTHENTICATION & SESSION LOGIC =====
// ===== USER AUTHENTICATION & SECURITY LOGIC =====
function togglePasswordVisibility(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  if (input && icon) {
    if (input.type === 'password') {
      input.type = 'text';
      icon.className = 'fas fa-eye-slash';
    } else {
      input.type = 'password';
      icon.className = 'fas fa-eye';
    }
  }
}

function checkPasswordStrength(val) {
  const lenValid = val.length >= 8;
  const numValid = /[0-9]/.test(val);
  const specValid = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(val);

  updateHint('hintLength', lenValid, 'Min. 8 characters');
  updateHint('hintNumber', numValid, 'Contains number (0-9)');
  updateHint('hintSpecial', specValid, 'Special char (@,#,$,%)');
}

function updateHint(id, isValid, text) {
  const el = document.getElementById(id);
  if (el) {
    if (isValid) {
      el.classList.add('valid');
      el.innerHTML = `<i class="fas fa-check-circle"></i> ${text}`;
    } else {
      el.classList.remove('valid');
      el.innerHTML = `<i class="fas fa-times-circle"></i> ${text}`;
    }
  }
}

function updateAuthUI() {
  const authBtn = document.getElementById('navAuthBtn');
  const userProfileMenu = document.getElementById('navUserProfileMenu');
  const navUserName = document.getElementById('navUserName');
  const navAdminBtn = document.getElementById('navAdminBtn');
  const dropdownAdminBtn = document.getElementById('dropdownAdminBtn');
  const adminTopBanner = document.getElementById('adminTopBanner');
  const adminBannerEmail = document.getElementById('adminBannerEmail');
  const standaloneEmail = document.getElementById('standaloneAdminEmail');

  if (currentUser) {
    if (authBtn) authBtn.style.display = 'none';
    if (userProfileMenu) userProfileMenu.style.display = 'inline-block';
    if (navUserName) navUserName.textContent = currentUser.fullName.split(' ')[0];

    const cleanEmail = (currentUser.email || '').toLowerCase().trim();
    const isAdmin = currentUser.role === 'admin' || cleanEmail === 'admin@kiyanwellness.com' || cleanEmail === 'sales@kiyanexports.com';
    
    if (navAdminBtn) navAdminBtn.style.display = isAdmin ? 'inline-block' : 'none';
    if (dropdownAdminBtn) dropdownAdminBtn.style.display = isAdmin ? 'flex' : 'none';
    if (adminTopBanner) adminTopBanner.style.display = isAdmin ? 'block' : 'none';
    if (adminBannerEmail) adminBannerEmail.textContent = currentUser.email;
    if (standaloneEmail) standaloneEmail.textContent = currentUser.email;

    if (isAdmin && document.body.classList.contains('admin-mode-active')) {
      const standaloneDash = document.getElementById('adminStandaloneDashboard');
      if (standaloneDash) standaloneDash.style.display = 'block';
      renderAdminStandaloneTable();
    } else {
      document.body.classList.remove('admin-mode-active');
      const standaloneDash = document.getElementById('adminStandaloneDashboard');
      if (standaloneDash) standaloneDash.style.display = 'none';
    }
    
    // Auto-fill checkout fields & address if user is logged in
    const nameEl = document.getElementById('customerName');
    const emailEl = document.getElementById('customerEmail');
    const phoneEl = document.getElementById('customerPhone');
    const addrEl = document.getElementById('customerAddress');
    const cityEl = document.getElementById('customerCity');
    const pinEl = document.getElementById('customerPin');
    const bannerEl = document.getElementById('savedAddressBanner');

    if (nameEl) nameEl.value = currentUser.fullName || '';
    if (emailEl) emailEl.value = currentUser.email || '';
    if (phoneEl) phoneEl.value = currentUser.phone || '';
    if (addrEl) addrEl.value = currentUser.address || '';
    if (cityEl) cityEl.value = currentUser.city || '';
    if (pinEl) pinEl.value = currentUser.pin || '';

    if (bannerEl) {
      if (currentUser.address) {
        bannerEl.style.display = 'block';
      } else {
        bannerEl.style.display = 'none';
      }
    }
  } else {
    document.body.classList.remove('admin-mode-active');
    sessionStorage.removeItem('kiyan_admin_preview');
    if (authBtn) authBtn.style.display = 'flex';
    if (userProfileMenu) userProfileMenu.style.display = 'none';
    if (navAdminBtn) navAdminBtn.style.display = 'none';
    if (dropdownAdminBtn) dropdownAdminBtn.style.display = 'none';
    if (adminTopBanner) adminTopBanner.style.display = 'none';
    const bannerEl = document.getElementById('savedAddressBanner');
    if (bannerEl) bannerEl.style.display = 'none';
  }
}

function openAuthModal(tab = 'login') {
  const modal = document.getElementById('authModalOverlay');
  if (modal) {
    modal.classList.add('active');
    switchAuthTab(tab);
  }
}

function closeAuthModal(event) {
  if (event && event.target !== event.currentTarget) return;
  const modal = document.getElementById('authModalOverlay');
  if (modal) modal.classList.remove('active');
}

function switchAuthTab(tabName) {
  const loginTabBtn = document.getElementById('authTabLoginBtn');
  const registerTabBtn = document.getElementById('authTabRegisterBtn');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  if (tabName === 'login') {
    if (loginTabBtn) loginTabBtn.classList.add('active');
    if (registerTabBtn) registerTabBtn.classList.remove('active');
    if (loginForm) loginForm.classList.add('active');
    if (registerForm) registerForm.classList.remove('active');
  } else {
    if (loginTabBtn) loginTabBtn.classList.remove('active');
    if (registerTabBtn) registerTabBtn.classList.add('active');
    if (loginForm) loginForm.classList.remove('active');
    if (registerForm) registerForm.classList.add('active');
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (data.success) {
      currentUser = data.user;
      sessionStorage.setItem('kiyan_user', JSON.stringify(currentUser));
      sessionStorage.removeItem('kiyan_admin_preview');
      updateAuthUI();
      closeAuthModal();

      const userEmailClean = (currentUser.email || '').toLowerCase().trim();
      const isAdmin = currentUser.role === 'admin' || userEmailClean === 'admin@kiyanwellness.com' || userEmailClean === 'sales@kiyanexports.com';

      if (isAdmin) {
        document.body.classList.add('admin-mode-active');
        const standaloneDash = document.getElementById('adminStandaloneDashboard');
        if (standaloneDash) standaloneDash.style.display = 'block';
        renderAdminStandaloneTable();
        alert(`Welcome Admin (${currentUser.fullName})! Accessing Kiyan Wellness Admin Dashboard... 👑`);
      } else {
        document.body.classList.remove('admin-mode-active');
        const standaloneDash = document.getElementById('adminStandaloneDashboard');
        if (standaloneDash) standaloneDash.style.display = 'none';
        alert(`Welcome back, ${currentUser.fullName}! 🎉`);
      }
    } else {
      alert(data.message || 'Login failed.');
    }
  } catch (err) {
    alert('Login error. Please try again.');
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const fullName = (document.getElementById('regName').value || '').trim();
  const email = (document.getElementById('regEmail').value || '').trim();
  const phone = (document.getElementById('regPhone').value || '').trim();
  const address = (document.getElementById('regAddress').value || '').trim();
  const city = (document.getElementById('regCity').value || '').trim();
  const pin = (document.getElementById('regPin').value || '').trim();
  const password = document.getElementById('regPassword').value;

  if (!email.includes('@') || !email.includes('.')) {
    alert('Please enter a valid complete email address (e.g. name@example.com).');
    return;
  }

  // Enforce Password Security Policy
  const isStrong = password.length >= 8 && /[0-9]/.test(password) && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  if (!isStrong) {
    alert('🔒 Password Security Notice:\n\nPassword must satisfy all security rules:\n• At least 8 characters long\n• Contains at least one number (0-9)\n• Contains at least one special character (@, #, $, %, etc.)');
    return;
  }

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, email, phone, password, address, city, pin })
    });
    const data = await res.json();

    if (data.success) {
      currentUser = data.user;
      sessionStorage.setItem('kiyan_user', JSON.stringify(currentUser));
      document.body.classList.remove('admin-mode-active');
      const standaloneDash = document.getElementById('adminStandaloneDashboard');
      if (standaloneDash) standaloneDash.style.display = 'none';
      updateAuthUI();
      closeAuthModal();
      alert(`Registration successful! Welcome to Kiyan Wellness, ${currentUser.fullName}! 🌿`);
    } else {
      alert(data.message || 'Registration failed. Please check your details.');
    }
  } catch (err) {
    alert(err.message || 'Network or Server connection error. Please try again.');
  }
}

function logoutUser() {
  currentUser = null;
  cart = [];
  sessionStorage.removeItem('kiyan_user');
  sessionStorage.removeItem('kiyan_cart');
  sessionStorage.removeItem('kiyan_user');
  sessionStorage.removeItem('kiyan_cart');
  updateAuthUI();
  updateCartUI();
  alert('You have logged out successfully.');
}

// ===== USER ORDERS MODAL & DATABASE QUERY LOGIC =====
async function openUserOrdersModal() {
  const modal = document.getElementById('userOrdersModal');
  const subtitle = document.getElementById('userOrdersEmail');
  const searchInput = document.getElementById('orderSearchInput');

  if (currentUser) {
    if (subtitle) subtitle.textContent = currentUser.email;
    if (searchInput) searchInput.value = currentUser.email;
  } else {
    if (subtitle) subtitle.textContent = 'Guest / Customer Lookup';
    if (searchInput) searchInput.value = '';
  }

  if (modal) modal.classList.add('active');
  await searchUserOrders();
}

function closeUserOrdersModal(event) {
  if (event && event.target !== event.currentTarget) return;
  const modal = document.getElementById('userOrdersModal');
  if (modal) modal.classList.remove('active');
}

// IST Date Formatter (Asia/Kolkata UTC+5:30)
function formatISTDateTime(dateInput) {
  if (!dateInput) dateInput = new Date();
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'N/A';

  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }) + ' IST';
}

async function searchUserOrders() {
  const container = document.getElementById('userOrdersBody');
  const searchInput = document.getElementById('orderSearchInput');
  const query = (searchInput ? searchInput.value : '').trim() || (currentUser ? currentUser.email : '');

  if (!container) return;

  if (!query) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 20px;">
        <i class="fas fa-search" style="font-size: 2.5rem; color: var(--accent-gold); margin-bottom: 15px;"></i>
        <h4 style="color: var(--text-dark); margin-bottom: 8px;">Order Lookup</h4>
        <p style="font-size: 0.9rem; color: var(--text-muted);">Please enter your Email address or Order ID in the search box above to view your order history.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 30px;"><i class="fas fa-spinner fa-spin"></i> Querying MongoDB Atlas database...</p>';

  try {
    const res = await fetch(`/api/user/orders?query=${encodeURIComponent(query)}`);
    const data = await res.json();

    if (data.success && data.orders && data.orders.length > 0) {
      container.innerHTML = data.orders.map(order => {
        const istTimeStr = order.createdAtIST || formatISTDateTime(order.createdAt || Date.now());

        return `
        <div class="order-card">
          <div class="order-card-header">
            <div>
              <span class="order-id-badge">${order.orderId}</span>
              <div style="font-size: 0.8rem; color: var(--deep-green); font-weight: 700; margin-top: 4px;">
                <i class="fas fa-clock" style="color: var(--accent-gold);"></i> IST Timestamp: <span>${istTimeStr}</span>
              </div>
              <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">
                Customer: <strong>${order.customerName}</strong> (${order.customerEmail})
              </div>
            </div>
            <div style="text-align: right;">
              <span class="order-status-badge">${order.status || 'Confirmed'}</span>
              <div style="font-size: 0.78rem; color: var(--deep-green); font-weight: 700; margin-top: 4px;">
                ${order.paymentMethod} (${order.paymentStatus || 'Pending'})
              </div>
            </div>
          </div>

          <!-- Step-by-Step IST Order Timeline Bar -->
          <div class="order-timeline">
            <div class="order-timeline-step completed">
              <div class="timeline-dot"><i class="fas fa-check"></i></div>
              <div class="timeline-title">Order Placed</div>
              <div class="timeline-time">${istTimeStr}</div>
            </div>
            <div class="order-timeline-step completed">
              <div class="timeline-dot"><i class="fas fa-shield-alt"></i></div>
              <div class="timeline-title">QA Approved</div>
              <div class="timeline-time">FSSAI Certified</div>
            </div>
            <div class="order-timeline-step ${order.status === 'Shipped' || order.status === 'Delivered' || order.status === 'Confirmed' ? 'completed' : ''}">
              <div class="timeline-dot"><i class="fas fa-box"></i></div>
              <div class="timeline-title">Dispatched</div>
              <div class="timeline-time">Cold-Chain Express</div>
            </div>
            <div class="order-timeline-step ${order.status === 'Delivered' ? 'completed' : ''}">
              <div class="timeline-dot"><i class="fas fa-truck"></i></div>
              <div class="timeline-title">Estimated Delivery</div>
              <div class="timeline-time">${order.estimatedDelivery || 'Within 3 Days'}</div>
            </div>
          </div>

          <div class="order-card-items">
            ${(order.items || []).map(item => `
              <div class="order-item-row">
                <div style="display: flex; align-items: center;">
                  <div class="skeleton-wrapper" style="width: 42px; height: 42px; border-radius: 8px; margin-right: 12px; overflow: hidden; flex-shrink: 0;">
                    <img src="${item.image ? (item.image.startsWith('/') ? item.image : '/' + item.image) : '/Logo-2.webp'}" alt="${item.name}" loading="lazy" decoding="async" class="img-loading" onload="onImageLoad(this)" onerror="onImageError(this, '/Logo-2.webp')" style="width: 100%; height: 100%; object-fit: cover;">
                  </div>
                  <div>
                    <strong style="display: block; color: var(--text-dark);">${item.name}</strong>
                    <span style="font-size: 0.8rem; color: var(--text-muted);">Qty: ${item.quantity} × ₹${item.price}</span>
                  </div>
                </div>
                <div style="font-weight: 700; color: var(--deep-green);">₹${(item.itemTotal || (item.price * item.quantity)).toLocaleString('en-IN')}</div>
              </div>
            `).join('')}
          </div>

          <div class="order-card-footer" style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between; padding-top: 12px; border-top: 1px solid var(--soft-cream);">
            <div>
              <span>Delivery to: <strong>${order.customerAddress}</strong></span>
              <span style="font-size: 1.1rem; font-weight: 800; color: var(--deep-green); margin-left: 12px;">Total: ₹${(order.financials ? order.financials.totalPayable : 0).toLocaleString('en-IN')}</span>
            </div>
            <button onclick="inquireOrderOnWhatsApp('${order.orderId}', ${order.financials ? order.financials.totalPayable : 0}, '${istTimeStr}')" style="padding: 7px 16px; font-size: 0.82rem; background: #25d366; color: white; border: none; border-radius: 20px; display: flex; align-items: center; gap: 6px; font-weight: 700; cursor: pointer; box-shadow: 0 2px 8px rgba(37,211,102,0.3);" title="Inquire about Order #${order.orderId} on WhatsApp"><i class="fab fa-whatsapp" style="font-size: 1.05rem;"></i> WhatsApp Inquiry</button>
          </div>
        </div>
      `;
      }).join('');
    } else {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px 20px;">
          <i class="fas fa-box-open" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 15px;"></i>
          <h4 style="color: var(--text-dark); margin-bottom: 8px;">No Previous Orders Found</h4>
          <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 20px;">No orders found matching <strong>"${query}"</strong> in MongoDB Atlas database.</p>
          <button class="btn-main" onclick="closeUserOrdersModal(); showPage('products', null);">Start Shopping Now</button>
        </div>
      `;
    }
  } catch (err) {
    container.innerHTML = '<p style="text-align: center; color: red; padding: 20px;">Failed to query order history from database.</p>';
  }
}

async function loadUserOrders() {
  await searchUserOrders();
}

// ===== FETCH PRODUCTS FROM API =====
async function fetchProducts() {
  try {
    const res = await fetch('/api/products');
    const data = await res.json();
    if (data.success && data.products) {
      productsData = data.products;
      renderFilteredProducts();
    }
  } catch (err) {
    console.error('Error loading products from server:', err);
  }
}

// ===== FILTER & SEARCH LOGIC =====
function setupFilterListeners() {
  const navSearchInput = document.getElementById('navSearchInput');
  const sectionSearchInput = document.getElementById('sectionSearchInput');
  const mobileSearchInput = document.getElementById('mobileSearchInput');

  const handleSearchInput = (e) => {
    currentSearchQuery = e.target.value.trim().toLowerCase();
    renderFilteredProducts();
  };

  if (navSearchInput) navSearchInput.addEventListener('input', handleSearchInput);
  if (sectionSearchInput) sectionSearchInput.addEventListener('input', handleSearchInput);
  if (mobileSearchInput) mobileSearchInput.addEventListener('input', handleSearchInput);
}

function setCategoryFilter(category, element) {
  activeCategory = category.toLowerCase();
  
  // Update Pills UI
  const pills = document.querySelectorAll('.filter-pill');
  pills.forEach(p => p.classList.remove('active'));
  if (element) element.classList.add('active');

  renderFilteredProducts();
}

function renderFilteredProducts() {
  let filtered = [...productsData];

  // Category Filter
  if (activeCategory !== 'all') {
    filtered = filtered.filter(p => p.category.toLowerCase() === activeCategory);
  }

  // Search Query Filter
  if (currentSearchQuery) {
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(currentSearchQuery) ||
      p.description.toLowerCase().includes(currentSearchQuery) ||
      p.category.toLowerCase().includes(currentSearchQuery)
    );
  }

  renderProductGrids(filtered);
}

// ===== RENDER PRODUCT CARDS (ALIBABA STYLE B2B WHOLESALE) =====
function renderProductGrids(products) {
  const herbalGrid = document.getElementById('herbal-grid');
  const herbalGridFull = document.getElementById('herbal-grid-full');
  const spicesGrid = document.getElementById('spices-grid');
  const copperGrid = document.getElementById('copperware-grid');

  if (herbalGrid) herbalGrid.innerHTML = '';
  if (herbalGridFull) herbalGridFull.innerHTML = '';
  if (spicesGrid) spicesGrid.innerHTML = '';
  if (copperGrid) copperGrid.innerHTML = '';

  if (products.length === 0) {
    const emptyMsg = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px; font-size: 1.1rem;">No matching wholesale products found. Try adjusting your search query.</p>';
    if (herbalGrid) herbalGrid.innerHTML = emptyMsg;
    if (herbalGridFull) herbalGridFull.innerHTML = emptyMsg;
    if (spicesGrid) spicesGrid.innerHTML = emptyMsg;
    if (copperGrid) copperGrid.innerHTML = emptyMsg;
    return;
  }

  const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.email === 'admin@kiyanwellness.com');

  products.forEach(product => {
    const imgUrl = product.image.startsWith('/') ? product.image : '/' + product.image;
    const stock = product.stockQuantity !== undefined ? product.stockQuantity : 15;
    const isSoldOut = stock === 0;
    const moq = product.moq || 100;
    const priceRange = product.priceRange || `₹${Math.round(product.price * 0.5)} - ₹${product.price} / Piece`;
    
    const adminEditBtnHTML = isAdmin ? `<button class="admin-quick-edit-card-btn" onclick="event.stopPropagation(); showPage('admin'); switchAdminTab('products'); openAdminProductModal(${product.id});" title="Quick Edit Product"><i class="fas fa-pen"></i> Edit</button>` : '';

    const badgeHTML = isSoldOut ? 
      `<div class="product-badge sold-out-badge"><i class="fas fa-ban"></i> 🔴 SOLD OUT</div>` : 
      `<div class="product-badge"><i class="fas fa-industry"></i> Factory Direct</div>`;

    const cartBtnHTML = isSoldOut ?
      `<button class="add-to-cart-btn disabled" disabled onclick="event.stopPropagation(); alert('This item is currently out of stock.');" style="background: #e74c3c; cursor: not-allowed; opacity: 0.85; flex: 1;"><i class="fas fa-times-circle"></i> Out of Stock</button>` :
      `<button class="add-to-cart-btn" style="flex: 1; padding: 10px 8px; font-size: 0.8rem;" onclick="event.stopPropagation(); openProductModal(${product.id})"><i class="fas fa-cubes"></i> View Tiers</button>`;

    const cardHTML = `
      <div class="product-card ${isSoldOut ? 'sold-out-card' : ''}" onclick="openProductModal(${product.id})">
        <div class="product-image skeleton-wrapper">
          <img src="${imgUrl}" alt="${product.name}" loading="lazy" class="img-loading" onload="onImageLoad(this)" onerror="onImageError(this, '/Logo-2.webp')">
          ${badgeHTML}
          ${adminEditBtnHTML}
        </div>
        <div class="product-info">
          <div class="category">${product.category} &bull; OEM/ODM</div>
          <h3 style="font-size: 1.15rem;">${product.name}</h3>
          <div class="moq-tag-card"><i class="fas fa-cubes" style="color: #1e5967;"></i> Min. Order: <strong>${moq} Pieces</strong></div>
          <div class="b2b-price-range" style="margin-top: 8px;">${priceRange}</div>
          <p class="product-desc" style="margin-top: 6px; font-size: 0.82rem;">${product.description}</p>
          <div style="display: flex; gap: 8px; margin-top: 12px; align-items: center;">
            ${cartBtnHTML}
            <button onclick="event.stopPropagation(); inquireProductOnWhatsApp('${(product.name || '').replace(/'/g, "\\'")}', ${moq}, '${product.category}', '${(priceRange || '').replace(/'/g, "\\'")}')" class="wa-card-inquire-btn" style="flex: 1.1; padding: 10px 8px; background: #25d366; color: white; border: none; border-radius: 25px; font-size: 0.8rem; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; box-shadow: 0 3px 10px rgba(37,211,102,0.35); transition: transform 0.2s;" title="Inquire about ${product.name} on WhatsApp (+91 9305834431)"><i class="fab fa-whatsapp" style="font-size: 1.1rem;"></i> WhatsApp Inquiry</button>
          </div>
        </div>
      </div>
    `;

    const cat = (product.category || '').toLowerCase();

    if (cat === 'herbal') {
      if (herbalGrid) herbalGrid.insertAdjacentHTML('beforeend', cardHTML);
      if (herbalGridFull) herbalGridFull.insertAdjacentHTML('beforeend', cardHTML);
    } else if (cat === 'spices') {
      if (spicesGrid) spicesGrid.insertAdjacentHTML('beforeend', cardHTML);
    } else if (cat === 'copperware') {
      if (copperGrid) copperGrid.insertAdjacentHTML('beforeend', cardHTML);
    }
  });

  initSkeletonLoaders();
}

// ===== PRODUCT DETAIL MODAL (ALIBABA B2B WHOLESALE) =====
async function openProductModal(id) {
  let product = productsData.find(p => p.id === id);

  if (!product) {
    try {
      const res = await fetch(`/api/products/${id}`);
      const data = await res.json();
      if (data.success) product = data.product;
    } catch (err) {
      console.error(err);
      return;
    }
  }

  if (!product) return;
  currentModalProduct = product;

  const mainImgUrl = product.image.startsWith('/') ? product.image : '/' + product.image;

  // Main Image
  const pmMainImg = document.getElementById('pmMainImg');
  if (pmMainImg) {
    const parent = pmMainImg.closest('.pm-main-img-wrap, .skeleton-wrapper');
    if (parent) parent.classList.remove('loaded');
    pmMainImg.classList.remove('loaded-img', 'loaded');
    pmMainImg.classList.add('img-loading');
    pmMainImg.src = mainImgUrl;
    pmMainImg.onload = () => onImageLoad(pmMainImg);
    pmMainImg.onerror = () => onImageError(pmMainImg, '/Logo-2.webp');
  }

  // Thumbnails
  const thumbContainer = document.getElementById('pmThumbnails');
  if (thumbContainer) {
    thumbContainer.innerHTML = '';
    const thumbs = product.thumbnails && product.thumbnails.length ? product.thumbnails : [mainImgUrl];
    
    thumbs.forEach((thumb, idx) => {
      const tUrl = thumb.startsWith('/') ? thumb : '/' + thumb;
      const img = document.createElement('img');
      img.src = tUrl;
      img.className = `pm-thumb ${idx === 0 ? 'active' : ''} img-loading`;
      img.onload = () => onImageLoad(img);
      img.onerror = () => onImageError(img, '/Logo-2.webp');
      img.onclick = () => {
        if (pmMainImg) {
          const parent = pmMainImg.closest('.pm-main-img-wrap, .skeleton-wrapper');
          if (parent) parent.classList.remove('loaded');
          pmMainImg.classList.remove('loaded-img', 'loaded');
          pmMainImg.classList.add('img-loading');
          pmMainImg.src = tUrl;
          pmMainImg.onload = () => onImageLoad(pmMainImg);
          pmMainImg.onerror = () => onImageError(pmMainImg, '/Logo-2.webp');
        }
        document.querySelectorAll('.pm-thumb').forEach(t => t.classList.remove('active'));
        img.classList.add('active');
      };
      thumbContainer.appendChild(img);
    });
  }

  // Set B2B Modal Badges & Titles
  const pmMoqBadge = document.getElementById('pmMoqBadge');
  const pmTitle = document.getElementById('pmTitle');
  const pmDesc = document.getElementById('pmDesc');
  const pmTierGrid = document.getElementById('pmTierGrid');
  const pmCustomization = document.getElementById('pmCustomization');

  if (pmMoqBadge) pmMoqBadge.innerHTML = `<i class="fas fa-cubes"></i> Min. Order: ${product.moq || 100} Pcs`;
  if (pmTitle) pmTitle.textContent = product.name;
  if (pmDesc) pmDesc.textContent = product.description;

  // Render Volume Price Tiers Grid (Alibaba Style)
  if (pmTierGrid) {
    pmTierGrid.innerHTML = '';
    const tiers = product.priceTiers || [
      { minQty: product.moq || 100, maxQty: (product.moq || 100)*5 - 1, price: product.price, label: `${product.moq || 100}-${(product.moq || 100)*5 - 1} pcs` },
      { minQty: (product.moq || 100)*5, maxQty: (product.moq || 100)*10 - 1, price: Math.round(product.price * 0.72), label: `${(product.moq || 100)*5}-${(product.moq || 100)*10 - 1} pcs` },
      { minQty: (product.moq || 100)*10, maxQty: null, price: Math.round(product.price * 0.50), label: `${(product.moq || 100)*10}+ pcs` }
    ];

    tiers.forEach((t, idx) => {
      pmTierGrid.insertAdjacentHTML('beforeend', `
        <div class="tier-box ${idx === 0 ? 'active-tier' : ''}" onclick="selectTierQty(${t.minQty})">
          <div class="tier-qty">${t.label || (t.minQty + (t.maxQty ? '-' + t.maxQty : '+') + ' pcs')}</div>
          <div class="tier-price">₹${t.price}</div>
          <div class="tier-label">Factory Direct</div>
        </div>
      `);
    });
  }

  // Render Customization Tags
  if (pmCustomization) {
    pmCustomization.innerHTML = '';
    const customs = product.customization || [
      "Custom Brand Logo & Label Printing",
      "Custom Bottle / Box Packaging",
      "Custom Herbal Concentration / OEM Formulation",
      "COA & Lab Test Certificates Included"
    ];
    customs.forEach(c => {
      pmCustomization.insertAdjacentHTML('beforeend', `<span class="custom-tag"><i class="fas fa-check" style="color: #27ae60;"></i> ${c}</span>`);
    });
  }

  // Ingredients
  const ingContainer = document.getElementById('pmIngredients');
  if (ingContainer) {
    ingContainer.innerHTML = '';
    (product.ingredients || ['100% Pure & Organic Extract', 'Lab Certified Quality']).forEach(ing => {
      ingContainer.insertAdjacentHTML('beforeend', `<li><i class="fas fa-leaf"></i> ${ing}</li>`);
    });
  }

  // Specifications
  const specContainer = document.getElementById('pmSpecs');
  if (specContainer) {
    specContainer.innerHTML = '';
    (product.specs || ['COA & Heavy Metal Tested', 'Made in India', 'Export Standard']).forEach(spec => {
      specContainer.insertAdjacentHTML('beforeend', `<li><i class="fas fa-check-circle"></i> ${spec}</li>`);
    });
  }

  // Lead Time & Capacity
  const delDateEl = document.getElementById('pmDeliveryDate');
  const capEl = document.getElementById('pmSupplyCapacity');
  if (delDateEl) delDateEl.textContent = `Lead Time: ${product.leadTime || '7 - 12 Days (Port Dispatch)'}`;
  if (capEl) capEl.textContent = `Capacity: ${product.supplyCapacity || '100,000 Pcs / Month'}`;

  // Set default quantity input to MOQ
  const qtyInput = document.getElementById('pmQtyInput');
  if (qtyInput) {
    qtyInput.value = product.moq || 100;
  }
  updateModalPricingSlab();

  // Show Modal
  const modalOverlay = document.getElementById('productModalOverlay');
  if (modalOverlay) {
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    setupImageHoverZoom();
  }
}

// B2B Live Order Quantity & Subtotal Calculator
function updateModalPricingSlab() {
  if (!currentModalProduct) return;
  const qtyInput = document.getElementById('pmQtyInput');
  const moq = currentModalProduct.moq || 100;
  const qty = Math.max(1, parseInt(qtyInput ? qtyInput.value : moq, 10) || 1);
  
  let unitPrice = currentModalProduct.price || 500;
  let activeTierIdx = 0;
  
  const tiers = currentModalProduct.priceTiers;
  if (tiers && Array.isArray(tiers) && tiers.length > 0) {
    tiers.forEach((tier, idx) => {
      if (qty >= tier.minQty && (tier.maxQty === null || qty <= tier.maxQty)) {
        unitPrice = tier.price;
        activeTierIdx = idx;
      }
    });
    const lastTier = tiers[tiers.length - 1];
    if (qty >= lastTier.minQty) {
      unitPrice = lastTier.price;
      activeTierIdx = tiers.length - 1;
    }
  } else if (qty < moq && currentModalProduct.samplePrice) {
    unitPrice = currentModalProduct.samplePrice;
  }

  // Highlight active tier box in UI
  const tierBoxes = document.querySelectorAll('.tier-box');
  tierBoxes.forEach((box, i) => {
    if (i === activeTierIdx) box.classList.add('active-tier');
    else box.classList.remove('active-tier');
  });

  const total = unitPrice * qty;
  const unitPriceEl = document.getElementById('pmCalcUnitPrice');
  const totalEl = document.getElementById('pmCalcTotal');
  const moqWarn = document.getElementById('pmMoqWarning');

  if (unitPriceEl) unitPriceEl.textContent = `₹${unitPrice.toLocaleString('en-IN')} / pc`;
  if (totalEl) totalEl.textContent = `₹${total.toLocaleString('en-IN')}`;

  const isBelowMoq = qty < moq;
  if (moqWarn) moqWarn.style.display = isBelowMoq ? 'block' : 'none';
}

function selectTierQty(qty) {
  const qtyInput = document.getElementById('pmQtyInput');
  if (qtyInput) {
    qtyInput.value = qty;
    updateModalPricingSlab();
  }
}

function addSampleToCart() {
  if (!currentModalProduct) return;
  const sampleQty = 1;
  const samplePrice = currentModalProduct.samplePrice || currentModalProduct.price;
  const imgUrl = currentModalProduct.image.startsWith('/') ? currentModalProduct.image : '/' + currentModalProduct.image;
  addToCart(currentModalProduct.id, currentModalProduct.name + ' (Sample Pack)', samplePrice, imgUrl, sampleQty);
  closeProductModal();
  openCart();
  alert('🧪 Sample Pack added to your cart! You can test quality before placing full bulk quantities.');
}

function openRfqModal(productId = null) {
  const modal = document.getElementById('rfqModal');
  const prodNameInput = document.getElementById('rfqProductName');
  const prodIdInput = document.getElementById('rfqProductId');
  
  if (productId && productsData) {
    const p = productsData.find(item => item.id === productId);
    if (p) {
      if (prodNameInput) prodNameInput.value = p.name + ` (Min. Order: ${p.moq || 100} Pcs)`;
      if (prodIdInput) prodIdInput.value = p.id;
    }
  } else if (currentModalProduct) {
    if (prodNameInput) prodNameInput.value = currentModalProduct.name + ` (Min. Order: ${currentModalProduct.moq || 100} Pcs)`;
    if (prodIdInput) prodIdInput.value = currentModalProduct.id;
  } else {
    if (prodNameInput) prodNameInput.value = 'General Wholesale / OEM Contract Manufacturing Inquiry';
    if (prodIdInput) prodIdInput.value = '';
  }
  
  if (modal) modal.classList.add('active');
}

function openRfqModalFromProduct() {
  if (currentModalProduct) {
    const pId = currentModalProduct.id;
    closeProductModal();
    openRfqModal(pId);
  }
}

function closeRfqModal(event) {
  if (event && event.target !== event.currentTarget) return;
  const modal = document.getElementById('rfqModal');
  if (modal) modal.classList.remove('active');
}

async function submitRfq(event) {
  event.preventDefault();
  const submitBtn = event.target.querySelector('button[type="submit"]');
  const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';
  
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending Quotation...';
  }

  const productId = document.getElementById('rfqProductId').value;
  const productName = document.getElementById('rfqProductName').value || 'Herbal Product';
  const companyName = document.getElementById('rfqCompanyName').value || 'N/A';
  const contactName = document.getElementById('rfqContactName').value || 'Buyer';
  const email = document.getElementById('rfqEmail').value || '';
  const phone = document.getElementById('rfqPhone').value || '';
  const targetQuantity = document.getElementById('rfqQuantity').value || '500';
  const shippingCountry = document.getElementById('rfqCountry').value || 'International';
  const customizationDetails = document.getElementById('rfqCustomization').value || '';

  // 1. Silent Post to Server Backend Store & SMTP Mailer
  try {
    await fetch('/api/rfq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId, productName, companyName, contactName, email, phone, targetQuantity, shippingCountry, customizationDetails
      })
    });
  } catch (err) {}

  // 2. Direct Silent Post to smart.mehra1208@gmail.com inbox via FormSubmit API (NO REDIRECTS, NO NEW TABS!)
  try {
    await fetch('https://formsubmit.co/ajax/smart.mehra1208@gmail.com', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        _subject: `📦 NEW BULK QUOTATION: ${productName} (${targetQuantity} Pcs) - ${companyName || contactName}`,
        Product_Name: productName,
        Target_Quantity: targetQuantity + ' Pieces',
        Buyer_Contact_Name: contactName,
        Company_Name: companyName,
        Buyer_Email: email,
        Buyer_Phone_WhatsApp: phone,
        Destination_Country: shippingCountry,
        Customization_Requirements: customizationDetails || 'Standard Wholesale Request'
      })
    });
  } catch (err) {}

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnHtml;
  }

  // 3. Clean On-Page Checkmark Alert (100% SILENT ON WEBSITE!)
  alert(`✅ BULK QUOTATION SENT DIRECTLY!\n\nThank you ${contactName}! Your bulk quotation request for "${productName}" (${targetQuantity} Pcs) has been transmitted directly to smart.mehra1208@gmail.com.\n\nOur export sales team will review your inquiry and email you a formal quotation & PDF catalog shortly.`);
  closeRfqModal();
}

function closeProductModal(event) {
  if (event && event.target !== event.currentTarget) return;
  const modalOverlay = document.getElementById('productModalOverlay');
  if (modalOverlay) {
    modalOverlay.classList.remove('active');
    document.body.style.overflow = 'auto';
  }
  currentModalProduct = null;
}

function addToCartFromModal() {
  if (!currentModalProduct) return;
  const qtyInput = document.getElementById('pmQtyInput');
  const qty = Math.max(1, parseInt(qtyInput ? qtyInput.value : (currentModalProduct.moq || 100), 10) || 1);
  const imgUrl = currentModalProduct.image.startsWith('/') ? currentModalProduct.image : '/' + currentModalProduct.image;
  addToCart(currentModalProduct.id, currentModalProduct.name, currentModalProduct.price, imgUrl, qty);
  closeProductModal();
  openCart();
}

function buyNow() {
  if (!currentModalProduct) return;
  const qtySelect = document.getElementById('pmQtySelect');
  const qty = parseInt(qtySelect ? qtySelect.value : 1, 10) || 1;
  const imgUrl = currentModalProduct.image.startsWith('/') ? currentModalProduct.image : '/' + currentModalProduct.image;
  addToCart(currentModalProduct.id, currentModalProduct.name, currentModalProduct.price, imgUrl, qty);
  closeProductModal();
  openCheckout();
}

// ===== CART MANAGEMENT =====
function addToCart(id, name, price, image, qty = 1) {
  const existing = cart.find(item => item.id === id);
  if (existing) {
    existing.quantity += qty;
  } else {
    cart.push({ id, name, price, image, quantity: qty });
  }
  saveCart();
  updateCartUI();
}

function updateQuantity(id, delta) {
  const item = cart.find(i => i.id === id);
  if (item) {
    item.quantity += delta;
    if (item.quantity <= 0) {
      cart = cart.filter(i => i.id !== id);
    }
  }
  saveCart();
  updateCartUI();
}

function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  saveCart();
  updateCartUI();
}

function applyPromoCode() {
  const input = document.getElementById('promoCodeInput');
  const code = (input ? input.value : '').trim().toUpperCase();

  if (code === 'KIYAN10' || code === 'KIYAN10') {
    appliedPromoCode = code;
    alert('🎉 Promo Code KIYAN10 Applied! 10% Extra Discount unlocked!');
    updateCartUI();
  } else if (code === 'KIYAN20') {
    appliedPromoCode = code;
    alert('🎉 Special Promo Code KIYAN20 Applied! 20% Extra Discount unlocked!');
    updateCartUI();
  } else if (code === '') {
    alert('Please enter a promo code.');
  } else {
    alert('Invalid Promo Code. Try using "KIYAN10" or "KIYAN20"');
  }
}

function saveCart() {
  sessionStorage.setItem('kiyan_cart', JSON.stringify(cart));
}

async function updateCartUI() {
  const cartCountEl = document.getElementById('cartCount');
  const cartItemsEl = document.getElementById('cartItems');
  const cartTotalsEl = document.getElementById('cartTotals');

  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  if (cartCountEl) cartCountEl.textContent = totalQuantity;

  if (cart.length === 0) {
    if (cartItemsEl) cartItemsEl.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 40px;">Your cart is currently empty.</p>';
    if (cartTotalsEl) cartTotalsEl.style.display = 'none';
    return;
  }

  // Calculate totals via Server API
  try {
    const res = await fetch('/api/cart/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: cart, promoCode: appliedPromoCode })
    });
    const data = await res.json();

    if (data.success) {
      const summary = data.summary;

      if (cartItemsEl) {
        cartItemsEl.innerHTML = data.items.map(item => {
          const sampleTag = item.isSample ? `<span style="font-size: 0.72rem; background: #eef7f6; color: #1e5967; padding: 2px 6px; border-radius: 4px; font-weight: 700;">Sample Pack</span>` : `<span style="font-size: 0.72rem; background: #10302b; color: #ffd700; padding: 2px 6px; border-radius: 4px; font-weight: 700;">Bulk Order (${item.quantity} Pcs)</span>`;
          return `
          <div class="cart-item">
            <img src="${item.image}" alt="${item.name}" onerror="this.src='/Logo-2.webp'">
            <div class="cart-item-info">
              <h4>${item.name}</h4>
              <div style="margin: 3px 0;">${sampleTag}</div>
              <div class="price">₹${item.price.toLocaleString('en-IN')} / pc &bull; Total: <strong>₹${item.itemTotal.toLocaleString('en-IN')}</strong></div>
              <div class="cart-item-qty" style="margin-top: 6px;">
                <button class="qty-btn" onclick="updateQuantity(${item.id}, -10)">-10</button>
                <button class="qty-btn" onclick="updateQuantity(${item.id}, -1)">-1</button>
                <span style="font-weight: 800; min-width: 40px; text-align: center;">${item.quantity}</span>
                <button class="qty-btn" onclick="updateQuantity(${item.id}, 1)">+1</button>
                <button class="qty-btn" onclick="updateQuantity(${item.id}, 10)">+10</button>
                <button class="cart-item-remove" onclick="removeFromCart(${item.id})"><i class="fas fa-trash-alt"></i></button>
              </div>
            </div>
          </div>
        `;
        }).join('');
      }

      if (cartTotalsEl) {
        cartTotalsEl.style.display = 'block';
        const subEl = document.getElementById('cartSubtotal');
        const sgstEl = document.getElementById('cartSGST');
        const igstEl = document.getElementById('cartIGST');
        const totEl = document.getElementById('cartTotal');

        if (subEl) subEl.textContent = `₹${summary.subtotal.toLocaleString('en-IN')}`;
        if (sgstEl) sgstEl.textContent = `₹${summary.sgst.toLocaleString('en-IN')}`;
        if (igstEl) igstEl.textContent = `₹${summary.igst.toLocaleString('en-IN')}`;
        if (totEl) totEl.textContent = `₹${summary.grandTotal.toLocaleString('en-IN')}`;

        // Also update Checkout modal summary fields
        const mSub = document.getElementById('modalSubtotal');
        const mSgst = document.getElementById('modalSGST');
        const mIgst = document.getElementById('modalIGST');
        const mTot = document.getElementById('modalTotal');

        if (mSub) mSub.textContent = `₹${summary.subtotal.toLocaleString('en-IN')}`;
        if (mSgst) mSgst.textContent = `₹${summary.sgst.toLocaleString('en-IN')}`;
        if (mIgst) mIgst.textContent = `₹${summary.igst.toLocaleString('en-IN')}`;
        if (mTot) mTot.textContent = `₹${summary.grandTotal.toLocaleString('en-IN')}`;
      }
    }
  } catch (err) {
    console.error('Error updating cart totals:', err);
  }
}

function openCart() {
  const overlay = document.getElementById('cartOverlay');
  const drawer = document.getElementById('cartDrawer');
  if (overlay) overlay.classList.add('active');
  if (drawer) drawer.classList.add('active');
}

function closeCart() {
  const overlay = document.getElementById('cartOverlay');
  const drawer = document.getElementById('cartDrawer');
  if (overlay) overlay.classList.remove('active');
  if (drawer) drawer.classList.remove('active');
}

// ===== CHECKOUT FORM =====
function openCheckout() {
  if (cart.length === 0) {
    alert('Your shopping cart is empty!');
    return;
  }
  closeCart();

  // If user is logged in, auto fill customer form
  updateAuthUI();

  const modal = document.getElementById('checkoutModal');
  const formContainer = document.getElementById('checkoutFormContainer');
  const orderSuccess = document.getElementById('orderSuccess');

  if (modal) modal.classList.add('active');
  if (formContainer) formContainer.style.display = 'block';
  if (orderSuccess) orderSuccess.classList.remove('active');
}

function closeCheckout() {
  const modal = document.getElementById('checkoutModal');
  if (modal) modal.classList.remove('active');
}

function enableAddressEdit() {
  const addr = document.getElementById('customerAddress');
  const city = document.getElementById('customerCity');
  const pin = document.getElementById('customerPin');
  if (addr) {
    addr.focus();
    addr.scrollIntoView({ behavior: 'smooth', block: 'center' });
    addr.style.borderColor = 'var(--accent-gold)';
    addr.style.boxShadow = '0 0 12px rgba(211, 150, 68, 0.4)';
  }
  if (city) city.style.borderColor = 'var(--accent-gold)';
  if (pin) pin.style.borderColor = 'var(--accent-gold)';

  const banner = document.getElementById('savedAddressBanner');
  if (banner) {
    banner.style.background = 'rgba(211, 150, 68, 0.18)';
    banner.style.borderColor = 'var(--accent-gold)';
  }
}

function setupImageHoverZoom() {
  const wrap = document.querySelector('.pm-main-img-wrap');
  const img = document.getElementById('pmMainImg');
  if (!wrap || !img) return;

  wrap.onmousemove = function(e) {
    const rect = wrap.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    img.style.transformOrigin = `${x}% ${y}%`;
  };

  wrap.onmouseleave = function() {
    img.style.transformOrigin = 'center center';
  };

  wrap.ontouchmove = function(e) {
    if (e.touches && e.touches[0]) {
      const touch = e.touches[0];
      const rect = wrap.getBoundingClientRect();
      const x = ((touch.clientX - rect.left) / rect.width) * 100;
      const y = ((touch.clientY - rect.top) / rect.height) * 100;
      img.style.transformOrigin = `${x}% ${y}%`;
    }
  };
}

function selectPayment(method, element) {
  document.querySelectorAll('.payment-option').forEach(opt => opt.classList.remove('selected'));
  element.classList.add('selected');
}

async function placeOrder(event) {
  event.preventDefault();

  const nameEl = document.getElementById('customerName');
  const emailEl = document.getElementById('customerEmail');
  const phoneEl = document.getElementById('customerPhone');
  const addrEl = document.getElementById('customerAddress');
  const cityEl = document.getElementById('customerCity');
  const pinEl = document.getElementById('customerPin');

  const customerName = nameEl ? nameEl.value : '';
  const customerEmail = emailEl ? emailEl.value : '';
  const customerPhone = phoneEl ? phoneEl.value : '';
  const customerAddress = addrEl ? addrEl.value : '';
  const customerCity = cityEl ? cityEl.value : '';
  const customerPin = pinEl ? pinEl.value : '';

  const selectedPaymentEl = document.querySelector('.payment-option.selected');
  const paymentText = selectedPaymentEl ? selectedPaymentEl.textContent : '';
  const isRazorpay = paymentText.includes('Razorpay') || paymentText.includes('Online');
  const paymentMethod = isRazorpay ? 'Razorpay Online Payment' : 'Cash on Delivery';

  try {
    // 1. Submit Order record to Backend API
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName,
        customerEmail,
        customerPhone,
        customerAddress,
        customerCity,
        customerPin,
        paymentMethod,
        items: cart,
        promoCode: appliedPromoCode,
        userEmail: currentUser ? currentUser.email : ''
      })
    });

    const data = await res.json();
    if (!data.success) {
      alert(data.message || 'Order creation failed');
      return;
    }

    const createdOrder = data.order;

    if (isRazorpay) {
      // 2. Initialize Razorpay Payment Gateway Order
      const rzpRes = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: createdOrder.financials.totalPayable,
          receipt: createdOrder.orderId,
          currency: 'INR'
        })
      });
      const rzpData = await rzpRes.json();

      if (!rzpData.success) {
        alert('Razorpay gateway initialization failed: ' + (rzpData.message || 'Error'));
        return;
      }

      // 3. Open Razorpay Payment SDK Modal Popup
      await loadRazorpaySdk();
      if (typeof Razorpay !== 'undefined') {
        const options = {
          key: rzpData.keyId,
          amount: rzpData.amount,
          currency: rzpData.currency || 'INR',
          name: 'Kiyan Wellness Direct',
          description: `Payment for Order ${createdOrder.orderId}`,
          image: '/images/kiyan-logo.png',
          order_id: rzpData.orderId,
          prefill: {
            name: customerName,
            email: customerEmail,
            contact: customerPhone
          },
          theme: {
            color: '#1e5967'
          },
          handler: async function (response) {
            // 4. Verify Razorpay Payment Signature
            try {
              const verifyRes = await fetch('/api/payment/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id || rzpData.orderId,
                  razorpay_payment_id: response.razorpay_payment_id || `pay_${Math.random().toString(36).substring(2, 12)}`,
                  razorpay_signature: response.razorpay_signature || '',
                  dbOrderId: createdOrder.orderId
                })
              });
              const verifyData = await verifyRes.json();
              showOrderSuccessScreen(createdOrder, verifyData.paymentId || response.razorpay_payment_id || 'ONLINE_PAID');
            } catch (vErr) {
              showOrderSuccessScreen(createdOrder, response.razorpay_payment_id || 'ONLINE_PAID');
            }
          },
          modal: {
            ondismiss: function () {
              alert('Payment process was cancelled. You can retry payment or select Cash on Delivery.');
            }
          }
        };

        const rzp = new Razorpay(options);
        rzp.open();
      } else {
        // Test fallback verification if offline
        const verifyRes = await fetch('/api/payment/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id: rzpData.orderId,
            razorpay_payment_id: `pay_test_${Math.random().toString(36).substring(2, 10)}`,
            dbOrderId: createdOrder.orderId
          })
        });
        const verifyData = await verifyRes.json();
        showOrderSuccessScreen(createdOrder, verifyData.paymentId || 'TEST_PAYMENT_SUCCESS');
      }
    } else {
      // Cash on Delivery Order Flow
      showOrderSuccessScreen(createdOrder, 'COD');
    }
  } catch (err) {
    console.error('Order placement error:', err);
    alert('Order placement failed. Please try again.');
  }
}

function showOrderSuccessScreen(order, paymentId) {
  const formContainer = document.getElementById('checkoutFormContainer');
  if (formContainer) formContainer.style.display = 'none';

  const successEl = document.getElementById('orderSuccess');
  if (successEl) {
    const isPaid = paymentId && paymentId !== 'COD';
    successEl.innerHTML = `
      <i class="fas fa-check-circle" style="color: #27ae60; font-size: 3.5rem;"></i>
      <h2 style="color: var(--deep-green); margin-top: 10px;">Order Placed Successfully!</h2>
      <p style="font-size: 1.2rem; color: var(--deep-green); font-weight: 800; margin: 10px 0;">Order ID: ${order.orderId}</p>
      ${isPaid ? `<div style="background: rgba(39, 174, 96, 0.12); color: #1e8449; padding: 8px 16px; border-radius: 20px; font-weight: 700; font-size: 0.92rem; display: inline-block; margin: 8px 0;"><i class="fas fa-shield-alt"></i> Razorpay Verified Payment ID: <strong>${paymentId}</strong></div>` : ''}
      <p>Thank you <strong>${order.customer.name}</strong>. Confirmation email sent to <strong>${order.customer.email}</strong>.</p>
      <p style="margin-top: 10px; font-size: 0.95rem; color: var(--text-muted);">Estimated Delivery: <strong>${order.estimatedDelivery}</strong></p>
      <div style="display: flex; gap: 10px; justify-content: center; margin-top: 25px; flex-wrap: wrap;">
        <button class="btn-main" onclick="closeCheckout(); cart = []; saveCart(); updateCartUI(); openUserOrdersModal();">Track & View My Orders</button>
        <button class="btn-main" style="background: var(--royal-emerald);" onclick="closeCheckout(); cart = []; saveCart(); updateCartUI();">Continue Shopping</button>
      </div>
    `;
    successEl.classList.add('active');
  }
}

// ===== CHATBOT SYSTEM =====
function toggleChatbot() {
  const win = document.getElementById('chatbotWindow');
  if (win) win.classList.toggle('active');
}

async function sendChatbotMessage(textMessage) {
  const inputEl = document.getElementById('chatbotInput');
  const message = textMessage || (inputEl ? inputEl.value.trim() : '');
  if (!message) return;

  if (!textMessage && inputEl) inputEl.value = '';

  const messagesContainer = document.getElementById('chatbotMessages');
  if (!messagesContainer) return;

  messagesContainer.insertAdjacentHTML('beforeend', `
    <div class="chatbot-msg user">
      <div class="msg-bubble">${message}</div>
    </div>
  `);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  try {
    const res = await fetch('/api/chatbot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    const data = await res.json();

    if (data.success) {
      let optionsHTML = '';
      if (data.options && data.options.length) {
        optionsHTML = `<div class="chatbot-options">` +
          data.options.map(opt => `<button class="chatbot-opt-btn" onclick="sendChatbotMessage('${opt}')">${opt}</button>`).join('') +
          `</div>`;
      }

      messagesContainer.insertAdjacentHTML('beforeend', `
        <div class="chatbot-msg bot">
          <div class="msg-bubble">${data.reply.replace(/\n/g, '<br>')}${optionsHTML}</div>
        </div>
      `);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  } catch (err) {
    console.error('Chatbot error:', err);
  }
}

// ===== HERO SLIDER =====
function initSlider() {
  const slides = document.querySelectorAll('.hero-section .slide');
  if (!slides.length) return;

  setInterval(() => {
    const homeSec = document.getElementById('home');
    if (homeSec && homeSec.classList.contains('active-page')) {
      currentSlide = (currentSlide + 1) % slides.length;
      goToSlide(currentSlide);
    }
  }, 5500);
}

function goToSlide(index) {
  const slides = document.querySelectorAll('.hero-section .slide');
  const dots = document.querySelectorAll('.hero-section .dot');

  slides.forEach(s => s.classList.remove('active'));
  dots.forEach(d => d.classList.remove('active'));

  if (slides[index]) slides[index].classList.add('active');
  if (dots[index]) dots[index].classList.add('active');
  currentSlide = index;
}

// ==========================================
// NO-CODE ADMIN PANEL & CMS LOGIC
// ==========================================

async function fetchAndApplySiteContent() {
  try {
    const res = await fetch('/api/site/content');
    const data = await res.json();
    if (data.success && data.content) {
      applySiteContentToDOM(data.content);
    }
  } catch (err) {
    console.error('Error fetching site content:', err);
  }
}

function applySiteContentToDOM(content) {
  if (!content) return;

  // Slide 1
  const taglineEl = document.getElementById('siteHeroTagline');
  if (taglineEl && content.heroTagline) {
    taglineEl.innerHTML = `<i class="fas fa-crown"></i> ${content.heroTagline}`;
  }

  const titleEl = document.getElementById('siteHeroTitle');
  if (titleEl && content.heroTitle) {
    titleEl.innerHTML = content.heroTitle;
  }

  const descEl = document.getElementById('siteHeroDesc');
  if (descEl && content.heroDesc) {
    descEl.textContent = content.heroDesc;
  }

  // Slide 2
  const slide2TitleEl = document.getElementById('siteHeroSlide2Title');
  if (slide2TitleEl && content.heroSlide2Title) {
    slide2TitleEl.innerHTML = content.heroSlide2Title;
  }
  const slide2DescEl = document.getElementById('siteHeroSlide2Desc');
  if (slide2DescEl && content.heroSlide2Desc) {
    slide2DescEl.textContent = content.heroSlide2Desc;
  }

  // Slide 3
  const slide3TitleEl = document.getElementById('siteHeroSlide3Title');
  if (slide3TitleEl && content.heroSlide3Title) {
    slide3TitleEl.innerHTML = content.heroSlide3Title;
  }
  const slide3DescEl = document.getElementById('siteHeroSlide3Desc');
  if (slide3DescEl && content.heroSlide3Desc) {
    slide3DescEl.textContent = content.heroSlide3Desc;
  }

  // Marquee Ticker
  const marqueeTrack = document.querySelector('.marquee-track');
  if (marqueeTrack && content.marqueeText) {
    const items = content.marqueeText.split('•').map(i => i.trim()).filter(Boolean);
    const html = items.map(item => `<span><i class="fas fa-leaf"></i> ${item}</span>`).join('');
    marqueeTrack.innerHTML = html + html;
  }

  // About Us
  const aboutPillEl = document.getElementById('siteAboutPill');
  if (aboutPillEl && content.aboutPill) {
    aboutPillEl.textContent = content.aboutPill;
  }

  const aboutTitleEl = document.getElementById('siteAboutTitle');
  if (aboutTitleEl && content.aboutTitle) {
    aboutTitleEl.innerHTML = content.aboutTitle;
  }

  const aboutP1El = document.getElementById('siteAboutP1');
  if (aboutP1El && content.aboutP1) {
    aboutP1El.innerHTML = content.aboutP1;
  }

  const aboutP2El = document.getElementById('siteAboutP2');
  if (aboutP2El && content.aboutP2) {
    aboutP2El.textContent = content.aboutP2;
  }

  // Contact Info & Footer across entire site
  if (content.contactEmail) {
    document.querySelectorAll('.site-contact-email').forEach(el => {
      if (el.tagName === 'A') el.href = `mailto:${content.contactEmail}`;
      el.textContent = content.contactEmail;
    });
  }

  if (content.contactPhone) {
    document.querySelectorAll('.site-contact-phone').forEach(el => {
      if (el.tagName === 'A') el.href = `tel:${content.contactPhone}`;
      el.textContent = content.contactPhone;
    });
  }

  if (content.contactAddress) {
    document.querySelectorAll('.site-contact-address').forEach(el => {
      el.textContent = content.contactAddress;
    });
  }

  if (content.footerDesc) {
    const footerDescEl = document.getElementById('siteFooterDesc');
    if (footerDescEl) footerDescEl.textContent = content.footerDesc;
  }
}

function switchAdminTab(tabName, btnEl = null) {
  const tabs = document.querySelectorAll('.admin-tab-btn');
  tabs.forEach(t => t.classList.remove('active'));

  if (btnEl) {
    btnEl.classList.add('active');
  } else {
    const match = Array.from(tabs).find(t => t.getAttribute('onclick') && t.getAttribute('onclick').includes(tabName));
    if (match) match.classList.add('active');
  }

  const contents = document.querySelectorAll('.admin-tab-content');
  contents.forEach(c => c.classList.remove('active'));

  const targetId = 'adminTab' + tabName.charAt(0).toUpperCase() + tabName.slice(1);
  const target = document.getElementById(targetId);
  if (target) {
    target.classList.add('active');
  }

  if (tabName === 'products') {
    loadAdminProducts();
  } else if (tabName === 'content') {
    loadAdminSiteContent();
  } else if (tabName === 'orders') {
    loadAdminOrders();
  }
}

async function loadAdminProducts() {
  const tbody = document.getElementById('adminProductsTableBody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px;">Loading products...</td></tr>';

  try {
    const res = await fetch('/api/products');
    const data = await res.json();

    if (data.success && data.products) {
      if (data.products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px;">No products found in catalogue.</td></tr>';
        return;
      }

      tbody.innerHTML = data.products.map(p => `
        <tr>
          <td><strong>#${p.id}</strong></td>
          <td><img src="${p.image}" class="admin-prod-thumb" onerror="this.src='/images/kiyan-logo.png'"></td>
          <td><strong>${p.name}</strong></td>
          <td><span class="status-pill confirmed">${p.category}</span></td>
          <td style="font-weight: 700; color: var(--deep-green);">₹${p.price}</td>
          <td style="text-decoration: line-through; color: var(--text-muted);">₹${p.oldPrice || (p.price + 200)}</td>
          <td><small>${p.tag || ''}</small></td>
          <td>${p.isBestseller ? '⭐ Yes' : 'No'}</td>
          <td>
            <button class="admin-action-btn edit" onclick="openAdminProductModal(${p.id})" title="Edit Product"><i class="fas fa-edit"></i> Edit</button>
            <button class="admin-action-btn delete" onclick="deleteAdminProduct(${p.id})" title="Delete Product"><i class="fas fa-trash-alt"></i> Delete</button>
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: red; padding: 20px;">Failed to load products.</td></tr>';
  }
}

function openAdminProductModal(prodId = null) {
  const modal = document.getElementById('adminProductModal');
  const title = document.getElementById('adminProductModalTitle');

  if (!modal) return;

  if (prodId) {
    const prod = productsData.find(p => p.id === prodId);
    title.innerHTML = `<i class="fas fa-edit" style="color: var(--accent-gold);"></i> Edit Herbal Product (#${prodId})`;
    const getEl = (id) => document.getElementById(id);
    if (getEl('adminProdId')) getEl('adminProdId').value = prodId;
    if (getEl('adminProdName')) getEl('adminProdName').value = prod ? prod.name : '';
    if (getEl('adminProdCategory')) getEl('adminProdCategory').value = prod ? prod.category : 'Herbal Products';
    if (getEl('adminProdTag')) getEl('adminProdTag').value = prod ? (prod.tag || '') : '';
    if (getEl('adminProdPrice')) getEl('adminProdPrice').value = prod ? prod.price : '';
    if (getEl('adminProdOldPrice')) getEl('adminProdOldPrice').value = prod ? (prod.oldPrice || '') : '';
    if (getEl('adminProdStock')) getEl('adminProdStock').value = prod ? (prod.stockQuantity !== undefined ? prod.stockQuantity : 15) : 15;
    if (getEl('adminProdRating')) getEl('adminProdRating').value = prod ? (prod.rating || 4.9) : 4.9;
    if (getEl('adminProdReviews')) getEl('adminProdReviews').value = prod ? (prod.reviewsCount || 20) : 20;
    if (getEl('adminProdImage')) getEl('adminProdImage').value = prod ? prod.image : 'images/kiyan-logo.png';
    if (getEl('adminProdDesc')) getEl('adminProdDesc').value = prod ? prod.description : '';
    if (getEl('adminProdIngredients')) getEl('adminProdIngredients').value = prod && prod.ingredients ? prod.ingredients.join(', ') : '';
    if (getEl('adminProdSpecs')) getEl('adminProdSpecs').value = prod && prod.specs ? prod.specs.join(', ') : '';
    if (getEl('adminProdBestseller')) getEl('adminProdBestseller').checked = prod ? !!prod.isBestseller : false;
  } else {
    title.innerHTML = `<i class="fas fa-plus-circle" style="color: var(--accent-gold);"></i> Add New Herbal Product`;
    const getEl = (id) => document.getElementById(id);
    if (getEl('adminProdId')) getEl('adminProdId').value = '';
    if (getEl('adminProductForm')) getEl('adminProductForm').reset();
    if (getEl('adminProdStock')) getEl('adminProdStock').value = '15';
    if (getEl('adminProdRating')) getEl('adminProdRating').value = '4.9';
    if (getEl('adminProdReviews')) getEl('adminProdReviews').value = '25';
    if (getEl('adminProdImage')) getEl('adminProdImage').value = 'images/kiyan-logo.png';
  }

  modal.style.display = 'flex';
}

function closeAdminProductModal(event) {
  if (event && event.target !== event.currentTarget) return;
  const modal = document.getElementById('adminProductModal');
  if (modal) modal.style.display = 'none';
}

async function saveAdminProduct(event) {
  event.preventDefault();

  const getEl = (id) => document.getElementById(id);

  const prodId = getEl('adminProdId') ? getEl('adminProdId').value : '';
  const name = getEl('adminProdName') ? getEl('adminProdName').value : '';
  const category = getEl('adminProdCategory') ? getEl('adminProdCategory').value : 'Herbal Products';
  const tag = getEl('adminProdTag') ? getEl('adminProdTag').value : '';
  const price = Number(getEl('adminProdPrice') ? getEl('adminProdPrice').value : 0);
  const oldPrice = Number(getEl('adminProdOldPrice') ? getEl('adminProdOldPrice').value : 0) || (price + 200);
  const stockQuantity = Number(getEl('adminProdStock') ? getEl('adminProdStock').value : 15);
  const rating = Number(getEl('adminProdRating') ? getEl('adminProdRating').value : 4.9);
  const reviewsCount = Number(getEl('adminProdReviews') ? getEl('adminProdReviews').value : 20);
  const image = getEl('adminProdImage') ? getEl('adminProdImage').value : 'images/kiyan-logo.png';
  const description = getEl('adminProdDesc') ? getEl('adminProdDesc').value : '';
  const ingredients = getEl('adminProdIngredients') ? getEl('adminProdIngredients').value : '';
  const specs = getEl('adminProdSpecs') ? getEl('adminProdSpecs').value : '';
  const isBestseller = getEl('adminProdBestseller') ? getEl('adminProdBestseller').checked : false;

  const payload = { name, category, tag, price, oldPrice, stockQuantity, rating, reviewsCount, image, description, ingredients, specs, isBestseller };

  try {
    const url = prodId ? `/api/admin/products/${prodId}` : '/api/admin/products';
    const method = prodId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (data.success) {
      alert(`Product ${prodId ? 'updated' : 'added'} successfully! 🎉 Changes are now live across the website.`);
      closeAdminProductModal();
      await fetchProducts();
      loadAdminProducts();
      renderAdminStandaloneTable();
    } else {
      alert(data.message || 'Failed to save product.');
    }
  } catch (err) {
    alert('Error saving product: ' + err.message);
  }
}

async function deleteAdminProduct(prodId) {
  if (!confirm(`Are you sure you want to delete Product #${prodId}? This action cannot be undone.`)) return;

  try {
    const res = await fetch(`/api/admin/products/${prodId}`, { method: 'DELETE' });
    const data = await res.json();

    if (data.success) {
      alert('Product deleted successfully! 🗑️');
      await fetchProducts();
      loadAdminProducts();
      renderAdminStandaloneTable();
    } else {
      alert(data.message || 'Failed to delete product.');
    }
  } catch (err) {
    alert('Delete error: ' + err.message);
  }
}

async function loadAdminSiteContent() {
  try {
    const res = await fetch('/api/site/content');
    const data = await res.json();

    if (data.success && data.content) {
      const c = data.content;
      const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
      setVal('adminHeroTagline', c.heroTagline);
      setVal('adminHeroTitle', c.heroTitle);
      setVal('adminHeroDesc', c.heroDesc);
      setVal('adminHeroSlide2Title', c.heroSlide2Title);
      setVal('adminHeroSlide2Desc', c.heroSlide2Desc);
      setVal('adminHeroSlide3Title', c.heroSlide3Title);
      setVal('adminHeroSlide3Desc', c.heroSlide3Desc);
      setVal('adminMarqueeText', c.marqueeText);
      setVal('adminAboutPill', c.aboutPill);
      setVal('adminAboutTitle', c.aboutTitle);
      setVal('adminAboutP1', c.aboutP1);
      setVal('adminAboutP2', c.aboutP2);
      setVal('adminContactEmail', c.contactEmail);
      setVal('adminContactPhone', c.contactPhone);
      setVal('adminContactAddress', c.contactAddress);
      setVal('adminFooterDesc', c.footerDesc);
    }
  } catch (err) {
    console.error('Error loading site content:', err);
  }
}

async function saveAdminSiteContent() {
  const getVal = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
  const payload = {
    heroTagline: getVal('adminHeroTagline'),
    heroTitle: getVal('adminHeroTitle'),
    heroDesc: getVal('adminHeroDesc'),
    heroSlide2Title: getVal('adminHeroSlide2Title'),
    heroSlide2Desc: getVal('adminHeroSlide2Desc'),
    heroSlide3Title: getVal('adminHeroSlide3Title'),
    heroSlide3Desc: getVal('adminHeroSlide3Desc'),
    marqueeText: getVal('adminMarqueeText'),
    aboutPill: getVal('adminAboutPill'),
    aboutTitle: getVal('adminAboutTitle'),
    aboutP1: getVal('adminAboutP1'),
    aboutP2: getVal('adminAboutP2'),
    contactEmail: getVal('adminContactEmail'),
    contactPhone: getVal('adminContactPhone'),
    contactAddress: getVal('adminContactAddress'),
    footerDesc: getVal('adminFooterDesc')
  };

  try {
    const res = await fetch('/api/admin/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (data.success) {
      applySiteContentToDOM(data.content);
      alert('Website Content Updated Successfully! 🎉 Changes are now live on the website.');
    } else {
      alert(data.message || 'Failed to update content.');
    }
  } catch (err) {
    alert('Content update error: ' + err.message);
  }
}

async function loadAdminOrders() {
  const tbody = document.getElementById('adminOrdersTableBody');
  const badge = document.getElementById('adminOrderBadge');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">Loading customer orders...</td></tr>';

  try {
    const res = await fetch('/api/admin/orders');
    const data = await res.json();

    if (data.success && data.orders) {
      if (badge) badge.textContent = data.count;

      if (data.orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 25px;">No orders found yet. Orders placed by users will appear here.</td></tr>';
        return;
      }

      tbody.innerHTML = data.orders.map(o => `
        <tr>
          <td><strong style="color: var(--deep-green);">${o.orderId}</strong></td>
          <td><small>${o.createdAtIST || 'Just Now'}</small></td>
          <td>
            <strong>${o.customerName}</strong><br>
            <small style="color: var(--text-muted);">${o.customerPhone} | ${o.customerEmail}</small>
          </td>
          <td><small style="max-width: 220px; display: block; line-height: 1.4;">${o.customerAddress}</small></td>
          <td>
            <small><strong>${o.paymentMethod || 'COD'}</strong></small><br>
            <span class="status-pill confirmed">${o.paymentStatus || 'Pending'}</span>
          </td>
          <td>
            <small>${(o.items || []).map(i => `${i.name} (x${i.quantity})`).join('<br>')}</small>
          </td>
          <td><strong style="color: var(--deep-green);">₹${o.financials ? o.financials.totalPayable : '0'}</strong></td>
          <td>
            <select onchange="updateAdminOrderStatus('${o.orderId}', this.value)" style="padding: 6px 10px; border-radius: 8px; border: 1px solid #ccc; font-size: 0.85rem; font-weight: 600;">
              <option value="Confirmed" ${o.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
              <option value="Processing" ${o.status === 'Processing' ? 'selected' : ''}>Processing</option>
              <option value="Shipped" ${o.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
              <option value="Delivered" ${o.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
              <option value="Cancelled" ${o.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: red; padding: 20px;">Failed to load orders.</td></tr>';
  }
}

async function updateAdminOrderStatus(orderId, status) {
  try {
    const res = await fetch(`/api/admin/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });

    const data = await res.json();

    if (data.success) {
      alert(`Order ${orderId} status updated to ${status}! 📦`);
      loadAdminOrders();
    } else {
      alert(data.message || 'Failed to update order status.');
    }
  } catch (err) {
    alert('Status update error: ' + err.message);
  }
}

// ==========================================
// STANDALONE ADMIN DASHBOARD & STOCK CONTROL
// ==========================================

function toggleWebsitePreview() {
  const isPreview = sessionStorage.getItem('kiyan_admin_preview');
  if (isPreview) {
    sessionStorage.removeItem('kiyan_admin_preview');
    document.body.classList.add('admin-mode-active');
    renderAdminStandaloneTable();
  } else {
    sessionStorage.setItem('kiyan_admin_preview', 'true');
    document.body.classList.remove('admin-mode-active');
    alert('Website Preview Mode Activated! You can now browse the live customer website. Click the Gold Admin button in top navigation bar anytime to return to Admin Control Center.');
  }
}

async function renderAdminStandaloneTable() {
  const tbody = document.getElementById('dashStandaloneProductsTableBody');
  const totalEl = document.getElementById('dashTotalProducts');
  const inStockEl = document.getElementById('dashInStockProducts');
  const soldOutEl = document.getElementById('dashSoldOutProducts');
  const ordersEl = document.getElementById('dashTotalOrders');

  if (!tbody) return;

  try {
    const searchVal = (document.getElementById('dashSearchInput') ? document.getElementById('dashSearchInput').value : '').toLowerCase().trim();
    const catVal = (document.getElementById('dashCategoryFilter') ? document.getElementById('dashCategoryFilter').value : 'all').toLowerCase();

    let filtered = [...productsData];

    if (catVal !== 'all') {
      filtered = filtered.filter(p => (p.category || '').toLowerCase().includes(catVal));
    }

    if (searchVal) {
      filtered = filtered.filter(p =>
        (p.name || '').toLowerCase().includes(searchVal) ||
        (p.category || '').toLowerCase().includes(searchVal) ||
        String(p.id).includes(searchVal)
      );
    }

    const totalCount = productsData.length;
    const soldOutCount = productsData.filter(p => (p.stockQuantity !== undefined ? p.stockQuantity : 15) === 0).length;
    const inStockCount = totalCount - soldOutCount;

    if (totalEl) totalEl.textContent = totalCount;
    if (inStockEl) inStockEl.textContent = inStockCount;
    if (soldOutEl) soldOutEl.textContent = soldOutCount;

    try {
      const oRes = await fetch('/api/admin/orders');
      const oData = await oRes.json();
      if (ordersEl && oData.success) ordersEl.textContent = oData.count || 0;
    } catch (e) {}

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 30px;">No products match your search.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(p => {
      const qty = p.stockQuantity !== undefined ? p.stockQuantity : 15;
      const isSoldOut = qty === 0;

      return `
        <tr style="${isSoldOut ? 'background: #fff5f5;' : ''}">
          <td><strong>#${p.id}</strong></td>
          <td><img src="${p.image.startsWith('/') ? p.image : '/' + p.image}" class="admin-prod-thumb" onerror="this.src='/images/kiyan-logo.png'"></td>
          <td>
            <strong>${p.name}</strong>
            ${p.isBestseller ? '<br><small style="color: var(--accent-gold); font-weight: 700;">⭐ Bestseller</small>' : ''}
          </td>
          <td><span class="status-pill confirmed">${p.category}</span></td>
          <td style="font-weight: 800; color: var(--deep-green);">₹${p.price}</td>
          <td style="text-decoration: line-through; color: var(--text-muted);">₹${p.oldPrice || (p.price + 200)}</td>
          <td>
            <div style="display: flex; align-items: center; gap: 6px;">
              <input type="number" min="0" value="${qty}" onchange="updateProductStock(${p.id}, this.value)" style="width: 75px; padding: 6px; border-radius: 8px; border: 2px solid ${isSoldOut ? '#e74c3c' : 'var(--deep-green)'}; font-weight: 800; text-align: center; outline: none; background: white;" title="Type 0 to mark as Sold Out">
              <small style="color: var(--text-muted);">Units</small>
            </div>
          </td>
          <td>
            ${isSoldOut ? 
              '<span class="status-pill cancelled" style="background: #e74c3c; color: white; font-weight: 800;"><i class="fas fa-ban"></i> 🔴 SOLD OUT</span>' : 
              `<span class="status-pill delivered" style="background: #e8f5e9; color: #2e7d32; font-weight: 700;"><i class="fas fa-check-circle"></i> 🟢 In Stock (${qty})</span>`
            }
          </td>
          <td>
            <button class="admin-action-btn edit" onclick="openAdminProductModal(${p.id})" title="Edit Product Details"><i class="fas fa-edit"></i> Edit Details</button>
            <button class="admin-action-btn delete" onclick="deleteAdminProduct(${p.id})" title="Delete Product"><i class="fas fa-trash-alt"></i> Delete</button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Error rendering admin standalone table:', err);
  }
}

async function updateProductStock(prodId, newQty) {
  const qty = Math.max(0, parseInt(newQty, 10) || 0);

  try {
    const res = await fetch(`/api/admin/products/${prodId}/stock`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stockQuantity: qty })
    });

    const data = await res.json();

    if (data.success) {
      const prod = productsData.find(p => p.id === prodId);
      if (prod) prod.stockQuantity = qty;

      if (qty === 0) {
        alert(`Product #${prodId} stock quantity set to 0. It is now marked as 🔴 SOLD OUT in bright red on the live website!`);
      }

      renderAdminStandaloneTable();
      renderFilteredProducts();
    } else {
      alert(data.message || 'Failed to update stock.');
    }
  } catch (err) {
    alert('Error updating stock quantity: ' + err.message);
  }
}

// ===== SCROLL REVEAL OBSERVER FOR B2B ANIMATIONS =====
function initScrollReveal() {
  if (!('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
      }
    });
  }, { threshold: 0.08 });

  document.querySelectorAll('.b2b-reveal, .b2b-reveal-scale, .product-card, .oem-step-card, .logistics-card, .cert-badge-box').forEach(el => {
    observer.observe(el);
  });
}

// ===== INTERACTIVE B2B PROFIT & MARGIN CALCULATOR =====
function updateB2BCalculator() {
  const slider = document.getElementById('b2bVolumeSlider');
  const qtyValEl = document.getElementById('sliderQtyValue');
  const unitRateEl = document.getElementById('calcUnitRate');
  const savingsEl = document.getElementById('calcSavings');
  const profitEl = document.getElementById('calcProfit');

  if (!slider) return;

  const qty = parseInt(slider.value, 10) || 500;
  if (qtyValEl) qtyValEl.textContent = `${qty.toLocaleString('en-IN')} Pieces`;

  const baseRetail = 1000;
  let discountPct = 20;
  if (qty >= 500) discountPct = 35;
  if (qty >= 1000) discountPct = 50;
  if (qty >= 2500) discountPct = 60;
  if (qty >= 5000) discountPct = 68;

  const estUnitRate = Math.round(baseRetail * (1 - discountPct / 100));
  const projectedMarginPct = Math.round(((baseRetail - estUnitRate) / estUnitRate) * 100);

  if (unitRateEl) unitRateEl.textContent = `₹${estUnitRate}`;
  if (savingsEl) savingsEl.textContent = `${discountPct}% OFF`;
  if (profitEl) profitEl.textContent = `+${projectedMarginPct}% Margin`;
}

// ===== PDF FULLSCREEN PREVIEW MODAL (LAZY-LOADED CANVAS PROTECTED VIEW) =====
let pdfJsLoadingPromise = null;
function loadPdfJsEngine() {
  if (typeof pdfjsLib !== 'undefined') return Promise.resolve(pdfjsLib);
  if (pdfJsLoadingPromise) return pdfJsLoadingPromise;

  pdfJsLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }
      resolve(pdfjsLib);
    };
    script.onerror = (err) => {
      pdfJsLoadingPromise = null;
      reject(err);
    };
    document.head.appendChild(script);
  });
  return pdfJsLoadingPromise;
}

async function openPdfModal(rawPdfUrl, title = 'PDF Document Viewer') {
  let pdfUrl = rawPdfUrl.replace(/^["']|["']$/g, '').trim();
  let modal = document.getElementById('pdfPreviewModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'pdfPreviewModal';
    modal.className = 'custom-pdf-modal';
    modal.innerHTML = `
      <div class="custom-pdf-modal-content" style="max-width: 950px; width: 95vw; height: 92vh; display: flex; flex-direction: column; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.5);">
        <div class="custom-pdf-modal-header" style="padding: 14px 20px; border-bottom: 1.5px solid #d8e2dc; background: #f9f6f0; display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <img src="/images/kiyan-logo.jpg" alt="Kiyan Export Logo" style="height: 34px; width: auto; background: white; padding: 3px 8px; border-radius: 6px; border: 1px solid #d8e2dc;">
            <div>
              <h3 id="pdfModalTitle" style="margin:0; font-size: 1.1rem; color: #1e5967; font-weight: 700;">PDF Document Viewer</h3>
              <span style="font-size: 0.75rem; color: #666;"><i class="fas fa-shield-alt" style="color: #e74c3c;"></i> Official Kiyan Export Protected PDF (View Only)</span>
            </div>
          </div>
          <div style="display: flex; gap: 10px; align-items: center;">
            <span id="pdfPageCounter" style="padding: 5px 14px; font-size: 0.8rem; background: #eef7f6; color: #1e5967; border-radius: 20px; font-weight: 700;">Loading...</span>
            <span style="padding: 5px 14px; font-size: 0.8rem; background: #e74c3c; color: white; border-radius: 20px; font-weight: 600;"><i class="fas fa-lock"></i> Protected View Only</span>
            <button onclick="closePdfModal()" style="background: rgba(0,0,0,0.06); border: none; font-size: 1.4rem; color: #333; cursor: pointer; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center;" aria-label="Close PDF Modal">&times;</button>
          </div>
        </div>
        <div id="pdfModalCanvasBody" style="flex: 1; overflow-y: auto; background: #525659; padding: 25px 15px; display: flex; flex-direction: column; align-items: center; gap: 25px; user-select: none; -webkit-user-select: none;" oncontextmenu="return false;">
          <div id="pdfLoadingSpinner" style="color: white; font-size: 1.2rem; margin-top: 50px; text-align: center;">
            <i class="fas fa-spinner fa-spin" style="font-size: 2.5rem; margin-bottom: 15px; color: #e74c3c;"></i><br>
            Loading Protected Document Pages...
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closePdfModal();
    });
    modal.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  const titleEl = document.getElementById('pdfModalTitle');
  const bodyEl = document.getElementById('pdfModalCanvasBody');
  const counterEl = document.getElementById('pdfPageCounter');

  if (titleEl) titleEl.textContent = title;
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  if (bodyEl) {
    bodyEl.innerHTML = `
      <div id="pdfLoadingSpinner" style="color: white; font-size: 1.2rem; margin-top: 50px; text-align: center;">
        <i class="fas fa-spinner fa-spin" style="font-size: 2.5rem; margin-bottom: 15px; color: #e74c3c;"></i><br>
        Loading Protected Document Pages...
      </div>`;
  }

  try {
    const pdfLib = await loadPdfJsEngine();
    if (pdfLib) {
      pdfLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const loadingTask = pdfLib.getDocument(pdfUrl);
      const pdf = await loadingTask.promise;

      if (counterEl) counterEl.textContent = `${pdf.numPages} Page${pdf.numPages > 1 ? 's' : ''}`;
      if (bodyEl) bodyEl.innerHTML = '';

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.35 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        canvas.style.maxWidth = '100%';
        canvas.style.height = 'auto';
        canvas.style.boxShadow = '0 6px 20px rgba(0,0,0,0.35)';
        canvas.style.borderRadius = '4px';
        canvas.style.background = 'white';
        canvas.oncontextmenu = () => false;

        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };
        await page.render(renderContext).promise;
        if (bodyEl) bodyEl.appendChild(canvas);
      }
    } else {
      if (bodyEl) bodyEl.innerHTML = `<iframe id="pdfModalIframe" src="${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0" width="100%" height="100%" style="border: none;" oncontextmenu="return false;"></iframe>`;
    }
  } catch (err) {
    console.error('Error rendering protected PDF:', err);
    if (bodyEl) bodyEl.innerHTML = `<iframe id="pdfModalIframe" src="${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0" width="100%" height="100%" style="border: none;" oncontextmenu="return false;"></iframe>`;
  }
}

function closePdfModal() {
  const modal = document.getElementById('pdfPreviewModal');
  if (modal) {
    modal.style.display = 'none';
    const bodyEl = document.getElementById('pdfModalCanvasBody');
    if (bodyEl) bodyEl.innerHTML = '';
  }
  document.body.style.overflow = 'auto';
}

// ===== WHATSAPP B2B INQUIRY INTEGRATION (Phone: 9305834431) =====
const WHATSAPP_PHONE = '919305834431';

function openWhatsAppInquiry(message) {
  const encodedMsg = encodeURIComponent(message);
  const waUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${encodedMsg}`;
  window.open(waUrl, '_blank');
}

function inquireProductOnWhatsApp(productName, moq, category, priceRange) {
  const msg = `🌿 *KIYAN EXPORTS & HERBAL MANUFACTURING*
----------------------------------------
📩 *B2B WHOLESALE PRODUCT INQUIRY*

📦 *Product Name*: ${productName}
🏷️ *Category*: ${category || 'Herbal Manufacturing'}
📊 *Min. Order Quantity (MOQ)*: ${moq || 100} Pieces
💰 *Est. Price Range*: ${priceRange || 'Direct Factory Rates'}

💬 *Inquiry & Quote Request*:
Hello Kiyan Exports Sales Team, I am interested in sourcing this product for my business/brand. Please share:
1. Official Wholesale Quotation & Volume Tier Pricing
2. Custom OEM / Private Labeling & Bottle/Box Packaging Options
3. Quality Assurance Certificates (COA, ISO, GMP) & Dispatch Lead Times

Thank you!`;
  openWhatsAppInquiry(msg);
}

function inquireCurrentModalProductWhatsApp() {
  if (!currentModalProduct) return;
  const qtyInput = document.getElementById('pmQtyInput');
  const qty = qtyInput ? (parseInt(qtyInput.value, 10) || currentModalProduct.moq || 100) : (currentModalProduct.moq || 100);
  const unitPriceEl = document.getElementById('pmCalcUnitPrice');
  const totalEl = document.getElementById('pmCalcTotal');
  const unitPrice = unitPriceEl ? unitPriceEl.textContent : '';
  const total = totalEl ? totalEl.textContent : '';

  const msg = `🌿 *KIYAN EXPORTS & HERBAL MANUFACTURING*
----------------------------------------
📩 *B2B DIRECT PRODUCT ORDER INQUIRY*

📦 *Product*: ${currentModalProduct.name}
🏷️ *Category*: ${currentModalProduct.category || 'Herbal Manufacturing'}
🔢 *Target Quantity*: ${qty} Pieces (MOQ: ${currentModalProduct.moq || 100} Pcs)
💵 *Est. Unit Rate*: ${unitPrice}
💰 *Est. Total Value*: ${total}

💬 *Custom Specifications Request*:
Hello Kiyan Exports Team, I would like to inquire about placing an order for this item. Please confirm:
1. Production Stock Availability & Shipping Schedule
2. Custom Label Printing & Private Labeling Support
3. Shipping Freight Costs to my destination

Thank you!`;
  openWhatsAppInquiry(msg);
}

function inquireOrderOnWhatsApp(orderId, totalAmount, dateStr) {
  const msg = `Hi Kiyan Exports,

I want to inquire about my Order status:
🆔 *Order ID*: #${orderId}
💵 *Order Total*: ₹${totalAmount ? totalAmount.toLocaleString('en-IN') : 'N/A'}
📅 *Order Date*: ${dateStr || 'Recent Order'}

Please provide dispatch tracking details and delivery updates. Thank you!`;
  openWhatsAppInquiry(msg);
}

function sendRfqViaWhatsApp() {
  const prodNameEl = document.getElementById('rfqProductName');
  const companyEl = document.getElementById('rfqCompanyName');
  const contactEl = document.getElementById('rfqContactName');
  const emailEl = document.getElementById('rfqEmail');
  const phoneEl = document.getElementById('rfqPhone');
  const qtyEl = document.getElementById('rfqQuantity');
  const countryEl = document.getElementById('rfqCountry');
  const notesEl = document.getElementById('rfqCustomization');

  const prodName = prodNameEl ? prodNameEl.value : 'Herbal Product';
  const company = companyEl ? companyEl.value : '';
  const contact = contactEl ? contactEl.value : '';
  const qty = qtyEl ? qtyEl.value : '500';
  const country = countryEl ? countryEl.value : '';
  const notes = notesEl ? notesEl.value : '';

  const msg = `📋 *NEW B2B REQUEST FOR QUOTE (RFQ)*

👤 *Contact Name*: ${contact || 'Buyer'}
🏢 *Company*: ${company || 'N/A'}
📧 *Email*: ${emailEl ? emailEl.value : 'N/A'}
📞 *Phone*: ${phoneEl ? phoneEl.value : 'N/A'}
🌐 *Country*: ${country || 'International'}
📦 *Product Requested*: ${prodName}
🔢 *Target Quantity*: ${qty} Pieces
📝 *OEM/Customization*: ${notes || 'Standard Manufacturing'}

Please send me a detailed quotation.`;

  openWhatsAppInquiry(msg);
}

// ===== STANDALONE ADMIN DASHBOARD TAB SWITCHING =====
function switchStandaloneAdminTab(tabName) {
  const tabs = ['products', 'content', 'catalogues', 'certificates', 'orders'];
  tabs.forEach(t => {
    const btn = document.getElementById('tabBtn' + t.charAt(0).toUpperCase() + t.slice(1));
    const panel = document.getElementById('standaloneTab' + t.charAt(0).toUpperCase() + t.slice(1));
    if (btn) {
      if (t === tabName) {
        btn.classList.add('active');
        btn.style.background = 'var(--deep-green)';
        btn.style.color = 'white';
      } else {
        btn.classList.remove('active');
        btn.style.background = '#f0f4f2';
        btn.style.color = 'var(--deep-green)';
      }
    }
    if (panel) {
      panel.style.display = (t === tabName) ? 'block' : 'none';
    }
  });

  if (tabName === 'catalogues') renderAdminCataloguesTable();
  if (tabName === 'certificates') renderAdminCertificatesTable();
  if (tabName === 'orders') loadStandaloneAdminOrders();
}

let currentSiteContentData = null;

// ===== DYNAMIC CMS SITE CONTENT & ASSET MANAGEMENT =====
async function fetchAndApplySiteContent() {
  try {
    const res = await fetch('/api/site/content');
    const data = await res.json();
    if (data.success && data.content) {
      currentSiteContentData = data.content;
      applySiteContentToDOM(data.content);
      populateAdminSiteContentForm(data.content);
      renderCustomerCatalogues(data.content.catalogues || []);
      renderCustomerCertificates(data.content.certificates || []);
      renderAdminCataloguesTable(data.content.catalogues || []);
      renderAdminCertificatesTable(data.content.certificates || []);
    }
  } catch (err) {
    console.error('Failed to load site content from API:', err);
  }
}

function applySiteContentToDOM(content) {
  if (!content) return;

  // Hero Section
  const heroTagline = document.getElementById('siteHeroTagline');
  const heroTitle = document.getElementById('siteHeroTitle');
  const heroDesc = document.getElementById('siteHeroDesc');
  const slide2Title = document.getElementById('siteHeroSlide2Title');
  const slide2Desc = document.getElementById('siteHeroSlide2Desc');
  const slide3Title = document.getElementById('siteHeroSlide3Title');
  const slide3Desc = document.getElementById('siteHeroSlide3Desc');

  if (heroTagline && content.heroTagline) heroTagline.innerHTML = `<i class="fas fa-crown"></i> ${content.heroTagline}`;
  if (heroTitle && content.heroTitle) heroTitle.innerHTML = content.heroTitle;
  if (heroDesc && content.heroDesc) heroDesc.textContent = content.heroDesc;
  if (slide2Title && content.heroSlide2Title) slide2Title.innerHTML = content.heroSlide2Title;
  if (slide2Desc && content.heroSlide2Desc) slide2Desc.textContent = content.heroSlide2Desc;
  if (slide3Title && content.heroSlide3Title) slide3Title.innerHTML = content.heroSlide3Title;
  if (slide3Desc && content.heroSlide3Desc) slide3Desc.textContent = content.heroSlide3Desc;

  // Marquee
  const marqueeTrack = document.querySelector('.marquee-track');
  if (marqueeTrack && content.marqueeText) {
    const items = content.marqueeText.split('•').map(item => `<span><i class="fas fa-leaf"></i> ${item.trim()}</span>`).join('');
    marqueeTrack.innerHTML = items + items; // Duplicate for smooth looping scroll
  }

  // About Section
  const aboutPill = document.getElementById('siteAboutPill');
  const aboutTitle = document.getElementById('siteAboutTitle');
  const aboutP1 = document.getElementById('siteAboutP1');
  const aboutP2 = document.getElementById('siteAboutP2');

  if (aboutPill && content.aboutPill) aboutPill.textContent = content.aboutPill;
  if (aboutTitle && content.aboutTitle) aboutTitle.textContent = content.aboutTitle;
  if (aboutP1 && content.aboutP1) aboutP1.textContent = content.aboutP1;
  if (aboutP2 && content.aboutP2) aboutP2.textContent = content.aboutP2;

  // Contact Info
  const contactEmails = document.querySelectorAll('.site-contact-email, #siteContactEmail');
  contactEmails.forEach(el => {
    if (content.contactEmail) {
      el.textContent = content.contactEmail;
      if (el.tagName === 'A') el.href = `mailto:${content.contactEmail}`;
    }
  });

  const contactPhones = document.querySelectorAll('#siteContactPhone');
  contactPhones.forEach(el => {
    if (content.contactPhone) el.textContent = content.contactPhone;
  });

  const contactAddresses = document.querySelectorAll('#siteContactAddress');
  contactAddresses.forEach(el => {
    if (content.contactAddress) el.textContent = content.contactAddress;
  });

  const footerDescs = document.querySelectorAll('#siteFooterDesc');
  footerDescs.forEach(el => {
    if (content.footerDesc) el.textContent = content.footerDesc;
  });
}

function populateAdminSiteContentForm(content) {
  if (!content) return;
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
  };

  setVal('dashHeroTagline', content.heroTagline);
  setVal('dashHeroTitle', content.heroTitle);
  setVal('dashHeroDesc', content.heroDesc);
  setVal('dashHeroSlide2Title', content.heroSlide2Title);
  setVal('dashHeroSlide2Desc', content.heroSlide2Desc);
  setVal('dashHeroSlide3Title', content.heroSlide3Title);
  setVal('dashHeroSlide3Desc', content.heroSlide3Desc);
  setVal('dashMarqueeText', content.marqueeText);
  setVal('dashAboutPill', content.aboutPill);
  setVal('dashAboutTitle', content.aboutTitle);
  setVal('dashAboutP1', content.aboutP1);
  setVal('dashAboutP2', content.aboutP2);
  setVal('dashContactEmail', content.contactEmail);
  setVal('dashContactPhone', content.contactPhone);
  setVal('dashContactAddress', content.contactAddress);
  setVal('dashFooterDesc', content.footerDesc);
}

async function saveAdminSiteContent() {
  const getVal = (id) => {
    const el = document.getElementById(id);
    return el ? el.value : '';
  };

  const payload = {
    heroTagline: getVal('dashHeroTagline'),
    heroTitle: getVal('dashHeroTitle'),
    heroDesc: getVal('dashHeroDesc'),
    heroSlide2Title: getVal('dashHeroSlide2Title'),
    heroSlide2Desc: getVal('dashHeroSlide2Desc'),
    heroSlide3Title: getVal('dashHeroSlide3Title'),
    heroSlide3Desc: getVal('dashHeroSlide3Desc'),
    marqueeText: getVal('dashMarqueeText'),
    aboutPill: getVal('dashAboutPill'),
    aboutTitle: getVal('dashAboutTitle'),
    aboutP1: getVal('dashAboutP1'),
    aboutP2: getVal('dashAboutP2'),
    contactEmail: getVal('dashContactEmail'),
    contactPhone: getVal('dashContactPhone'),
    contactAddress: getVal('dashContactAddress'),
    footerDesc: getVal('dashFooterDesc')
  };

  try {
    const res = await fetch('/api/admin/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      currentSiteContentData = data.content;
      applySiteContentToDOM(data.content);
      alert('🎉 Website Content & Banners updated successfully! All changes are now live on customer site.');
    } else {
      alert('Failed to update site content: ' + data.message);
    }
  } catch (err) {
    alert('Error saving site content: ' + err.message);
  }
}

function getPdfThumbnailUrl(pdfUrl) {
  if (!pdfUrl) return '';
  try {
    let cleanUrl = decodeURIComponent(pdfUrl.replace(/^["']|["']$/g, '').trim());
    const filename = cleanUrl.split('/').pop() || '';
    const baseName = filename.replace(/\.pdf$/i, '').replace(/[\s\(\)%]/g, '_');
    
    if (baseName.includes('Extract_Catalogue') || baseName.includes('Extract')) return '/pdf_thumbnails/Extract_Catalogue_1_watermark_page1.jpg';
    if (baseName.includes('Gummies_Catalogue') || baseName.includes('Gummies')) return '/pdf_thumbnails/Gummies_Catalogue_watermark_page1.jpg';
    if (baseName.includes('Herbal_Capsules') || baseName.includes('Capsules')) return '/pdf_thumbnails/Herbal_Capsules_Catalogue_page1.jpg';
    if (baseName.includes('Honey_Sticks') || baseName.includes('Honey')) return '/pdf_thumbnails/Honey_Sticks_Catalogue_watermark_page1.jpg';
    if (baseName.includes('gym_supplement') || baseName.includes('gym')) return '/pdf_thumbnails/gym_supplement_catalogue_1_watermark_page1.jpg';
    if (baseName.includes('nutra_cap') || baseName.includes('nutra')) return '/pdf_thumbnails/nutra_cap_cat_1_page1.jpg';
    if (baseName.includes('Softgles') || baseName.includes('Softgel')) return '/pdf_thumbnails/Softgles_catalogue_KIYAN_EXPORT_page1.jpg';
    if (baseName.includes('Copper_bottles') || baseName.includes('Copper')) return '/pdf_thumbnails/Kiyan_Export_Catalogue_of_Copper_bottles_etc._watermark_page1.jpg';
    if (baseName.includes('ISO_22000') || baseName.includes('ISO')) return '/pdf_thumbnails/KIYAN_EXPORT_ISO_22000_FINAL_1_1_page1.jpg';
    if (baseName.includes('GMP')) return '/pdf_thumbnails/47214_KIYAN_EXPORT_GMP_PQC_1_1_page1.jpg';
    if (baseName.includes('US-_FDA') || baseName.includes('US_FDA') || baseName.includes('FDA')) return '/pdf_thumbnails/47214_KIYAN_EXPORT_US-_FDA_PQC_2_1_page1.jpg';
    if (baseName.includes('Fssai') || baseName.includes('FSSAI')) return '/pdf_thumbnails/Kiyan_Fssai_Renewal_2025_page1.jpg';
    if (baseName.includes('TrustSeal') || baseName.includes('Trust')) return '/pdf_thumbnails/TrustSeal_certificate_page1.jpg';
    if (baseName.includes('Udyam') || baseName.includes('MSME')) return '/pdf_thumbnails/Udyam_Registration_Certificate_page1.jpg';
  } catch (e) {}

  return '';
}

async function renderPdfFirstPageCanvas(pdfUrl, canvasId) {
  if (typeof pdfjsLib === 'undefined') return;
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const cleanUrl = pdfUrl.replace(/^["']|["']$/g, '').trim();
    const loadingTask = pdfjsLib.getDocument(cleanUrl);
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const viewport = page.getViewport({ scale: 0.5 });
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport: viewport }).promise;
  } catch (err) {
    console.error('Failed to render first page canvas thumbnail:', err);
  }
}

// ===== CUSTOMER CATALOGUES & CERTIFICATES RENDERERS =====
function renderCustomerCatalogues(catalogues) {
  const grid = document.getElementById('customerCataloguesGrid');
  if (!grid) return;
  if (!catalogues || catalogues.length === 0) {
    grid.innerHTML = '<p style="text-align: center; color: #888; grid-column: 1 / -1;">No catalogues available currently.</p>';
    return;
  }

  grid.innerHTML = catalogues.map((cat, idx) => {
    const cleanUrl = (cat.pdfUrl || '').replace(/^["']|["']$/g, '').trim();
    const safeTitle = (cat.title || 'PDF Catalogue').replace(/'/g, "\\'");
    const thumbUrl = getPdfThumbnailUrl(cleanUrl);
    const canvasId = `pdfThumbCanvas_cat_${cat.id || idx}`;

    const previewMediaHTML = thumbUrl 
      ? `<img src="${thumbUrl}" alt="${cat.title} Page 1 Preview" loading="lazy" decoding="async" class="pdf-page1-img">`
      : `<canvas id="${canvasId}" class="pdf-page1-img" style="width: 100%; height: 210px; object-fit: cover; border-radius: 10px; background: #fff;"></canvas>`;

    return `
    <div style="background: white; border-radius: 16px; padding: 22px; border: 1.5px solid #d8e2dc; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; justify-content: space-between; transition: all 0.3s ease;">
      <div>
        <div class="pdf-card-preview-box" onclick="openPdfModal('${cleanUrl}', '${safeTitle}')">
          <span class="pdf-badge"><i class="fas fa-file-pdf"></i> Page 1 Preview</span>
          ${previewMediaHTML}
          <div class="pdf-hover-overlay">
            <div class="pdf-hover-btn"><i class="fas fa-search-plus"></i> View Complete PDF</div>
          </div>
        </div>
        <h3 style="font-size: 1.25rem; color: var(--royal-emerald); margin: 12px 0 6px 0;">${cat.title}</h3>
        <span style="display: inline-block; font-size: 0.75rem; font-weight: 700; background: #eef7f6; color: var(--deep-green); padding: 3px 10px; border-radius: 12px; margin-bottom: 8px;">${cat.category || 'Herbal Range'}</span>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 15px;">${cat.description || 'Official Kiyan Export PDF Catalogue.'}</p>
      </div>
      <div style="display: flex; gap: 10px;">
        <button onclick="openPdfModal('${cleanUrl}', '${safeTitle}')" class="btn-main" style="width: 100%; padding: 9px 14px; font-size: 0.85rem; text-align: center; background: var(--royal-emerald); color: white; border: none; cursor: pointer; border-radius: 8px;"><i class="fas fa-eye"></i> View PDF (Protected)</button>
      </div>
    </div>
  `;}).join('');

  setTimeout(() => {
    catalogues.forEach((cat, idx) => {
      const cleanUrl = (cat.pdfUrl || '').replace(/^["']|["']$/g, '').trim();
      const thumbUrl = getPdfThumbnailUrl(cleanUrl);
      if (!thumbUrl) {
        const canvasId = `pdfThumbCanvas_cat_${cat.id || idx}`;
        renderPdfFirstPageCanvas(cleanUrl, canvasId);
      }
    });
  }, 100);
}

function renderCustomerCertificates(certificates) {
  const grid = document.getElementById('customerCertificatesGrid');
  if (!grid) return;
  if (!certificates || certificates.length === 0) {
    grid.innerHTML = '<p style="text-align: center; color: #888; grid-column: 1 / -1;">No certificates available currently.</p>';
    return;
  }

  grid.innerHTML = certificates.map((cert, idx) => {
    const cleanUrl = (cert.pdfUrl || '').replace(/^["']|["']$/g, '').trim();
    const safeTitle = (cert.title || 'Quality Audit Certificate').replace(/'/g, "\\'");
    const thumbUrl = getPdfThumbnailUrl(cleanUrl);
    const canvasId = `pdfThumbCanvas_cert_${cert.id || idx}`;

    const previewMediaHTML = thumbUrl 
      ? `<img src="${thumbUrl}" alt="${cert.title} Page 1 Preview" loading="lazy" decoding="async" class="pdf-page1-img">`
      : `<canvas id="${canvasId}" class="pdf-page1-img" style="width: 100%; height: 210px; object-fit: cover; border-radius: 10px; background: #fff;"></canvas>`;

    return `
    <div style="background: white; border-radius: 16px; padding: 22px; border: 1.5px solid #d8e2dc; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; justify-content: space-between; transition: all 0.3s ease;">
      <div>
        <div class="pdf-card-preview-box" onclick="openPdfModal('${cleanUrl}', '${safeTitle}')">
          <span class="pdf-badge"><i class="fas fa-award"></i> Quality Audit</span>
          ${previewMediaHTML}
          <div class="pdf-hover-overlay">
            <div class="pdf-hover-btn"><i class="fas fa-search-plus"></i> View Audit PDF</div>
          </div>
        </div>
        <h3 style="font-size: 1.25rem; color: var(--royal-emerald); margin: 12px 0 6px 0;">${cert.title}</h3>
        <span style="display: inline-block; font-size: 0.75rem; font-weight: 700; background: #fef3c7; color: #92400e; padding: 3px 10px; border-radius: 12px; margin-bottom: 8px;"><i class="fas fa-shield-alt"></i> ${cert.authority || 'Quality Audit'}</span>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 15px;">${cert.description || 'Verified quality & compliance certificate.'}</p>
      </div>
      <div style="display: flex; gap: 10px;">
        <button onclick="openPdfModal('${cleanUrl}', '${safeTitle}')" class="btn-main" style="width: 100%; padding: 9px 14px; font-size: 0.85rem; text-align: center; background: var(--royal-emerald); color: white; border: none; cursor: pointer; border-radius: 8px;"><i class="fas fa-eye"></i> View PDF (Protected)</button>
      </div>
    </div>
  `;}).join('');

  setTimeout(() => {
    certificates.forEach((cert, idx) => {
      const cleanUrl = (cert.pdfUrl || '').replace(/^["']|["']$/g, '').trim();
      const thumbUrl = getPdfThumbnailUrl(cleanUrl);
      if (!thumbUrl) {
        const canvasId = `pdfThumbCanvas_cert_${cert.id || idx}`;
        renderPdfFirstPageCanvas(cleanUrl, canvasId);
      }
    });
  }, 100);
}

// ===== ADMIN CATALOGUES MANAGER =====
async function renderAdminCataloguesTable(cataloguesData) {
  const tbody = document.getElementById('dashAdminCataloguesTableBody');
  if (!tbody) return;

  let catalogues = cataloguesData;
  if (!catalogues || catalogues.length === 0) {
    if (!currentSiteContentData) {
      try {
        const res = await fetch('/api/site/content');
        const data = await res.json();
        if (data.success && data.content) {
          currentSiteContentData = data.content;
        }
      } catch (e) {}
    }
    catalogues = currentSiteContentData ? currentSiteContentData.catalogues : [];
  }

  if (!catalogues || catalogues.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 25px;">No catalogues found. Click "Add New Catalogue" to create one.</td></tr>';
    return;
  }

  tbody.innerHTML = catalogues.map(c => `
    <tr>
      <td><strong>#${c.id}</strong></td>
      <td><strong>${c.title}</strong></td>
      <td><span style="background: #eef7f6; color: var(--deep-green); padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: 700;">${c.category || 'General'}</span></td>
      <td><a href="${c.pdfUrl}" target="_blank" style="color: #e74c3c; font-weight: 700;"><i class="fas fa-file-pdf"></i> Open PDF</a></td>
      <td style="font-size: 0.85rem; color: #555;">${c.description || '-'}</td>
      <td>
        <div style="display: flex; gap: 8px;">
          <button onclick="openAdminCatalogueModal(${c.id})" class="btn-edit" style="padding: 6px 12px; font-size: 0.8rem; background: var(--deep-green); color: white; border: none; border-radius: 6px; cursor: pointer;" title="Edit Catalogue Details"><i class="fas fa-edit"></i> Edit</button>
          <button onclick="deleteAdminCatalogue(${c.id})" class="btn-delete" style="padding: 6px 12px; font-size: 0.8rem; background: #e74c3c; color: white; border: none; border-radius: 6px; cursor: pointer;" title="Delete Catalogue"><i class="fas fa-trash"></i> Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openAdminCatalogueModal(id = null) {
  const modal = document.getElementById('adminCatalogueModal');
  const titleEl = document.getElementById('adminCatalogueModalTitle');
  const idEl = document.getElementById('adminCatId');
  const titleInput = document.getElementById('adminCatTitle');
  const catInput = document.getElementById('adminCatCategory');
  const pdfInput = document.getElementById('adminCatPdfUrl');
  const descInput = document.getElementById('adminCatDesc');

  if (!modal) return;

  if (id) {
    const list = currentSiteContentData ? (currentSiteContentData.catalogues || []) : [];
    const item = list.find(c => c.id === id);
    if (item) {
      if (titleEl) titleEl.innerHTML = '<i class="fas fa-edit" style="color: var(--accent-gold);"></i> Edit PDF Catalogue';
      if (idEl) idEl.value = item.id;
      if (titleInput) titleInput.value = item.title;
      if (catInput) catInput.value = item.category || '';
      if (pdfInput) pdfInput.value = item.pdfUrl || '';
      if (descInput) descInput.value = item.description || '';
    }
  } else {
    if (titleEl) titleEl.innerHTML = '<i class="fas fa-file-pdf" style="color: #e74c3c;"></i> Add New PDF Catalogue';
    if (idEl) idEl.value = '';
    if (titleInput) titleInput.value = '';
    if (catInput) catInput.value = 'Herbal Range';
    if (pdfInput) pdfInput.value = '/Catelouges/Extract Catalogue 1_watermark.pdf';
    if (descInput) descInput.value = '';
  }

  modal.classList.add('active');
}

function closeAdminCatalogueModal(event) {
  if (event && event.target !== event.currentTarget) return;
  const modal = document.getElementById('adminCatalogueModal');
  if (modal) modal.classList.remove('active');
}

async function saveAdminCatalogue(event) {
  event.preventDefault();
  const id = document.getElementById('adminCatId').value;
  const title = document.getElementById('adminCatTitle').value;
  const category = document.getElementById('adminCatCategory').value;
  const pdfUrl = document.getElementById('adminCatPdfUrl').value;
  const description = document.getElementById('adminCatDesc').value;

  try {
    const res = await fetch('/api/admin/catalogues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, title, category, pdfUrl, description })
    });
    const data = await res.json();
    if (data.success) {
      if (currentSiteContentData) currentSiteContentData.catalogues = data.catalogues;
      renderAdminCataloguesTable(data.catalogues);
      renderCustomerCatalogues(data.catalogues);
      closeAdminCatalogueModal();
      alert('🎉 PDF Catalogue saved successfully!');
    } else {
      alert('Failed to save catalogue: ' + data.message);
    }
  } catch (err) {
    alert('Error saving catalogue: ' + err.message);
  }
}

async function deleteAdminCatalogue(id) {
  if (!confirm('Are you sure you want to delete this PDF catalogue from the website?')) return;

  try {
    const res = await fetch(`/api/admin/catalogues/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      if (currentSiteContentData) currentSiteContentData.catalogues = data.catalogues;
      renderAdminCataloguesTable(data.catalogues);
      renderCustomerCatalogues(data.catalogues);
      alert('🗑️ Catalogue removed successfully!');
    } else {
      alert('Failed to delete catalogue: ' + data.message);
    }
  } catch (err) {
    alert('Error deleting catalogue: ' + err.message);
  }
}

// ===== ADMIN CERTIFICATES MANAGER =====
async function renderAdminCertificatesTable(certificatesData) {
  const tbody = document.getElementById('dashAdminCertificatesTableBody');
  if (!tbody) return;

  let certificates = certificatesData;
  if (!certificates || certificates.length === 0) {
    if (!currentSiteContentData) {
      try {
        const res = await fetch('/api/site/content');
        const data = await res.json();
        if (data.success && data.content) {
          currentSiteContentData = data.content;
        }
      } catch (e) {}
    }
    certificates = currentSiteContentData ? currentSiteContentData.certificates : [];
  }

  if (!certificates || certificates.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 25px;">No certificates found. Click "Add New Certificate" to create one.</td></tr>';
    return;
  }

  tbody.innerHTML = certificates.map(c => `
    <tr>
      <td><strong>#${c.id}</strong></td>
      <td><strong>${c.title}</strong></td>
      <td><span style="background: #fef3c7; color: #92400e; padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: 700;">${c.authority || 'Audit'}</span></td>
      <td><a href="${c.pdfUrl}" target="_blank" style="color: var(--deep-green); font-weight: 700;"><i class="fas fa-file-pdf"></i> Open Certificate</a></td>
      <td style="font-size: 0.85rem; color: #555;">${c.description || '-'}</td>
      <td>
        <div style="display: flex; gap: 8px;">
          <button onclick="openAdminCertificateModal(${c.id})" class="btn-edit" style="padding: 6px 12px; font-size: 0.8rem; background: var(--deep-green); color: white; border: none; border-radius: 6px; cursor: pointer;" title="Edit Certificate Details"><i class="fas fa-edit"></i> Edit</button>
          <button onclick="deleteAdminCertificate(${c.id})" class="btn-delete" style="padding: 6px 12px; font-size: 0.8rem; background: #e74c3c; color: white; border: none; border-radius: 6px; cursor: pointer;" title="Delete Certificate"><i class="fas fa-trash"></i> Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openAdminCertificateModal(id = null) {
  const modal = document.getElementById('adminCertificateModal');
  const titleEl = document.getElementById('adminCertificateModalTitle');
  const idEl = document.getElementById('adminCertId');
  const titleInput = document.getElementById('adminCertTitle');
  const authInput = document.getElementById('adminCertAuthority');
  const pdfInput = document.getElementById('adminCertPdfUrl');
  const descInput = document.getElementById('adminCertDesc');

  if (!modal) return;

  if (id) {
    const list = currentSiteContentData ? (currentSiteContentData.certificates || []) : [];
    const item = list.find(c => c.id === id);
    if (item) {
      if (titleEl) titleEl.innerHTML = '<i class="fas fa-edit" style="color: var(--accent-gold);"></i> Edit Certificate';
      if (idEl) idEl.value = item.id;
      if (titleInput) titleInput.value = item.title;
      if (authInput) authInput.value = item.authority || '';
      if (pdfInput) pdfInput.value = item.pdfUrl || '';
      if (descInput) descInput.value = item.description || '';
    }
  } else {
    if (titleEl) titleEl.innerHTML = '<i class="fas fa-award" style="color: var(--accent-gold);"></i> Add New Quality Certificate';
    if (idEl) idEl.value = '';
    if (titleInput) titleInput.value = '';
    if (authInput) authInput.value = 'ISO / GMP Authority';
    if (pdfInput) pdfInput.value = '/Certificates/TrustSeal_certificate.pdf';
    if (descInput) descInput.value = '';
  }

  modal.classList.add('active');
}

function closeAdminCertificateModal(event) {
  if (event && event.target !== event.currentTarget) return;
  const modal = document.getElementById('adminCertificateModal');
  if (modal) modal.classList.remove('active');
}

async function saveAdminCertificate(event) {
  event.preventDefault();
  const id = document.getElementById('adminCertId').value;
  const title = document.getElementById('adminCertTitle').value;
  const authority = document.getElementById('adminCertAuthority').value;
  const pdfUrl = document.getElementById('adminCertPdfUrl').value;
  const description = document.getElementById('adminCertDesc').value;

  try {
    const res = await fetch('/api/admin/certificates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, title, authority, pdfUrl, description })
    });
    const data = await res.json();
    if (data.success) {
      if (currentSiteContentData) currentSiteContentData.certificates = data.certificates;
      renderAdminCertificatesTable(data.certificates);
      renderCustomerCertificates(data.certificates);
      closeAdminCertificateModal();
      alert('🎉 Quality Certificate saved successfully!');
    } else {
      alert('Failed to save certificate: ' + data.message);
    }
  } catch (err) {
    alert('Error saving certificate: ' + err.message);
  }
}

async function deleteAdminCertificate(id) {
  if (!confirm('Are you sure you want to delete this Quality Certificate from the website?')) return;

  try {
    const res = await fetch(`/api/admin/certificates/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      if (currentSiteContentData) currentSiteContentData.certificates = data.certificates;
      renderAdminCertificatesTable(data.certificates);
      renderCustomerCertificates(data.certificates);
      alert('🗑️ Quality Certificate removed successfully!');
    } else {
      alert('Failed to delete certificate: ' + data.message);
    }
  } catch (err) {
    alert('Error deleting certificate: ' + err.message);
  }
}

// ===== STANDALONE ADMIN PRODUCT & INVENTORY MANAGEMENT =====
function renderAdminStandaloneTable() {
  const tbody = document.getElementById('dashStandaloneProductsTableBody');
  if (!tbody) return;

  const searchInput = document.getElementById('dashSearchInput');
  const catFilter = document.getElementById('dashCategoryFilter');

  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const category = catFilter ? catFilter.value.toLowerCase() : 'all';

  let filtered = [...productsData];

  if (category && category !== 'all') {
    filtered = filtered.filter(p => (p.category || '').toLowerCase().includes(category));
  }

  if (query) {
    filtered = filtered.filter(p =>
      (p.name || '').toLowerCase().includes(query) ||
      (p.category || '').toLowerCase().includes(query) ||
      String(p.id).includes(query)
    );
  }

  // Update Overview Metrics Cards
  const totalEl = document.getElementById('dashTotalProducts');
  const inStockEl = document.getElementById('dashInStockProducts');
  const soldOutEl = document.getElementById('dashSoldOutProducts');

  if (totalEl) totalEl.textContent = productsData.length;
  if (inStockEl) inStockEl.textContent = productsData.filter(p => (p.stock === undefined || p.stock > 0)).length;
  if (soldOutEl) soldOutEl.textContent = productsData.filter(p => p.stock === 0).length;

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 25px;">No products matching search query.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    const isSoldOut = p.stock === 0;
    const stockQty = p.stock !== undefined ? p.stock : 15;
    const imgUrl = p.image ? (p.image.startsWith('/') ? p.image : '/' + p.image) : '/images/kiyan-logo.png';

    return `
      <tr style="${isSoldOut ? 'background: #fff5f5;' : ''}">
        <td><strong>#${p.id}</strong></td>
        <td>
          <img src="${imgUrl}" alt="${p.name}" style="width: 42px; height: 42px; object-fit: cover; border-radius: 6px; border: 1px solid #ddd;" onerror="this.src='/images/kiyan-logo.png'">
        </td>
        <td>
          <strong style="color: var(--deep-green); display: block;">${p.name}</strong>
          ${p.tag ? `<span style="font-size: 0.72rem; color: var(--accent-gold); font-weight: 700;">${p.tag}</span>` : ''}
        </td>
        <td><span style="background: #eef7f6; color: var(--deep-green); padding: 3px 10px; border-radius: 12px; font-size: 0.78rem; font-weight: 700;">${p.category || 'Herbal'}</span></td>
        <td><strong>₹${(p.price || 0).toLocaleString('en-IN')}</strong></td>
        <td style="color: #888; text-decoration: line-through;">${p.oldPrice ? '₹' + p.oldPrice.toLocaleString('en-IN') : '-'}</td>
        <td>
          <div style="display: flex; align-items: center; gap: 6px;">
            <input type="number" min="0" value="${stockQty}" onchange="updateAdminStockQuantity(${p.id}, this.value)" style="width: 65px; padding: 5px; border-radius: 6px; border: 1.5px solid #ccc; font-weight: 700; text-align: center;">
            <span style="font-size: 0.8rem; color: #666;">Pcs</span>
          </div>
        </td>
        <td>
          ${isSoldOut 
            ? '<span style="background: #fee2e2; color: #dc2626; padding: 4px 10px; border-radius: 12px; font-weight: 800; font-size: 0.78rem;"><i class="fas fa-ban"></i> SOLD OUT</span>' 
            : '<span style="background: #dcfce7; color: #166534; padding: 4px 10px; border-radius: 12px; font-weight: 800; font-size: 0.78rem;"><i class="fas fa-check"></i> IN STOCK</span>'}
        </td>
        <td>
          <div style="display: flex; gap: 8px;">
            <button onclick="openAdminProductModal(${p.id})" style="padding: 6px 12px; font-size: 0.8rem; background: var(--deep-green); color: white; border: none; border-radius: 6px; cursor: pointer;" title="Edit Product"><i class="fas fa-edit"></i> Edit</button>
            <button onclick="deleteAdminProduct(${p.id})" style="padding: 6px 12px; font-size: 0.8rem; background: #e74c3c; color: white; border: none; border-radius: 6px; cursor: pointer;" title="Delete Product"><i class="fas fa-trash"></i> Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openAdminProductModal(id = null) {
  const modal = document.getElementById('adminProductModal');
  const titleEl = document.getElementById('adminProductModalTitle');
  const idEl = document.getElementById('adminProdId');
  const nameEl = document.getElementById('adminProdName');
  const catEl = document.getElementById('adminProdCategory');
  const tagEl = document.getElementById('adminProdTag');
  const priceEl = document.getElementById('adminProdPrice');
  const oldPriceEl = document.getElementById('adminProdOldPrice');
  const stockEl = document.getElementById('adminProdStock');
  const ratingEl = document.getElementById('adminProdRating');
  const reviewsEl = document.getElementById('adminProdReviews');
  const imageEl = document.getElementById('adminProdImage');
  const descEl = document.getElementById('adminProdDesc');
  const ingrEl = document.getElementById('adminProdIngredients');
  const specsEl = document.getElementById('adminProdSpecs');
  const bestEl = document.getElementById('adminProdBestseller');

  if (!modal) return;

  if (id) {
    const item = productsData.find(p => p.id === id);
    if (item) {
      if (titleEl) titleEl.innerHTML = '<i class="fas fa-edit" style="color: var(--accent-gold);"></i> Edit Herbal Product';
      if (idEl) idEl.value = item.id;
      if (nameEl) nameEl.value = item.name || '';
      if (catEl) catEl.value = item.category || 'Herbal Products';
      if (tagEl) tagEl.value = item.tag || '';
      if (priceEl) priceEl.value = item.price || '';
      if (oldPriceEl) oldPriceEl.value = item.oldPrice || '';
      if (stockEl) stockEl.value = item.stock !== undefined ? item.stock : 15;
      if (ratingEl) ratingEl.value = item.rating || 4.9;
      if (reviewsEl) reviewsEl.value = item.reviews || 28;
      if (imageEl) imageEl.value = item.image || '';
      if (descEl) descEl.value = item.description || '';
      if (ingrEl) ingrEl.value = Array.isArray(item.ingredients) ? item.ingredients.join(', ') : (item.ingredients || '');
      if (specsEl) specsEl.value = Array.isArray(item.specs) ? item.specs.join(', ') : (item.specs || '');
      if (bestEl) bestEl.checked = !!item.bestseller;
    }
  } else {
    if (titleEl) titleEl.innerHTML = '<i class="fas fa-plus-circle" style="color: var(--accent-gold);"></i> Add New Herbal Product';
    if (idEl) idEl.value = '';
    if (nameEl) nameEl.value = '';
    if (catEl) catEl.value = 'Herbal Products';
    if (tagEl) tagEl.value = 'ORGANIC / HERBAL';
    if (priceEl) priceEl.value = '';
    if (oldPriceEl) oldPriceEl.value = '';
    if (stockEl) stockEl.value = 15;
    if (ratingEl) ratingEl.value = 4.9;
    if (reviewsEl) reviewsEl.value = 25;
    if (imageEl) imageEl.value = 'images/kiyan-logo.png';
    if (descEl) descEl.value = '';
    if (ingrEl) ingrEl.value = '';
    if (specsEl) specsEl.value = '';
    if (bestEl) bestEl.checked = false;
  }

  modal.classList.add('active');
}

function closeAdminProductModal(event) {
  if (event && event.target !== event.currentTarget) return;
  const modal = document.getElementById('adminProductModal');
  if (modal) modal.classList.remove('active');
}

async function saveAdminProduct(event) {
  event.preventDefault();
  const idVal = document.getElementById('adminProdId').value;
  const name = document.getElementById('adminProdName').value;
  const category = document.getElementById('adminProdCategory').value;
  const tag = document.getElementById('adminProdTag').value;
  const price = parseFloat(document.getElementById('adminProdPrice').value);
  const oldPrice = parseFloat(document.getElementById('adminProdOldPrice').value) || null;
  const stock = parseInt(document.getElementById('adminProdStock').value, 10) || 0;
  const rating = parseFloat(document.getElementById('adminProdRating').value) || 4.9;
  const reviews = parseInt(document.getElementById('adminProdReviews').value, 10) || 20;
  const image = document.getElementById('adminProdImage').value;
  const description = document.getElementById('adminProdDesc').value;
  const ingrRaw = document.getElementById('adminProdIngredients').value;
  const specsRaw = document.getElementById('adminProdSpecs').value;
  const bestseller = document.getElementById('adminProdBestseller').checked;

  const ingredients = ingrRaw.split(',').map(s => s.trim()).filter(Boolean);
  const specs = specsRaw.split(',').map(s => s.trim()).filter(Boolean);

  const payload = {
    name, category, tag, price, oldPrice, stock, rating, reviews, image, description, ingredients, specs, bestseller
  };

  try {
    let res, data;
    if (idVal) {
      // Edit product
      res = await fetch(`/api/admin/products/${idVal}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      // Add product
      res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }
    data = await res.json();

    if (data.success) {
      closeAdminProductModal();
      await fetchProducts(); // Refresh products
      renderAdminStandaloneTable();
      alert(`🎉 Product ${idVal ? 'updated' : 'created'} successfully! Changes are live.`);
    } else {
      alert('Failed to save product: ' + data.message);
    }
  } catch (err) {
    alert('Error saving product: ' + err.message);
  }
}

async function deleteAdminProduct(id) {
  if (!confirm('Are you sure you want to delete this product from the catalogue?')) return;

  try {
    const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      await fetchProducts();
      renderAdminStandaloneTable();
      alert('🗑️ Product deleted successfully!');
    } else {
      alert('Failed to delete product: ' + data.message);
    }
  } catch (err) {
    alert('Error deleting product: ' + err.message);
  }
}

async function updateAdminStockQuantity(id, newQty) {
  const qty = parseInt(newQty, 10);
  try {
    const res = await fetch(`/api/admin/products/${id}/stock`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock: qty })
    });
    const data = await res.json();
    if (data.success) {
      const prod = productsData.find(p => p.id === id);
      if (prod) prod.stock = qty;
      renderAdminStandaloneTable();
      renderFilteredProducts();
    }
  } catch (err) {
    console.error('Failed to update stock quantity:', err);
  }
}

async function loadStandaloneAdminOrders() {
  const tbody = document.getElementById('dashStandaloneOrdersTableBody');
  if (!tbody) return;

  try {
    const res = await fetch('/api/admin/orders');
    const data = await res.json();

    if (data.success && data.orders && data.orders.length > 0) {
      tbody.innerHTML = data.orders.map(o => `
        <tr>
          <td><strong>#${o.orderId}</strong></td>
          <td style="font-size: 0.82rem; color: #555;">${new Date(o.createdAt || Date.now()).toLocaleString()}</td>
          <td>
            <strong>${o.customerName || 'Customer'}</strong><br>
            <span style="font-size: 0.8rem; color: #666;">${o.customerEmail} | ${o.customerPhone}</span>
          </td>
          <td style="font-size: 0.85rem; color: #555; max-width: 200px;">${o.customerAddress || '-'}</td>
          <td><span style="font-size: 0.8rem; font-weight: 700; background: #f0f4f2; padding: 3px 8px; border-radius: 6px;">${o.paymentMethod || 'Online'}</span></td>
          <td style="font-size: 0.85rem;">${(o.items || []).map(i => `${i.name} (x${i.quantity})`).join(', ')}</td>
          <td><strong style="color: var(--deep-green);">₹${(o.financials ? o.financials.totalPayable : o.totalAmount || 0).toLocaleString('en-IN')}</strong></td>
          <td>
            <select onchange="updateAdminOrderStatus('${o.orderId}', this.value)" style="padding: 5px; border-radius: 6px; font-weight: 700; font-size: 0.8rem;">
              <option value="Confirmed" ${o.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
              <option value="Processing" ${o.status === 'Processing' ? 'selected' : ''}>Processing</option>
              <option value="Shipped" ${o.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
              <option value="Delivered" ${o.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
              <option value="Cancelled" ${o.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
          </td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 25px;">No customer orders received yet.</td></tr>';
    }
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: red; padding: 25px;">Failed to fetch orders from database.</td></tr>';
  }
}

async function updateAdminOrderStatus(orderId, newStatus) {
  try {
    const res = await fetch(`/api/admin/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    const data = await res.json();
    if (data.success) {
      alert(`Order #${orderId} status updated to: ${newStatus}`);
    } else {
      alert('Failed to update status: ' + data.message);
    }
  } catch (err) {
    alert('Error updating order status: ' + err.message);
  }
}

function toggleWebsitePreview() {
  document.body.classList.remove('admin-mode-active');
  const standaloneDash = document.getElementById('adminStandaloneDashboard');
  if (standaloneDash) standaloneDash.style.display = 'none';
  sessionStorage.setItem('kiyan_admin_preview', 'true');
  showPage('home', null);
}




