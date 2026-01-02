// Menu Toggle
const menuToggle = document.querySelector('.menu-toggle');
const navMenu = document.querySelector('.nav-menu');
const navLinks = document.querySelectorAll('.nav-links a');

let lockedScrollY = 0;

function lockPageScroll() {
    lockedScrollY = window.scrollY || window.pageYOffset || 0;
    document.documentElement.classList.add('menu-open');
    document.body.classList.add('menu-open');
    document.body.style.position = 'fixed';
    document.body.style.top = `-${lockedScrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
}

function unlockPageScroll() {
    document.documentElement.classList.remove('menu-open');
    document.body.classList.remove('menu-open');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    window.scrollTo(0, lockedScrollY);
}

function isLoggedIn() {
    return !!localStorage.getItem('authToken');
}

function getStoredUser() {
    try {
        const raw = localStorage.getItem('user');
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function decodeJwtPayload(token) {
    try {
        if (!token || typeof token !== 'string') return null;
        const parts = token.split('.');
        if (parts.length < 2) return null;

        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
        const json = atob(padded);
        return JSON.parse(json);
    } catch {
        return null;
    }
}

function isAdminUser() {
    const token = localStorage.getItem('authToken');
    const claims = decodeJwtPayload(token);
    return !!claims?.admin;
}

function updateAuthLinks() {
    const links = document.querySelectorAll('.nav-login-link');
    if (!links.length) return;

    links.forEach(link => {
        if (!link.getAttribute('data-login-href')) {
            link.setAttribute('data-login-href', link.getAttribute('href') || '');
        }
    });

    if (isLoggedIn()) {
        links.forEach(link => {
            link.textContent = 'Mi cuenta';
            const loggedHref = link.getAttribute('data-logged-href');
            if (loggedHref) link.setAttribute('href', loggedHref);
        });

        // Insertar botón de logout (una vez por menú)
        const navLists = document.querySelectorAll('.nav-links');
        navLists.forEach(ul => {
            if (!ul.querySelector('.nav-logout-link')) {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = '#';
                a.className = 'nav-logout-link';
                a.textContent = 'Salir';
                a.addEventListener('click', async (e) => {
                    e.preventDefault();
                    try {
                        await api.logout();
                    } finally {
                        updateAuthLinks();
                        // Volver al home (maneja rutas dentro de /pages)
                        window.location.href = window.location.pathname.includes('/pages/') ? '../index.html' : 'index.html';
                    }
                });
                li.appendChild(a);
                ul.appendChild(li);
            }
        });
    } else {
        links.forEach(link => {
            link.textContent = 'Ingresar';
            const loginHref = link.getAttribute('data-login-href');
            if (loginHref) link.setAttribute('href', loginHref);
        });

        // Quitar logout si existe
        document.querySelectorAll('.nav-logout-link').forEach(el => {
            const li = el.closest('li');
            if (li) li.remove();
            else el.remove();
        });
    }
}

if (menuToggle) {
    menuToggle.addEventListener('click', () => {
        menuToggle.classList.toggle('active');
        navMenu.classList.toggle('active');

        // Cuando el menú está abierto, bloquear scroll del body
        if (navMenu.classList.contains('active')) {
            lockPageScroll();
        } else {
            unlockPageScroll();
        }
    });
}

// Cerrar menú al hacer clic en un enlace
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        menuToggle.classList.remove('active');
        navMenu.classList.remove('active');
        unlockPageScroll();
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

        // Si el menú está abierto, mantener header visible para no interferir
        if (navMenu && navMenu.classList.contains('active')) {
            header.style.transform = 'translateY(0)';
            lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
            return;
        }
        
        if (scrollTop > 100) {
            if (scrollTop > lastScrollTop) {
                // Scrolling down
                header.style.transform = 'translateY(-100%)';
            } else {
                // Scrolling up
                header.style.transform = 'translateY(0)';
            }
        } else {
            header.style.transform = 'translateY(0)';
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
    updateAuthLinks();

    // Actualizar display del carrito
    updateCartDisplay();

    // Botones "Verificar disponibilidad" (WhatsApp)
    wireUpAvailabilityLinks();
    
    // Botones "Agregar al carrito"
    wireUpAddToCartButtons();
    
    // Botón del carrito (ir a carrito.html)
    const cartBtn = document.querySelector('.cart-btn');
    if (cartBtn) {
        cartBtn.addEventListener('click', () => {
            if (window.location.pathname.includes('carrito')) return;
            const inPages = window.location.pathname.includes('/pages/');
            window.location.href = inPages ? 'carrito.html' : 'pages/carrito.html';
        });
    }
});

function wireUpAvailabilityLinks() {
    const availabilityLinks = document.querySelectorAll('.wsp-availability');
    availabilityLinks.forEach(link => {
        const card = link.closest('.catalog-item') || link.closest('.producto-card');
        const name = card?.querySelector('h3')?.textContent?.trim() || 'producto';
        const message = `Hola, quiero verificar disponibilidad de: ${name}`;
        const url = `https://wa.me/56996744579?text=${encodeURIComponent(message)}`;
        link.setAttribute('href', url);
    });
}

function parsePriceToInt(priceText) {
    const digits = String(priceText || '').replace(/[^\d]/g, '');
    return parseInt(digits || '0', 10) || 0;
}

function wireUpAddToCartButtons() {
    const addToCartButtons = document.querySelectorAll('.add-to-cart, .btn-agregar');
    addToCartButtons.forEach(button => {
        // evitar doble binding
        if (button.dataset.boundCart === '1') return;
        button.dataset.boundCart = '1';

        button.addEventListener('click', function(e) {
            e.preventDefault();

            const card = this.closest('.catalog-item') || this.closest('.producto-card');
            if (!card) return;

            const name = card.querySelector('h3')?.textContent?.trim() || 'Producto';
            const priceText = card.querySelector('.catalog-price, .producto-precio')?.textContent || '0';
            const price = parsePriceToInt(priceText);
            const productId = card.getAttribute('data-product-id') || ('prod-' + Date.now());

            const product = {
                product_id: productId,
                name,
                price,
                quantity: 1
            };

            cart.add(product);
            showNotification(`${name} agregado al carrito`, 'success');
        });
    });
}

// ============================================
// MI CUENTA
// ============================================

async function renderAccountPage() {
    if (!window.location.pathname.includes('cuenta')) return;

    if (!isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }

    const user = getStoredUser();
    const nameEl = document.getElementById('accountName');
    const emailEl = document.getElementById('accountEmail');
    if (nameEl) nameEl.textContent = user?.name || '—';
    if (emailEl) emailEl.textContent = user?.email || '—';

    // Link de admin (pedidos) visible solo para admin
    const boxEl = document.querySelector('.cuenta-box');
    if (boxEl) {
        const existing = document.getElementById('adminTools');
        const admin = isAdminUser();
        if (admin && !existing) {
            const adminEl = document.createElement('div');
            adminEl.className = 'cuenta-admin';
            adminEl.id = 'adminTools';
            adminEl.innerHTML = `
                <h2 class="cuenta-title">Admin</h2>
                <div class="orders-list">
                    <p style="margin-bottom:12px;">Acceso a gestión de pedidos.</p>
                    <a class="btn-auth" href="admin.html">Ver / gestionar pedidos</a>
                </div>
            `;
            boxEl.appendChild(adminEl);
        }
        if (!admin && existing) {
            existing.remove();
        }
    }

    const listEl = document.getElementById('ordersList');
    if (!listEl) return;

    try {
        const result = await api.getMyTransactions();
        const transactions = result?.transactions || [];

        if (!transactions.length) {
            listEl.innerHTML = '<p>Aún no tienes pedidos.</p>';
            return;
        }

        listEl.innerHTML = transactions.map(t => {
            const orderId = t.order_id || '—';
            const status = t.status || 'pending';
            const amount = t.amount ?? t.total_amount ?? null;
            const createdAt = t.created_at ? new Date(t.created_at).toLocaleString() : '';
            return `
                <div class="order-card">
                    <div class="order-row">
                        <div><strong>Pedido:</strong> ${orderId}</div>
                        <div><strong>Estado:</strong> ${status}</div>
                    </div>
                    <div class="order-row" style="margin-top:8px;">
                        <div><strong>Total:</strong> ${amount !== null ? formatPrice(Number(amount)) : '—'}</div>
                        <div>${createdAt}</div>
                    </div>
                    <div class="order-meta">Si necesitas ayuda, contáctanos por WhatsApp.</div>
                </div>
            `;
        }).join('');
    } catch (error) {
        // Si el token expiró o es inválido
        if (String(error.message || '').toLowerCase().includes('token') || String(error.message || '').includes('401')) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            return;
        }
        listEl.innerHTML = '<p>No se pudieron cargar tus pedidos.</p>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    renderAccountPage();
});

// ============================================
// ADMIN - PEDIDOS
// ============================================

async function renderAdminOrdersPage() {
    if (!window.location.pathname.includes('admin')) return;

    if (!isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }

    const listEl = document.getElementById('adminOrdersList');
    if (!listEl) return;

    try {
        const result = await api.getAdminOrders();
        const orders = result?.orders || [];

        if (!orders.length) {
            listEl.innerHTML = '<p>No hay pedidos aún.</p>';
            return;
        }

        listEl.innerHTML = orders.map(o => {
            const orderId = o.order_id || '—';
            const status = o.status || 'pending';
            const amount = o.amount ?? null;
            const createdAt = o.createdAt?.seconds
                ? new Date(o.createdAt.seconds * 1000).toLocaleString()
                : (o.created_at ? new Date(o.created_at).toLocaleString() : '');
            const customer = o.customerName || o.customer_name || 'Cliente';
            const email = o.customerEmail || o.customer_email || '';

            return `
                <div class="order-card" data-order-id="${orderId}">
                    <div class="order-row">
                        <div><strong>Pedido:</strong> ${orderId}</div>
                        <div><strong>Total:</strong> ${amount !== null ? formatPrice(Number(amount)) : '—'}</div>
                    </div>
                    <div class="order-row" style="margin-top:8px;">
                        <div><strong>Cliente:</strong> ${customer}</div>
                        <div>${email}</div>
                    </div>
                    <div class="order-row" style="margin-top:8px;">
                        <div><strong>Fecha:</strong> ${createdAt}</div>
                        <div><strong>Estado:</strong> <span class="order-status">${status}</span></div>
                    </div>
                    <div class="order-row" style="margin-top:10px; gap:10px;">
                        <select class="admin-status-select">
                            <option value="pending" ${status === 'pending' ? 'selected' : ''}>pending</option>
                            <option value="completed" ${status === 'completed' ? 'selected' : ''}>completed</option>
                            <option value="failed" ${status === 'failed' ? 'selected' : ''}>failed</option>
                            <option value="cancelled" ${status === 'cancelled' ? 'selected' : ''}>cancelled</option>
                        </select>
                        <button class="btn-auth admin-status-save" type="button">Guardar estado</button>
                    </div>
                </div>
            `;
        }).join('');

        listEl.querySelectorAll('.admin-status-save').forEach(btn => {
            btn.addEventListener('click', async () => {
                const card = btn.closest('.order-card');
                const orderId = card?.getAttribute('data-order-id');
                const select = card?.querySelector('.admin-status-select');
                const status = select?.value;
                if (!orderId || !status) return;

                try {
                    await api.adminUpdateOrderStatus(orderId, status);
                    const statusEl = card.querySelector('.order-status');
                    if (statusEl) statusEl.textContent = status;
                    showNotification('Estado actualizado', 'success');
                } catch (e) {
                    showNotification('No tienes permisos de admin o hubo un error.', 'error');
                }
            });
        });
    } catch (error) {
        const msg = String(error?.message || '');
        if (msg.includes('Acceso denegado') || msg.includes('403')) {
            listEl.innerHTML = '<p>Acceso denegado. Tu usuario no es admin.</p>';
            return;
        }
        listEl.innerHTML = '<p>No se pudieron cargar los pedidos.</p>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    renderAdminOrdersPage();
});

// ============================================
// ADMIN - PRODUCTOS (oculto)
// ============================================

function normalizeProduct(p) {
    return {
        product_id: p.product_id,
        name: p.name || '',
        description: p.description || '',
        price: Number(p.price) || 0,
        category: p.category || '',
        image_url: p.image_url || '',
        isActive: typeof p.isActive === 'boolean' ? p.isActive : true
    };
}

function renderAdminProductsList(products) {
    const listEl = document.getElementById('adminProductsList');
    if (!listEl) return;

    if (!products.length) {
        listEl.innerHTML = '<p>No hay productos aún.</p>';
        return;
    }

    listEl.innerHTML = products.map(p => {
        const id = p.product_id;
        const status = p.isActive ? 'Activo' : 'Inactivo';
        return `
            <div class="order-card" data-product-id="${id}">
                <div class="order-row">
                    <div><strong>${p.name || '—'}</strong></div>
                    <div><strong>${formatPrice(Number(p.price) || 0)}</strong></div>
                </div>
                <div class="order-row" style="margin-top:8px;">
                    <div><strong>Categoría:</strong> ${p.category || '—'}</div>
                    <div><strong>Estado:</strong> <span class="product-status">${status}</span></div>
                </div>
                <div class="order-row" style="margin-top:10px; gap:10px;">
                    <button class="btn-auth btn-edit-product" type="button">Editar</button>
                    <button class="btn-auth btn-toggle-product" type="button">${p.isActive ? 'Desactivar' : 'Activar'}</button>
                    <button class="btn-auth btn-delete-product" type="button">Eliminar</button>
                </div>
            </div>
        `;
    }).join('');
}

function fillProductForm(product) {
    const p = normalizeProduct(product);
    const idEl = document.getElementById('productId');
    const nameEl = document.getElementById('productName');
    const categoryEl = document.getElementById('productCategory');
    const priceEl = document.getElementById('productPrice');
    const imageUrlEl = document.getElementById('productImageUrl');
    const descEl = document.getElementById('productDescription');
    const activeEl = document.getElementById('productIsActive');

    if (idEl) idEl.value = p.product_id || '';
    if (nameEl) nameEl.value = p.name;
    if (categoryEl) categoryEl.value = p.category;
    if (priceEl) priceEl.value = String(p.price || 0);
    if (imageUrlEl) imageUrlEl.value = p.image_url;
    if (descEl) descEl.value = p.description;
    if (activeEl) activeEl.checked = !!p.isActive;
}

function clearProductForm() {
    fillProductForm({ product_id: '', name: '', description: '', price: 0, category: '', image_url: '', isActive: true });
    const fileEl = document.getElementById('productImageFile');
    if (fileEl) fileEl.value = '';
}

async function renderAdminProductsPage() {
    if (!window.location.pathname.includes('admin-productos')) return;

    if (!isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }

    const listEl = document.getElementById('adminProductsList');
    const formEl = document.getElementById('adminProductForm');
    const uploadBtn = document.getElementById('btnUploadImage');
    const clearBtn = document.getElementById('btnClearProduct');

    if (!listEl || !formEl) return;

    let products = [];

    async function refresh() {
        try {
            const result = await api.getAdminProducts();
            products = (result?.products || []).map(normalizeProduct);
            renderAdminProductsList(products);
            bindRowActions();
        } catch (error) {
            const msg = String(error?.message || '');
            if (msg.includes('Acceso denegado') || msg.includes('403')) {
                listEl.innerHTML = '<p>Acceso denegado. Tu usuario no es admin.</p>';
                return;
            }
            listEl.innerHTML = '<p>No se pudieron cargar los productos.</p>';
        }
    }

    function bindRowActions() {
        listEl.querySelectorAll('.btn-edit-product').forEach(btn => {
            btn.addEventListener('click', () => {
                const card = btn.closest('.order-card');
                const id = card?.getAttribute('data-product-id');
                const product = products.find(x => x.product_id === id);
                if (product) {
                    fillProductForm(product);
                    showNotification('Producto cargado para editar', 'success');
                }
            });
        });

        listEl.querySelectorAll('.btn-toggle-product').forEach(btn => {
            btn.addEventListener('click', async () => {
                const card = btn.closest('.order-card');
                const id = card?.getAttribute('data-product-id');
                const product = products.find(x => x.product_id === id);
                if (!id || !product) return;

                try {
                    await api.adminUpdateProduct(id, { isActive: !product.isActive });
                    showNotification('Estado actualizado', 'success');
                    await refresh();
                } catch {
                    showNotification('No se pudo actualizar el estado', 'error');
                }
            });
        });

        listEl.querySelectorAll('.btn-delete-product').forEach(btn => {
            btn.addEventListener('click', async () => {
                const card = btn.closest('.order-card');
                const id = card?.getAttribute('data-product-id');
                if (!id) return;

                const ok = confirm('¿Eliminar producto? Se desactivará (no se mostrará en la tienda).');
                if (!ok) return;

                try {
                    await api.adminDeleteProduct(id);
                    showNotification('Producto eliminado (desactivado)', 'success');
                    await refresh();
                } catch {
                    showNotification('No se pudo eliminar', 'error');
                }
            });
        });
    }

    formEl.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('productId')?.value?.trim() || '';
        const name = document.getElementById('productName')?.value?.trim() || '';
        const category = document.getElementById('productCategory')?.value?.trim() || '';
        const price = Number(document.getElementById('productPrice')?.value || 0) || 0;
        const image_url = document.getElementById('productImageUrl')?.value?.trim() || '';
        const description = document.getElementById('productDescription')?.value || '';
        const isActive = !!document.getElementById('productIsActive')?.checked;

        try {
            if (id) {
                await api.adminUpdateProduct(id, { name, category, price, image_url, description, isActive });
                showNotification('Producto actualizado', 'success');
            } else {
                await api.adminCreateProduct({ name, category, price, image_url, description, isActive });
                showNotification('Producto creado', 'success');
            }
            clearProductForm();
            await refresh();
        } catch (error) {
            showNotification('No se pudo guardar el producto', 'error');
        }
    });

    uploadBtn?.addEventListener('click', async () => {
        const file = document.getElementById('productImageFile')?.files?.[0];
        if (!file) {
            showNotification('Selecciona una imagen', 'error');
            return;
        }

        try {
            const result = await api.adminUploadImage(file);
            const url = result?.url;
            if (url) {
                const imageUrlEl = document.getElementById('productImageUrl');
                if (imageUrlEl) imageUrlEl.value = url;
                showNotification('Imagen subida', 'success');
            } else {
                showNotification('No se recibió URL de imagen', 'error');
            }
        } catch {
            showNotification('Error al subir imagen', 'error');
        }
    });

    clearBtn?.addEventListener('click', () => {
        clearProductForm();
    });

    clearProductForm();
    await refresh();
}

document.addEventListener('DOMContentLoaded', () => {
    renderAdminProductsPage();
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

        const subtotalEl = document.querySelector('.carrito-subtotal-precio');
        if (subtotalEl) subtotalEl.textContent = formatPrice(totalPrice);

        const shippingEl = document.querySelector('.carrito-envio-precio');
        if (shippingEl) shippingEl.textContent = formatPrice(shippingCost);

        const totalEl = document.querySelector('.carrito-total-precio');
        if (totalEl) totalEl.textContent = formatPrice(finalTotal);
    }
    
    function setupCheckout() {
        const checkoutBtn = document.querySelector('.btn-checkout, .checkout-btn, .btn-pagar, [type="submit"]');
        if (!checkoutBtn) return;

        const WEBPAY_URL = 'https://www.webpay.cl/form-pay/197981?utm_source=ig&utm_medium=social&utm_content=link_in_bio';
        
        checkoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            if (cart.items.length === 0) {
                showNotification('Tu carrito está vacío', 'error');
                return;
            }
            
            // Obtener datos del cliente (si existen)
            const storedUser = getStoredUser();
            const customerName = document.querySelector('input[name="name"]')?.value || storedUser?.name || 'Cliente';
            const customerEmail = document.querySelector('input[name="email"]')?.value || storedUser?.email || '';
            const customerPhone = document.querySelector('input[name="phone"]')?.value || '';
            const customerAddress = document.querySelector('input[name="address"]')?.value || '';
            const customerCity = document.querySelector('input[name="city"]')?.value || '';
            
            try {
                const orderId = generateOrderId();
                const totalPrice = cart.getTotal();
                const shippingCost = 5000;
                const finalTotal = totalPrice + shippingCost;

                // Registrar pedido interno (para el admin). No bloquea por email.
                await api.createTransaction({
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

                // Facilitar el pago: copiar monto y llevar al link
                const amountToCopy = String(Math.round(finalTotal));
                const clipboardWrite = navigator.clipboard?.writeText?.bind(navigator.clipboard);
                if (clipboardWrite) {
                    try {
                        await clipboardWrite(amountToCopy);
                        showNotification(`Monto copiado: ${formatPrice(finalTotal)}. Pégalo en Webpay.`, 'success');
                    } catch {
                        // Fallback: prompt permite copiar manualmente en muchos navegadores
                        window.prompt('Monto a pagar (copia y pega en Webpay):', amountToCopy);
                    }
                } else {
                    // Fallback sin Clipboard API
                    window.prompt('Monto a pagar (copia y pega en Webpay):', amountToCopy);
                }

                // Nota: este formulario de Webpay requiere que el cliente ingrese el monto manualmente.
                setTimeout(() => {
                    window.location.href = WEBPAY_URL;
                }, 600);
            } catch (error) {
                showNotification('Error al crear la orden: ' + error.message, 'error');
            }
        });
    }
}

// ============================================
// CARGAR PRODUCTOS DE LA BASE DE DATOS
// ============================================

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function isProductsCatalogPage() {
    const path = String(window.location.pathname || '').toLowerCase();
    return path.endsWith('/productos.html') || path.endsWith('productos.html');
}

async function renderProductsCatalogFromApi() {
    if (!isProductsCatalogPage()) return;

    const grid = document.querySelector('.catalog-grid');
    if (!grid) return;

    try {
        const products = await api.getProducts();
        const items = Array.isArray(products) ? products : [];

        if (!items.length) {
            grid.innerHTML = '<p>No hay productos publicados aún.</p>';
            return;
        }

        grid.innerHTML = items.map(p => {
            const id = escapeHtml(p.product_id || '');
            const name = escapeHtml(p.name || 'Producto');
            const price = Number(p.price) || 0;
            const priceLabel = typeof formatPrice === 'function' ? formatPrice(price) : String(price);
            const imageUrl = p.image_url ? escapeHtml(p.image_url) : '';

            return `
                <div class="catalog-item" data-product-id="${id}">
                    <div class="catalog-image" style="background-color: #EDDECB;">
                        ${imageUrl ? `<img src="${imageUrl}" alt="${name}" loading="lazy">` : ''}
                        <div class="catalog-actions">
                            <a class="wsp-availability" href="https://wa.me/56996744579" target="_blank" rel="noopener">Verificar disponibilidad</a>
                            <button class="add-to-cart" type="button">Agregar al carrito</button>
                        </div>
                    </div>
                    <h3>${name}</h3>
                    <p class="catalog-price">${escapeHtml(priceLabel)}</p>
                </div>
            `;
        }).join('');

        // re-vincular botones en contenido dinámico
        wireUpAvailabilityLinks();
        wireUpAddToCartButtons();
    } catch (error) {
        console.error('Error al cargar productos:', error);
        // Si falla, dejar el HTML estático existente
    }
}

document.addEventListener('DOMContentLoaded', () => {
    renderProductsCatalogFromApi();
});

