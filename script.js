let inventory = []; // CRITICAL: This must be at the top

window.addEventListener('DOMContentLoaded', async () => {
    console.log("Connecting to L'ESSENCE Brain...");
    
    try {
        // REPLACE THE URL BELOW WITH YOUR ACTUAL RENDER URL
        const res = await fetch('https://YOUR-BACKEND-NAME.onrender.com/api/products');
        
        if (!res.ok) throw new Error("Server responded with error");
        
        inventory = await res.json();
        console.log("Inventory Loaded:", inventory);
        
        // If we are already on the main page, show products
        if (document.getElementById('collections')) {
            renderProducts('all');
        }
    } catch (error) {
        console.error("Backend Connection Failed:", error);
        // PRO TIP: If the server is down, show a friendly message to the client
        const grid = document.getElementById('collections');
        if (grid) {
            grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 50px;">
                <p>Establishing secure connection to Private Blend Vault...</p>
                <p style="font-size: 0.7rem; color: #666;">(Please refresh in 30 seconds while the server wakes up)</p>
            </div>`;
        }
    }
});

// Automatically track the visit when the page loads
window.addEventListener('DOMContentLoaded', () => {
    fetch('https://lessence-backend.onrender.com/api/track-visit', { 
        method: 'POST' 
    }).catch(err => console.log("Analytics loading in background..."));
});
let cart = [];
let currentDiscountCode = "";
let discountMultiplier = 0.0;

function enterBoutique() {
    document.getElementById('home-splash').classList.add('hidden');
    document.getElementById('main-content').style.opacity = "1";
    renderProducts('all');
}

document.getElementById('enter-btn').addEventListener('click', enterBoutique);

function filterBoutique(filterType, btnElement = null) {
    if (btnElement) {
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        btnElement.classList.add('active');
    }
    let filteredList = filterType === 'all' ? inventory : 
                       filterType === 'bestseller' ? inventory.filter(p => p.bestseller) : 
                       inventory.filter(p => p.category === filterType);
    renderProductsList(filteredList);
}

function renderProductsList(productsToRender) {
    const grid = document.getElementById('collections');
    grid.innerHTML = productsToRender.map(p => `
        <div class="product-card">
            ${p.bestseller ? '<span class="badge-bestseller">Icon</span>' : ''}
            <img src="${p.img}" alt="${p.name}" class="product-image">
            <div class="product-meta">${p.category} | ${p.stock} Remaining</div>
            <h3 class="product-title brand-font">${p.name}</h3>
            <div class="pyramid-box">
                <div class="note-layer"><strong>T:</strong> ${p.top}</div>
                <div class="note-layer"><strong>H:</strong> ${p.heart}</div>
                <div class="note-layer"><strong>B:</strong> ${p.base}</div>
            </div>
            <div class="price-tag">${p.price}/-</div>
            <button class="btn-tf" onclick="addToCart(${p.id})">Add to Cart</button>
            <button class="btn-secondary" style="width: 100%; padding: 15px; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 4px; font-family: 'Jost', sans-serif; cursor: pointer; transition: 0.3s;" onclick="window.open('details.html?id=${p.id}', '_blank')">View Details</button>
        </div>
    `).join('');
}

function renderProducts() { renderProductsList(inventory); }

function addToCart(id) {
    const product = inventory.find(p => p.id === id);
    const existingItem = cart.find(item => item.id === id);
    if (existingItem) existingItem.quantity += 1; 
    else cart.push({ ...product, quantity: 1 }); 
    
    updateUI();
    const t = document.getElementById('toast');
    t.innerText = `${product.name} ADDED.`;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
    toggleCart(true); 
}

function updateQuantity(id, change) {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    item.quantity += change;
    if (item.quantity <= 0) cart = cart.filter(i => i.id !== id); 
    updateUI();
}

async function applyPromo() {
    const codeInput = document.getElementById('promo-input');
    const code = codeInput.value.trim().toUpperCase();
    const msg = document.getElementById('promo-msg');
    const applyBtn = codeInput.nextElementSibling; 

    if (!code) { msg.innerText = "Please enter a code."; msg.style.color = "#ff3333"; return; }

    applyBtn.innerText = "VERIFY...";
    applyBtn.disabled = true;

    try {
        const response = await fetch('https://lessence-backend.onrender.com/api/validate-promo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: code })
        });
        const data = await response.json();
        if (response.ok) {
            currentDiscountCode = code; discountMultiplier = data.discount_multiplier;
            msg.style.color = "#4caf50"; msg.innerText = `Code ${code} applied (-${discountMultiplier * 100}%)`;
        } else {
            currentDiscountCode = ""; discountMultiplier = 0;
            msg.style.color = "#ff3333"; msg.innerText = data.message;
        }
        updateUI();
    } catch (error) {
        msg.style.color = "#ff3333"; msg.innerText = "Could not verify code with server.";
    } finally {
        applyBtn.innerText = "APPLY"; applyBtn.disabled = false;
    }
}

function updateUI() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cart-count').innerText = totalItems;
    
    const cartItemsContainer = document.getElementById('cart-items');
    const cartFooter = document.getElementById('cart-footer');
    const cartDetails = document.getElementById('cart-checkout-details');

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `<div style="text-align: center; padding: 100px 20px; color: var(--muted);"><p class="brand-font" style="font-size: 1rem; margin-bottom: 30px; letter-spacing: 4px;">CART IS EMPTY</p><button class="btn-secondary" style="padding: 15px 30px; text-transform: uppercase; font-size: 0.7rem; cursor: pointer;" onclick="toggleCart(false)">Continue Shopping</button></div>`;
        cartFooter.style.display = 'none'; cartDetails.style.display = 'none'; return; 
    }

    cartFooter.style.display = 'block'; cartDetails.style.display = 'block';

    let subtotal = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
    let shipFee = 150; 
    let discountAmount = 0;
    const progressLine = document.getElementById('progress-line');
    
    progressLine.style.width = Math.min((subtotal/10000)*100, 100) + "%";

    if (subtotal >= 10000) {
        discountAmount = subtotal * 0.15; shipFee = 0; 
        document.getElementById('promo-text').innerText = "PRIVATE CLIENT TIER UNLOCKED (-15% & COMPLIMENTARY SHIPPING)";
        progressLine.classList.add('pulse');
        document.getElementById('promo-msg').innerText = "Tier discount applied (15%). Manual codes disabled.";
        document.getElementById('promo-msg').style.color = "var(--muted)";
    } else {
        document.getElementById('promo-text').innerText = `Spend ${10000 - subtotal}/- more to unlock Private Client tier`;
        progressLine.classList.remove('pulse');
        if (discountMultiplier > 0) discountAmount = subtotal * discountMultiplier;
    }

    let wrapFee = document.getElementById('gift-wrap').checked ? 500 : 0;
    const grandTotal = Math.round(subtotal - discountAmount + shipFee + wrapFee);
    
    document.getElementById('sum-sub').innerText = subtotal + "/-";
    if (discountAmount > 0) {
        document.getElementById('sum-discount-row').style.display = 'flex';
        document.getElementById('sum-discount').innerText = "-" + Math.round(discountAmount) + "/-";
    } else { document.getElementById('sum-discount-row').style.display = 'none'; }

    document.getElementById('sum-ship').innerText = shipFee === 0 ? "Complimentary" : shipFee + "/-";
    document.getElementById('sum-wrap-row').style.display = wrapFee > 0 ? 'flex' : 'none';
    document.getElementById('sum-total').innerText = grandTotal + "/-";

    cartItemsContainer.innerHTML = cart.map(item => `
        <div style="display:flex; justify-content:space-between; padding:30px 0; border-bottom:1px solid var(--border); align-items: center;">
            <div style="flex-grow: 1;">
                <div style="font-size: 0.8rem; letter-spacing: 2px; font-weight: 600; font-family: 'Jost', sans-serif; text-transform: uppercase;">${item.name}</div>
                <div style="font-size: 0.8rem; color: var(--muted); margin-top: 8px;">${item.price}/-</div>
            </div>
            <div class="qty-controls">
                <button class="qty-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
                <span style="font-size: 0.85rem; font-weight: 400; width: 25px; text-align: center;">${item.quantity}</span>
                <button class="qty-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
            </div>
        </div>
    `).join('');
}

function toggleCart(show) { 
    document.getElementById('cart-overlay').classList[show ? 'add' : 'remove']('open');
}

async function validateAndShowPayment() {
    const fields = ['cust-name', 'cust-email', 'cust-address'];
    if (!fields.every(id => document.getElementById(id).value.trim() !== '')) {
      return showCustomAlert("ATTENTION", "Required fields missing in shipping details.");
    }
    
    const email = document.getElementById('cust-email').value.trim();
    const btn = document.getElementById('checkout-btn');
    btn.innerText = "SECURING..."; btn.disabled = true;

    try {
        const res = await fetch('https://lessence-backend.onrender.com/api/request-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email }) });
        if (res.ok) { toggleCart(false); document.getElementById('otp-modal').classList.add('active'); }
        else return showCustomAlert("ATTENTION", "Required fields missing in shipping details.");
    } catch (e) { alert("API Offline."); }
    finally { btn.innerText = "Checkout Securely"; btn.disabled = false; }
}

function closeOTPModal() {
    document.getElementById('otp-modal').classList.remove('active');
    document.getElementById('otp-input').value = '';
}

async function verifyAndDispatch() {
    const email = document.getElementById('cust-email').value.trim();
    const otp = document.getElementById('otp-input').value.trim();
    const btn = document.getElementById('verify-btn');
    
    if (otp.length !== 6) return alert("Enter 6-digit code.");
    btn.innerText = "VERIFYING..."; btn.disabled = true;

    try {
        console.log("STEP 1: Sending OTP to server...");
        const res = await fetch('https://lessence-backend.onrender.com/api/verify-otp', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ email: email, otp: otp }) 
        });
        
        if (!res.ok) {
            btn.innerText = "Verify & Complete Order"; btn.disabled = false;
            return alert("Auth Failed. Incorrect code.");
        }
        
        console.log("STEP 2: OTP Verified! Sending Dispatch Request to Database...");
        
        // Grab the grand total number from the cart to send to the database
        const totalText = document.getElementById('sum-total').innerText;
        const totalValue = parseInt(totalText.replace('/-', ''));

        const dispatchRes = await fetch('https://lessence-backend.onrender.com/api/dispatch', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ 
                order_id: "ORD-" + Date.now(), 
                customer_name: document.getElementById('cust-name').value,
                total_value: totalValue,
                email: email // <-- ADD THIS LINE! We are handing the email to the backend.
            }) 
        });
        
        console.log("STEP 3: Dispatch successful!");
        
        if (dispatchRes.ok) { 
            // <-- Update your alert to use the aesthetic modal and mention the email! -->
            showCustomAlert("ORDER CONFIRMED", "Authorization successful. Your AWB tracking details have been emailed to you.");
            closeOTPModal(); 
            cart = []; 
            updateUI(); 
        } else {
            showCustomAlert("ERROR", "Database Error: Could not save order.");
        }
        ;
        
        console.log("STEP 3: Dispatch successful!");
        
        if (dispatchRes.ok) { 
            alert("Order Successful! Check Terminal for details."); 
            closeOTPModal(); 
            cart = []; 
            updateUI(); 
        } else {
            alert("Database Error: Could not save order.");
        }
    } catch (e) { 
        console.error("FRONTEND CRASH DETECTED:", e);
        alert("System Error: " + e.message); 
    } finally { 
        btn.innerText = "Verify & Complete Order"; 
        btn.disabled = false; 
    }
}
// --- CUSTOM ALERT LOGIC ---
function showCustomAlert(title, message) {
    document.getElementById('alert-title').innerText = title;
    document.getElementById('alert-message').innerText = message;
    document.getElementById('custom-alert-modal').classList.add('active');
}

function closeAlertModal() {
    document.getElementById('custom-alert-modal').classList.remove('active');
}