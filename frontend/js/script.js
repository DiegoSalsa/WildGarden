// Menu Toggle
const menuToggle = document.querySelector('.menu-toggle');
const navMenu = document.querySelector('.nav-menu');
const navLinks = document.querySelectorAll('.nav-links a');

if (menuToggle) {
    menuToggle.addEventListener('click', () => {
        menuToggle.classList.toggle('active');
        navMenu.classList.toggle('active');
    });
}

// Cerrar menú al hacer clic en un enlace
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        menuToggle.classList.remove('active');
        navMenu.classList.remove('active');
    });
});

// Search Overlay
const searchBtn = document.querySelector('.search-btn');
const searchOverlay = document.getElementById('searchOverlay');
const searchClose = document.querySelector('.search-close');
const searchInput = document.querySelector('.search-input');

if (searchBtn && searchOverlay) {
    searchBtn.addEventListener('click', () => {
        searchOverlay.classList.add('active');
        searchInput?.focus();
    });
    
    searchClose?.addEventListener('click', () => {
        searchOverlay.classList.remove('active');
    });
    
    searchOverlay.addEventListener('click', (e) => {
        if (e.target === searchOverlay) {
            searchOverlay.classList.remove('active');
        }
    });
}

// Header Hide on Scroll
let lastScrollTop = 0;
const header = document.querySelector('.header');

if (header) {
    window.addEventListener('scroll', () => {
        let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > 100) {
            if (scrollTop > lastScrollTop) {
                // Scrolling down
                header.style.transform = 'translateY(-100%)';
            } else {
                // Scrolling up
                header.style.transform = 'translateY(0)';
            }
        }
        
        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    });
}

// Smooth scroll para navegación interna
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href === '#') return;
        
        e.preventDefault();
        const element = document.querySelector(href);
        if (element) {
            const headerHeight = header?.offsetHeight || 80;
            const elementPosition = element.offsetTop - headerHeight;
            window.scrollTo({
                top: elementPosition,
                behavior: 'smooth'
            });
        }
    });
});

// Producto Card Interactions
const productoCards = document.querySelectorAll('.producto-card');
productoCards.forEach(card => {
    card.addEventListener('click', function() {
        console.log('Producto clicked');
    });
});

// Cart Button Actions
const addToCartButtons = document.querySelectorAll('.add-to-cart');
addToCartButtons.forEach((button, index) => {
    button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log(`Producto ${index + 1} agregado al carrito`);
        // Aquí se conectará con la API del backend
    });
});

// Formulario de Contacto
const contactForm = document.querySelector('.contacto-form');
if (contactForm) {
    const form = contactForm.querySelector('form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log('Formulario de contacto enviado');
            // Aquí se conectará con la API del backend
            form.reset();
        });
    }
}

// Auth Forms
const authForms = document.querySelectorAll('.auth-form');
authForms.forEach(form => {
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        console.log('Auth form submitted');
        // Aquí se conectará con la API del backend
    });
});

// Carrito Item Management
const removeButtons = document.querySelectorAll('.item-remove');
removeButtons.forEach(button => {
    button.addEventListener('click', function() {
        this.closest('.carrito-item').remove();
        console.log('Item removed from cart');
        // Actualizar total y conectar con backend
    });
});

const qtyButtons = document.querySelectorAll('.qty-btn');
qtyButtons.forEach(button => {
    button.addEventListener('click', function() {
        const qtySpan = this.closest('.item-quantity').querySelector('span');
        const currentQty = parseInt(qtySpan.textContent);
        
        if (this.textContent === '+') {
            qtySpan.textContent = currentQty + 1;
        } else if (currentQty > 1) {
            qtySpan.textContent = currentQty - 1;
        }
    });
});

// Parallax Effect
let ticking = false;
const parallaxElements = document.querySelectorAll('[data-parallax]');

window.addEventListener('scroll', () => {
    if (!ticking) {
        window.requestAnimationFrame(() => {
            parallaxElements.forEach(element => {
                const scrollY = window.pageYOffset;
                const elementTop = element.offsetTop;
                const offset = (scrollY - elementTop) * 0.5;
                element.style.transform = `translateY(${offset}px)`;
            });
            ticking = false;
        });
        ticking = true;
    }
});

// Intersection Observer para animaciones
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observar elementos animados
document.querySelectorAll('.producto-card, .galeria-item').forEach(el => {
    el.style.opacity = '0';
    observer.observe(el);
});

// Search functionality
const searchForm = searchOverlay?.querySelector('form');
if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = searchInput.value;
        console.log('Búsqueda:', query);
        // Conectar con API de búsqueda del backend
    });
}

// ============================================
// CARRITO - Agregar productos
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Actualizar display del carrito
    updateCartDisplay();
    
    // Botones "Agregar al carrito"
    const addToCartButtons = document.querySelectorAll('.add-to-cart, .btn-agregar');
    addToCartButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Obtener info del producto del card
            const card = this.closest('.catalog-item') || this.closest('.producto-card');
            if (!card) return;
            
            const name = card.querySelector('h3')?.textContent || 'Producto';
            const priceText = card.querySelector('.catalog-price, .producto-precio')?.textContent || '0';
            const price = parseInt(priceText.match(/\d+/)?.[0]) || 0;
            
            // Crear objeto producto
            const product = {
                product_id: 'prod-' + Date.now(),
                name: name,
                price: price,
                quantity: 1
            };
            
            // Agregar al carrito
            cart.add(product);
            showNotification(`${name} agregado al carrito`, 'success');
        });
    });
    
    // Botón del carrito (ir a carrito.html)
    const cartBtn = document.querySelector('.cart-btn');
    if (cartBtn) {
        cartBtn.addEventListener('click', () => {
            if (window.location.pathname.includes('carrito')) return;
            window.location.href = 'pages/carrito.html';
        });
    }
});

// ============================================
// FORMULARIO DE REGISTRO
// ============================================

const registroForm = document.querySelector('form[action*="registro"]') || document.querySelector('form');
if (registroForm && window.location.pathname.includes('registro')) {
    registroForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(registroForm);
        const email = formData.get('email');
        const name = formData.get('name');
        const password = formData.get('password');
        const phone = formData.get('phone') || '';
        
        try {
            const response = await api.register(email, name, password, phone);
            showNotification('Registrado exitosamente. Redirigiendo...', 'success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
        } catch (error) {
            showNotification(error.message, 'error');
        }
    });
}

// ============================================
// FORMULARIO DE LOGIN
// ============================================

const loginForm = document.querySelector('form[action*="login"]') || 
    (window.location.pathname.includes('login') ? document.querySelector('form') : null);

if (loginForm && window.location.pathname.includes('login')) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(loginForm);
        const email = formData.get('email');
        const password = formData.get('password');
        
        try {
            const response = await api.login(email, password);
            showNotification('Login exitoso. Redirigiendo...', 'success');
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 1500);
        } catch (error) {
            showNotification(error.message, 'error');
        }
    });
}

// ============================================
// CARRITO - Página de carrito
// ============================================

if (window.location.pathname.includes('carrito')) {
    document.addEventListener('DOMContentLoaded', () => {
        renderCart();
        setupCheckout();
    });
    
    function renderCart() {
        const cartContainer = document.querySelector('.carrito-items');
        if (!cartContainer) return;
        
        if (cart.items.length === 0) {
            cartContainer.innerHTML = '<p>Tu carrito está vacío</p>';
            return;
        }
        
        cartContainer.innerHTML = cart.items.map(item => `
            <div class="carrito-item" data-product-id="${item.product_id}">
                <div class="item-image" style="background-color: #EDDECB;"></div>
                <div class="item-details">
                    <h3>${item.name}</h3>
                    <p class="item-price">${formatPrice(item.price)}</p>
                </div>
                <div class="item-quantity">
                    <button class="qty-btn qty-minus" data-product-id="${item.product_id}">-</button>
                    <span>${item.quantity}</span>
                    <button class="qty-btn qty-plus" data-product-id="${item.product_id}">+</button>
                </div>
                <div class="item-total">
                    <p>${formatPrice(item.price * item.quantity)}</p>
                </div>
                <button class="item-remove" data-product-id="${item.product_id}">&times;</button>
            </div>
        `).join('');
        
        // Event listeners para cantidad
        document.querySelectorAll('.qty-minus').forEach(btn => {
            btn.addEventListener('click', function() {
                const productId = this.dataset.productId;
                const item = cart.items.find(i => i.product_id === productId);
                if (item) cart.updateQuantity(productId, item.quantity - 1);
                renderCart();
            });
        });
        
        document.querySelectorAll('.qty-plus').forEach(btn => {
            btn.addEventListener('click', function() {
                const productId = this.dataset.productId;
                const item = cart.items.find(i => i.product_id === productId);
                if (item) cart.updateQuantity(productId, item.quantity + 1);
                renderCart();
            });
        });
        
        // Event listeners para eliminar
        document.querySelectorAll('.item-remove').forEach(btn => {
            btn.addEventListener('click', function() {
                const productId = this.dataset.productId;
                cart.remove(productId);
                renderCart();
            });
        });
        
        // Actualizar total
        updateCartTotal();
    }
    
    function updateCartTotal() {
        const totalPrice = cart.getTotal();
        const shippingCost = 5000;
        const finalTotal = totalPrice + shippingCost;
        
        const totalElement = document.querySelector('.carrito-total-precio');
        if (totalElement) {
            totalElement.textContent = formatPrice(finalTotal);
        }
    }
    
    function setupCheckout() {
        const checkoutBtn = document.querySelector('.checkout-btn, .btn-pagar, [type="submit"]');
        if (!checkoutBtn) return;
        
        checkoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            if (cart.items.length === 0) {
                showNotification('Tu carrito está vacío', 'error');
                return;
            }
            
            // Obtener datos del cliente
            const customerName = document.querySelector('input[name="name"]')?.value || 'Cliente';
            const customerEmail = document.querySelector('input[name="email"]')?.value || '';
            const customerPhone = document.querySelector('input[name="phone"]')?.value || '';
            const customerAddress = document.querySelector('input[name="address"]')?.value || '';
            const customerCity = document.querySelector('input[name="city"]')?.value || '';
            
            if (!customerEmail) {
                showNotification('Por favor completa tu email', 'error');
                return;
            }
            
            try {
                const orderId = generateOrderId();
                const totalPrice = cart.getTotal();
                const shippingCost = 5000;
                const finalTotal = totalPrice + shippingCost;
                
                const transaction = await api.createTransaction({
                    order_id: orderId,
                    amount: finalTotal,
                    customer_name: customerName,
                    customer_email: customerEmail,
                    customer_phone: customerPhone,
                    customer_address: customerAddress,
                    customer_city: customerCity,
                    cart_items: cart.items,
                    payment_method: 'webpay'
                });
                
                showNotification('Orden creada exitosamente', 'success');
                cart.clear();
                
                // Redirigir a página de pago o confirmación
                setTimeout(() => {
                    window.location.href = '../index.html?order=' + orderId;
                }, 2000);
            } catch (error) {
                showNotification('Error al crear la orden: ' + error.message, 'error');
            }
        });
    }
}

// ============================================
// CARGAR PRODUCTOS DE LA BASE DE DATOS
// ============================================

if (window.location.pathname.includes('productos')) {
    document.addEventListener('DOMContentLoaded', async () => {
        try {
            const products = await api.getProducts();
            console.log('Productos cargados:', products);
            // Aquí se pueden renderizar los productos dinámicamente si es necesario
        } catch (error) {
            console.error('Error al cargar productos:', error);
        }
    });
}

