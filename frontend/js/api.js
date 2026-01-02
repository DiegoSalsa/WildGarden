// Configuración de la API
// En local: usa backend local. En producción (Vercel): usa Render.
const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000/api'
    : 'https://wildgarden.onrender.com/api';

// Clase para manejar llamadas a la API
class APIClient {
    constructor(baseURL) {
        this.baseURL = baseURL;
    }

    // Métodos de autenticación
    async register(email, name, password, phone = '', address = '', city = '') {
        return this.post('/auth/register', {
            email, name, password, phone, address, city
        });
    }

    async login(email, password) {
        const response = await this.post('/auth/login', { email, password });
        if (response.token) {
            localStorage.setItem('authToken', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));
        }
        return response;
    }

    async logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
    }

    // Métodos de productos
    async getProducts() {
        return this.get('/products');
    }

    async getProductById(id) {
        return this.get(`/products/${id}`);
    }

    // Métodos de transacciones
    async createTransaction(transactionData) {
        return this.post('/transactions', transactionData);
    }

    async getTransaction(orderId) {
        return this.get(`/transactions/${orderId}`);
    }

    async updateTransactionStatus(orderId, status) {
        return this.patch(`/transactions/${orderId}/status`, { status });
    }

    async getMyTransactions() {
        return this.get('/transactions/my');
    }

    // Admin: pedidos
    async getAdminOrders() {
        return this.get('/admin/orders');
    }

    async adminUpdateOrderStatus(orderId, status) {
        return this.patch(`/admin/orders/${orderId}/status`, { status });
    }

    // Métodos HTTP base
    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async patch(endpoint, data) {
        return this.request(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        const token = localStorage.getItem('authToken');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error en la solicitud');
            }

            return data;
        } catch (error) {
            console.error('Error en API:', error);
            throw error;
        }
    }
}

// Instancia global del cliente API
const api = new APIClient(API_URL);

// Funciones de carrito (localStorage)
class Cart {
    constructor() {
        this.load();
    }

    load() {
        const saved = localStorage.getItem('cart');
        this.items = saved ? JSON.parse(saved) : [];
    }

    save() {
        localStorage.setItem('cart', JSON.stringify(this.items));
    }

    add(product) {
        const existing = this.items.find(item => item.product_id === product.product_id);
        if (existing) {
            existing.quantity += 1;
        } else {
            this.items.push({
                ...product,
                quantity: 1
            });
        }
        this.save();
        this.notify();
    }

    remove(productId) {
        this.items = this.items.filter(item => item.product_id !== productId);
        this.save();
        this.notify();
    }

    updateQuantity(productId, quantity) {
        const item = this.items.find(item => item.product_id === productId);
        if (item) {
            item.quantity = Math.max(0, quantity);
            if (item.quantity === 0) {
                this.remove(productId);
            } else {
                this.save();
                this.notify();
            }
        }
    }

    clear() {
        this.items = [];
        this.save();
        this.notify();
    }

    getTotal() {
        return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    notify() {
        document.dispatchEvent(new CustomEvent('cartUpdated', { detail: this.items }));
    }

    getCount() {
        return this.items.reduce((sum, item) => sum + item.quantity, 0);
    }
}

// Instancia global del carrito
const cart = new Cart();

// Escuchar cambios en el carrito
document.addEventListener('cartUpdated', (e) => {
    updateCartDisplay();
});

// Actualizar display del carrito
function updateCartDisplay() {
    const cartBtn = document.querySelector('.cart-btn');
    if (cartBtn) {
        const count = cart.getCount();
        if (count > 0) {
            cartBtn.setAttribute('data-count', count);
        } else {
            cartBtn.removeAttribute('data-count');
        }
    }
}

// Función para generar ID de orden única
function generateOrderId() {
    return 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// Funciones de utilidad
function formatPrice(price) {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0
    }).format(price);
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#4C6443' : type === 'error' ? '#d32f2f' : '#1976d2'};
        color: white;
        border-radius: 8px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
