let inventory = [];
let cart = [];
const BACKEND_URL = "https://lessence-backend.onrender.com";

window.addEventListener('DOMContentLoaded', () => {
    // 1. Initial Data Fetch
    fetchInventory();
    
    // 2. Track Analytics
    fetch(`${BACKEND_URL}/api/track-visit`, { method: 'POST' }).catch(() => {});
});

async function fetchInventory() {
    try {
        const res = await fetch(`${BACKEND_URL}/api/products`);
        inventory = await res.json();
        console.log("Vault Connection Established.");
    } catch (e) {
        console.error("Vault Offline.");
    }
}

function enterBoutique() {
    document.getElementById('home-splash').classList.add('hidden');
    document.getElementById('main-content').style.opacity = "1";
    renderProducts('all');
}

function renderProducts(filter) {
    const grid = document.getElementById('collections');
    let items = filter === 'all' ? inventory : inventory.filter(p => p.category === filter);
    
    grid.innerHTML = items.map(p => `
        <div class="product-card">
            ${p.bestseller ? '<span class="badge-bestseller">Icon</span>' : ''}
            <img src="${p.img}" class="product-image">
            <h3 class="brand-font">${p.name}</h3>
            <div class="price-tag">Rs. ${p.price}/-</div>
            <div class="product-meta">${p.stock} Remaining</div>
            <button class="btn-tf" onclick="addToCart(${p.id})">Add to Cart</button>
        </div>
    `).join('');
}

function addToCart(id) {
    const product = inventory.find(p => p.id === id);
    const existing = cart.find(i => i.id === id);
    if (existing) existing.quantity++;
    else cart.push({...product, quantity: 1});
    
    updateUI();
    showToast(`${product.name} Added.`);
    toggleCart(true);
}

function updateUI() {
    document.getElementById('cart-count').innerText = cart.reduce((s, i) => s + i.quantity, 0);
    const container = document.getElementById('cart-items');
    
    if (cart.length === 0) {
        container.innerHTML = `<p style="text-align:center; padding:50px; color:#666;">Selection Empty</p>`;
        document.getElementById('cart-footer').style.display = 'none';
        document.getElementById('cart-checkout-details').style.display = 'none';
        return;
    }

    document.getElementById('cart-footer').style.display = 'block';
    document.getElementById('cart-checkout-details').style.display = 'block';

    container.innerHTML = cart.map(i => `
        <div style="display:flex; justify-content:space-between; padding:20px 0; border-bottom:1px solid #222;">
            <div>
                <div style="font-size:0.8rem; font-weight:600;">${i.name}</div>
                <div style="font-size:0.7rem; color:#666;">Qty: ${i.quantity}</div>
            </div>
            <div style="font-size:0.8rem;">${i.price * i.quantity}/-</div>
        </div>
    `).join('');

    let total = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
    document.getElementById('sum-total').innerText = total + "/-";
}

async function validateAndShowPayment() {
    const email = document.getElementById('cust-email').value;
    if (!email) return showCustomAlert("ERROR", "Please provide a valid email.");
    
    const btn = document.getElementById('checkout-btn');
    btn.innerText = "AUTHENTICATING...";
    
    try {
        const res = await fetch(`${BACKEND_URL}/api/request-otp`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ email: email })
        });
        if (res.ok) {
            toggleCart(false);
            document.getElementById('otp-modal').classList.add('active');
        } else {
            showCustomAlert("ERROR", "Failed to reach authorization server.");
        }
    } catch (e) {
        showCustomAlert("OFFLINE", "Check your internet connection.");
    } finally {
        btn.innerText = "Checkout Securely";
    }
}

async function verifyAndDispatch() {
    const email = document.getElementById('cust-email').value;
    const otp = document.getElementById('otp-input').value;
    const btn = document.getElementById('verify-btn');
    
    btn.innerText = "VERIFYING...";
    
    try {
        const res = await fetch(`${BACKEND_URL}/api/verify-otp`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ email, otp })
        });
        
        if (res.ok) {
            const total = parseInt(document.getElementById('sum-total').innerText);
            await fetch(`${BACKEND_URL}/api/dispatch`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    order_id: "ORD-" + Date.now(),
                    customer_name: document.getElementById('cust-name').value,
                    total_value: total,
                    items: cart
                })
            });
            showCustomAlert("SUCCESS", "Order dispatched. Receipt sent to email.");
            cart = []; updateUI(); closeOTPModal();
        } else {
            showCustomAlert("INVALID", "Authorization code incorrect.");
        }
    } catch (e) {
        showCustomAlert("ERROR", "System timeout.");
    } finally {
        btn.innerText = "Verify & Complete Order";
    }
}

// UI HELPERS
function toggleCart(show) { document.getElementById('cart-overlay').classList[show?'add':'remove']('open'); }
function closeOTPModal() { document.getElementById('otp-modal').classList.remove('active'); }
function showToast(msg) { 
    const t = document.getElementById('toast'); 
    t.innerText = msg; t.classList.add('show'); 
    setTimeout(() => t.classList.remove('show'), 3000); 
}
function showCustomAlert(title, msg) {
    document.getElementById('alert-title').innerText = title;
    document.getElementById('alert-message').innerText = msg;
    document.getElementById('custom-alert-modal').classList.add('active');
}
function closeAlertModal() { document.getElementById('custom-alert-modal').classList.remove('active'); }