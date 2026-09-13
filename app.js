const products = [
  { id: 1, name: 'Relaxed linen shirt', category: 'Men', price: 699, oldPrice: 1199, rating: '4.8', tag: 'Bestseller', image: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=700&q=80' },
  { id: 2, name: 'Minimal leather sneakers', category: 'Men', price: 899, oldPrice: 1499, rating: '4.6', tag: 'New', image: 'https://images.unsplash.com/photo-1495555961986-6d4c1ecb7be3?auto=format&fit=crop&w=700&q=80' },
  { id: 3, name: 'Daily care grooming kit', category: 'Men', price: 399, oldPrice: 650, rating: '4.9', tag: 'Loved', image: 'https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&w=700&q=80' },
  { id: 4, name: 'Classic canvas weekender', category: 'Men', price: 749, oldPrice: 1199, rating: '4.7', tag: 'Trending', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=700&q=80' },
  { id: 5, name: 'Everyday cotton polo', category: 'Men', price: 499, oldPrice: 899, rating: '4.8', tag: 'Bestseller', image: 'https://images.unsplash.com/photo-1625910513413-5fc45b3b8b99?auto=format&fit=crop&w=700&q=80' },
  { id: 6, name: 'Stainless steel watch', category: 'Men', price: 599, oldPrice: 999, rating: '4.5', tag: 'Value pick', image: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=700&q=80' },
  { id: 7, name: 'Textured overshirt jacket', category: 'Men', price: 999, oldPrice: 1599, rating: '4.7', tag: 'Viral', image: 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=700&q=80' },
  { id: 8, name: 'Polarized travel sunglasses', category: 'Men', price: 299, oldPrice: 499, rating: '4.6', tag: 'Under ₹499', image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=700&q=80' }
];

const grid = document.querySelector('#product-grid');
const searchInput = document.querySelector('#search-input');
const resultCount = document.querySelector('#result-count');
const emptyState = document.querySelector('#empty-state');
const toast = document.querySelector('#toast');
let selectedCategory = 'All';
let cartCount = 0;
let cartItems = [];
let paymentMethod = 'card';

async function setupAccount() {
  const profileLink = document.querySelector('#profile-link');
  const profileLabel = document.querySelector('#profile-label');
  const profilePanel = document.querySelector('#profile-panel');
  const profileName = document.querySelector('#profile-name');
  const profileEmail = document.querySelector('#profile-email');
  const profileAvatar = document.querySelector('#profile-avatar');
  const signoutButton = document.querySelector('#profile-signout');
  if (!profileLink || !profileLabel) return;
  const user = await ArrivalDB.getUser();
  if (!user) return;
  const firstName = user.email.split('@')[0].split(/[._-]/)[0];
  profileLabel.textContent = `Hi, ${firstName}`;
  profileLink.title = 'Sign out';
  profileLink.classList.add('is-signed-in');
  profileName.textContent = firstName.charAt(0).toUpperCase() + firstName.slice(1);
  profileEmail.textContent = user.email;
  profileAvatar.textContent = firstName.charAt(0).toUpperCase();
  const orders = await ArrivalDB.getOrders();
  const memberDate = user.signedInAt ? new Date(user.signedInAt) : new Date();
  document.querySelector('#profile-orders-count').textContent = orders.filter((order) => order.email === user.email).length;
  document.querySelector('#profile-member-since').textContent = memberDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  profileLink.addEventListener('click', (event) => {
    event.preventDefault();
    profilePanel.hidden = !profilePanel.hidden;
    profileLink.setAttribute('aria-expanded', String(!profilePanel.hidden));
  });
  signoutButton.addEventListener('click', async () => {
    await ArrivalDB.clearUser();
    profilePanel.hidden = true;
    profileLabel.textContent = 'Profile';
    profileLink.title = 'Sign in';
    profileLink.classList.remove('is-signed-in');
    profileLink.setAttribute('aria-expanded', 'false');
    showToast('You have been signed out');
  });
}

function formatPrice(value) { return `₹${value.toLocaleString('en-IN')}`; }
function cartTotal() { return cartItems.reduce((total, item) => total + item.price * item.quantity, 0); }
function openPayment() {
  document.querySelector('#cart-panel').hidden = true;
  document.querySelector('#payment-total').textContent = formatPrice(cartTotal());
  document.querySelector('#confirm-payment-total').textContent = formatPrice(cartTotal());
  document.querySelector('#payment-backdrop').hidden = false;
}
function selectPaymentMethod(method) {
  paymentMethod = method;
  document.querySelectorAll('[data-payment-method]').forEach((button) => button.classList.toggle('active', button.dataset.paymentMethod === method));
  document.querySelector('#card-fields').hidden = method !== 'card';
  document.querySelector('#upi-fields').hidden = method !== 'upi';
  document.querySelector('#cod-fields').hidden = method !== 'cod';
  document.querySelectorAll('#card-fields input').forEach((input) => { input.required = method === 'card'; });
  document.querySelector('#upi-id').required = method === 'upi';
  document.querySelector('#confirm-payment').firstChild.textContent = method === 'cod' ? 'Place order ' : 'Pay ';
}
function renderCart() {
  cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);
  document.querySelector('#cart-count').textContent = cartCount;
  document.querySelector('#cart-total').textContent = formatPrice(cartTotal());
  const cartItemsElement = document.querySelector('#cart-items');
  cartItemsElement.innerHTML = cartItems.length ? cartItems.map((item) => `<div class="cart-item"><img src="${item.image}" alt="${item.name}" /><div><strong>${item.name}</strong><span>${item.quantity} × ${formatPrice(item.price)}</span></div><button type="button" data-remove-cart="${item.id}" aria-label="Remove ${item.name}">×</button></div>`).join('') : '<div class="cart-empty"><span>⌁</span><strong>Your bag is waiting.</strong><p>Add a find to get started.</p></div>';
}
async function addToCart(product) {
  const existingItem = cartItems.find((item) => item.id === product.id);
  if (existingItem) existingItem.quantity += 1;
  else cartItems.push({ id: product.id, name: product.name, price: product.price, image: product.image, quantity: 1 });
  await ArrivalDB.saveCart(cartItems);
  renderCart();
  showToast(`${product.name} added to your bag`);
}
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2200);
}
function getVisibleProducts() {
  const query = searchInput.value.trim().toLowerCase();
  const visible = products.filter((product) => {
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    const matchesQuery = !query || `${product.name} ${product.category}`.toLowerCase().includes(query);
    return matchesCategory && matchesQuery;
  });
  const sort = document.querySelector('#sort-select').value;
  if (sort === 'low') visible.sort((a, b) => a.price - b.price);
  if (sort === 'high') visible.sort((a, b) => b.price - a.price);
  return visible;
}
function renderProducts() {
  const visible = getVisibleProducts();
  resultCount.textContent = `${visible.length} ${visible.length === 1 ? 'find' : 'finds'}`;
  emptyState.hidden = visible.length > 0;
  grid.innerHTML = visible.map((product) => `
    <article class="product-card">
      <div class="product-image"><img src="${product.image}" alt="${product.name}" loading="lazy" /><span class="product-tag">${product.tag}</span><button class="wishlist" type="button" aria-label="Save ${product.name}" data-wishlist="${product.id}">♡</button></div>
      <div class="product-info"><div class="product-meta"><span>${product.category}</span><span>★ ${product.rating}</span></div><h3 class="product-name">${product.name}</h3><div class="product-bottom"><span class="price">${formatPrice(product.price)} <del>${formatPrice(product.oldPrice)}</del></span><button class="add-button" type="button" data-add="${product.id}">+ Add</button></div></div>
    </article>`).join('');
}
function setCategory(category) {
  selectedCategory = category;
  document.querySelectorAll('.filter').forEach((button) => button.classList.toggle('active', button.dataset.category === category));
  renderProducts();
}

document.addEventListener('click', (event) => {
  if (!event.target.closest('.profile-wrap')) {
    const profilePanel = document.querySelector('#profile-panel');
    const profileLink = document.querySelector('#profile-link');
    if (profilePanel) profilePanel.hidden = true;
    if (profileLink) profileLink.setAttribute('aria-expanded', 'false');
  }
  const addButton = event.target.closest('[data-add]');
  if (addButton) {
    const product = products.find((item) => item.id === Number(addButton.dataset.add));
    addToCart(product);
  }
  const removeButton = event.target.closest('[data-remove-cart]');
  if (removeButton) {
    cartItems = cartItems.filter((item) => item.id !== Number(removeButton.dataset.removeCart));
    ArrivalDB.saveCart(cartItems);
    renderCart();
  }
  const wishlist = event.target.closest('[data-wishlist]');
  if (wishlist) {
    wishlist.classList.toggle('active');
    wishlist.textContent = wishlist.classList.contains('active') ? '♥' : '♡';
    showToast(wishlist.classList.contains('active') ? 'Saved to your wishlist' : 'Removed from wishlist');
  }
  const categoryTrigger = event.target.closest('[data-category]');
  if (categoryTrigger) {
    event.preventDefault();
    setCategory(categoryTrigger.dataset.category);
    document.querySelector('#products').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  const profileAction = event.target.closest('[data-profile-action]');
  if (profileAction) showToast(`${profileAction.textContent.trim().replace('→', '')} will be available soon`);
  const paymentMethodButton = event.target.closest('[data-payment-method]');
  if (paymentMethodButton) selectPaymentMethod(paymentMethodButton.dataset.paymentMethod);
});
document.querySelector('#cart-button').addEventListener('click', () => {
  document.querySelector('#cart-panel').hidden = !document.querySelector('#cart-panel').hidden;
});
document.querySelector('#cart-close').addEventListener('click', () => { document.querySelector('#cart-panel').hidden = true; });
document.querySelector('#place-order').addEventListener('click', async () => {
  if (!cartItems.length) { showToast('Your bag is empty'); return; }
  const user = await ArrivalDB.getUser();
  if (!user) {
    showToast('Sign in to place your order');
    window.setTimeout(() => { window.location.href = 'login.html'; }, 700);
    return;
  }
  openPayment();
});
document.querySelector('#payment-close').addEventListener('click', () => { document.querySelector('#payment-backdrop').hidden = true; });
document.querySelector('#payment-backdrop').addEventListener('click', (event) => {
  if (event.target.id === 'payment-backdrop') event.currentTarget.hidden = true;
});
document.querySelector('#payment-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!event.currentTarget.checkValidity()) { event.currentTarget.reportValidity(); return; }
  const user = await ArrivalDB.getUser();
  if (!user) { showToast('Please sign in again'); document.querySelector('#payment-backdrop').hidden = true; return; }
  const order = { id: `ARR-${Date.now().toString().slice(-6)}`, email: user.email, items: cartItems, total: cartTotal(), paymentMethod, status: 'Placed', placedAt: new Date().toISOString() };
  await ArrivalDB.saveOrder(order);
  await ArrivalDB.clearCart();
  cartItems = [];
  renderCart();
  document.querySelector('#payment-backdrop').hidden = true;
  showToast(`Order ${order.id} placed successfully`);
});
searchInput.addEventListener('input', renderProducts);
document.querySelector('#sort-select').addEventListener('change', renderProducts);
document.querySelector('#copy-code').addEventListener('click', async (event) => {
  try { await navigator.clipboard.writeText('HAATLY25'); } catch (error) { /* clipboard may be unavailable on file URLs */ }
  event.currentTarget.textContent = 'Copied ✓';
  showToast('Code HAATLY25 copied');
  window.setTimeout(() => { event.currentTarget.textContent = 'Copy code'; }, 1800);
});
document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); searchInput.focus(); }
  if (event.key === 'Escape') {
    document.querySelector('#payment-backdrop').hidden = true;
    document.querySelector('#cart-panel').hidden = true;
    document.querySelector('#profile-panel').hidden = true;
    document.querySelector('#profile-link').setAttribute('aria-expanded', 'false');
  }
});
setupAccount();
ArrivalDB.getCart().then((savedCart) => { cartItems = savedCart; renderCart(); });
if (new URLSearchParams(window.location.search).get('loggedIn') === '1') {
  showToast('Welcome to Arrival');
  window.history.replaceState({}, document.title, 'index.html');
}
renderProducts();
