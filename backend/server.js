// ===== SERVER.JS - Black Face OX com React =====
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Configuração inicial
const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'blackface-ox-secret-key-2025';

console.log('🔥 Iniciando servidor Black Face OX com React...');

// ===== CORS CONFIGURADO PARA REACT =====
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://seudominio.com.br'] 
    : ['http://localhost:5173', 'http://localhost:3000'], // Vite usa 5173
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ===== MIDDLEWARES =====
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===== SERVIR UPLOADS (IMAGENS) =====
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ===== CRIAR DIRETÓRIOS =====
const createDirectories = () => {
    const dirs = [
        'uploads/products',
        'uploads/categories',
        'data' // ← ADICIONAR PASTA DATA
    ];
    
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`📁 Diretório criado: ${dir}`);
        }
    });
};

createDirectories();

// ===== CONFIGURAÇÃO MULTER =====
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = 'uploads/products';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Apenas imagens são permitidas!'), false);
        }
    }
});

// ===== BANCO DE DADOS - CORRIGIDO =====
class Database {
    constructor() {
        this.data = {
            users: [
                {
                    id: 1,
                    email: 'admin@blackfaceox.com',
                    password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
                    role: 'admin',
                    name: 'Admin Black Face OX'
                }
            ],
            products: [
                {
                    id: 1,
                    name: 'Boné Agro Country Black Face OX',
                    description: 'Boné estilo country com logo bordado, ideal para o dia a dia no campo',
                    price: 89.90,
                    stock: 50,
                    category: 'bones',
                    images: ['/uploads/products/bone-agro.jpg'],
                    sku: 'BFO-BONE-001',
                    weight: 150,
                    dimensions: 'Tamanho único ajustável',
                    status: 'active',
                    colors: ['Preto', 'Marrom', 'Bege'],
                    sizes: ['Único'],
                    createdAt: new Date().toISOString()
                },
                {
                    id: 2,
                    name: 'Camiseta Country Black Face OX',
                    description: 'Camiseta 100% algodão com estampa exclusiva do agro sul brasileiro',
                    price: 69.90,
                    stock: 100,
                    category: 'camisetas',
                    images: ['/uploads/products/camiseta-agro.jpg'],
                    sku: 'BFO-CAM-001',
                    weight: 200,
                    dimensions: 'Vários tamanhos',
                    status: 'active',
                    colors: ['Preto', 'Cinza', 'Verde'],
                    sizes: ['P', 'M', 'G', 'GG'],
                    createdAt: new Date().toISOString()
                },
                {
                    id: 3,
                    name: 'Jaqueta Agro Premium',
                    description: 'Jaqueta resistente para trabalho no campo, com proteção UV',
                    price: 189.90,
                    stock: 25,
                    category: 'jaquetas',
                    images: ['/uploads/products/jaqueta-agro.jpg'],
                    sku: 'BFO-JAQ-001',
                    weight: 600,
                    dimensions: 'Vários tamanhos',
                    status: 'active',
                    colors: ['Preto', 'Marrom'],
                    sizes: ['P', 'M', 'G', 'GG', 'XG'],
                    createdAt: new Date().toISOString()
                }
            ],
            categories: [
                { id: 1, name: 'bones', displayName: 'Bonés' },
                { id: 2, name: 'camisetas', displayName: 'Camisetas' },
                { id: 3, name: 'jaquetas', displayName: 'Jaquetas' },
                { id: 4, name: 'calcas', displayName: 'Calças' },
                { id: 5, name: 'botas', displayName: 'Botas' },
                { id: 6, name: 'acessorios', displayName: 'Acessórios' }
            ],
            orders: [],
            settings: {
                storeName: 'Black Face OX',
                storeDescription: 'Moda country e agro do sul do Brasil',
                currency: 'BRL',
                theme: 'agro',
                paymentMethods: ['pix', 'card', 'boleto'],
                shippingMethods: ['sedex', 'pac', 'express']
            }
        };
        this.loadData();
    }

    loadData() {
        try {
            // ← CAMINHO CORRIGIDO
            if (fs.existsSync('data/database.json')) {
                const data = fs.readFileSync('data/database.json', 'utf8');
                this.data = { ...this.data, ...JSON.parse(data) };
                console.log('📊 Dados carregados do banco local');
            }
        } catch (error) {
            console.log('🆕 Criando novo banco de dados...');
            this.saveData();
        }
    }

    saveData() {
        try {
            // ← CAMINHO CORRIGIDO
            fs.writeFileSync('data/database.json', JSON.stringify(this.data, null, 2));
            console.log('💾 Dados salvos no banco local');
        } catch (error) {
            console.error('❌ Erro ao salvar dados:', error);
        }
    }

    // ===== MÉTODOS DO BANCO (mantidos iguais) =====
    getProducts(filters = {}) {
        let products = this.data.products;
        
        if (filters.category) {
            products = products.filter(p => p.category === filters.category);
        }
        
        if (filters.status) {
            products = products.filter(p => p.status === filters.status);
        }
        
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            products = products.filter(p => 
                p.name.toLowerCase().includes(searchTerm) ||
                p.description.toLowerCase().includes(searchTerm)
            );
        }
        
        return products;
    }

    getProductById(id) {
        return this.data.products.find(p => p.id === parseInt(id));
    }

    addProduct(product) {
        const newProduct = {
            id: Math.max(...this.data.products.map(p => p.id), 0) + 1,
            ...product,
            createdAt: new Date().toISOString(),
            status: 'active'
        };
        this.data.products.push(newProduct);
        this.saveData();
        return newProduct;
    }

    updateProduct(id, updates) {
        const index = this.data.products.findIndex(p => p.id === parseInt(id));
        if (index !== -1) {
            this.data.products[index] = { ...this.data.products[index], ...updates };
            this.saveData();
            return this.data.products[index];
        }
        return null;
    }

    deleteProduct(id) {
        const index = this.data.products.findIndex(p => p.id === parseInt(id));
        if (index !== -1) {
            const deleted = this.data.products.splice(index, 1)[0];
            this.saveData();
            return deleted;
        }
        return null;
    }

    addOrder(order) {
        const newOrder = {
            id: Math.max(...this.data.orders.map(o => o.id), 0) + 1,
            ...order,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        this.data.orders.push(newOrder);
        
        order.items.forEach(item => {
            const product = this.getProductById(item.productId);
            if (product) {
                product.stock -= item.quantity;
            }
        });
        
        this.saveData();
        return newOrder;
    }

    getOrders() {
        return this.data.orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    getCategories() {
        return this.data.categories;
    }

    getSettings() {
        return this.data.settings;
    }

    updateSettings(settings) {
        this.data.settings = { ...this.data.settings, ...settings };
        this.saveData();
        return this.data.settings;
    }
}

const db = new Database();

// ===== MIDDLEWARE DE AUTENTICAÇÃO =====
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token de acesso requerido' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido' });
        }
        req.user = user;
        next();
    });
};

// ===== ROTA DE TESTE =====
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        message: 'Black Face OX API funcionando! Caso não esteja funcionando, contate codduo.dev@gmail.com'
    });
});

// ===== ROTAS DE AUTENTICAÇÃO =====
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = db.data.users.find(u => u.email === email);
        if (!user) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const validPassword = password === 'admin123' || password === 'password';
        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: { id: user.id, email: user.email, role: user.role, name: user.name }
        });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ===== ROTAS PÚBLICAS (API) =====
app.get('/api/products', (req, res) => {
    try {
        const filters = {
            category: req.query.category,
            search: req.query.search,
            status: 'active'
        };
        const products = db.getProducts(filters);
        res.json(products);
    } catch (error) {
        console.error('Erro ao buscar produtos:', error);
        res.status(500).json({ error: 'Erro ao buscar produtos' });
    }
});

app.get('/api/products/:id', (req, res) => {
    try {
        const product = db.getProductById(req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }
        res.json(product);
    } catch (error) {
        console.error('Erro ao buscar produto:', error);
        res.status(500).json({ error: 'Erro ao buscar produto' });
    }
});

app.get('/api/categories', (req, res) => {
    try {
        const categories = db.getCategories();
        res.json(categories);
    } catch (error) {
        console.error('Erro ao buscar categorias:', error);
        res.status(500).json({ error: 'Erro ao buscar categorias' });
    }
});

app.get('/api/settings', (req, res) => {
    try {
        const settings = db.getSettings();
        res.json(settings);
    } catch (error) {
        console.error('Erro ao buscar configurações:', error);
        res.status(500).json({ error: 'Erro ao buscar configurações' });
    }
});

// ===== ROTAS DE PEDIDOS =====
app.post('/api/orders', (req, res) => {
    try {
        const order = db.addOrder(req.body);
        res.status(201).json(order);
    } catch (error) {
        console.error('Erro ao criar pedido:', error);
        res.status(500).json({ error: 'Erro ao criar pedido' });
    }
});

// ===== ROTAS ADMINISTRATIVAS =====
app.get('/api/admin/products', authenticateToken, (req, res) => {
    try {
        const filters = {
            category: req.query.category,
            search: req.query.search,
            status: req.query.status
        };
        const products = db.getProducts(filters);
        res.json(products);
    } catch (error) {
        console.error('Erro ao buscar produtos admin:', error);
        res.status(500).json({ error: 'Erro ao buscar produtos' });
    }
});

app.post('/api/admin/products', authenticateToken, upload.array('images', 5), (req, res) => {
    try {
        const productData = {
            name: req.body.name,
            description: req.body.description,
            price: parseFloat(req.body.price),
            stock: parseInt(req.body.stock),
            category: req.body.category,
            sku: req.body.sku,
            weight: parseFloat(req.body.weight) || 0,
            dimensions: req.body.dimensions || '',
            colors: req.body.colors ? req.body.colors.split(',').map(c => c.trim()) : [],
            sizes: req.body.sizes ? req.body.sizes.split(',').map(s => s.trim()) : [],
            images: req.files ? req.files.map(file => `/uploads/products/${file.filename}`) : []
        };

        const product = db.addProduct(productData);
        res.status(201).json(product);
    } catch (error) {
        console.error('Erro ao criar produto:', error);
        res.status(500).json({ error: 'Erro ao criar produto' });
    }
});

app.put('/api/admin/products/:id', authenticateToken, upload.array('images', 5), (req, res) => {
    try {
        const updates = {
            name: req.body.name,
            description: req.body.description,
            price: parseFloat(req.body.price),
            stock: parseInt(req.body.stock),
            category: req.body.category,
            sku: req.body.sku,
            weight: parseFloat(req.body.weight) || 0,
            dimensions: req.body.dimensions || '',
            colors: req.body.colors ? req.body.colors.split(',').map(c => c.trim()) : [],
            sizes: req.body.sizes ? req.body.sizes.split(',').map(s => s.trim()) : []
        };

        if (req.files && req.files.length > 0) {
            updates.images = req.files.map(file => `/uploads/products/${file.filename}`);
        }

        const product = db.updateProduct(req.params.id, updates);
        if (!product) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }
        res.json(product);
    } catch (error) {
        console.error('Erro ao atualizar produto:', error);
        res.status(500).json({ error: 'Erro ao atualizar produto' });
    }
});

app.delete('/api/admin/products/:id', authenticateToken, (req, res) => {
    try {
        const product = db.deleteProduct(req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }
        res.json({ message: 'Produto deletado com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar produto:', error);
        res.status(500).json({ error: 'Erro ao deletar produto' });
    }
});

app.get('/api/admin/orders', authenticateToken, (req, res) => {
    try {
        const orders = db.getOrders();
        res.json(orders);
    } catch (error) {
        console.error('Erro ao buscar pedidos:', error);
        res.status(500).json({ error: 'Erro ao buscar pedidos' });
    }
});

app.put('/api/admin/settings', authenticateToken, (req, res) => {
    try {
        const settings = db.updateSettings(req.body);
        res.json(settings);
    } catch (error) {
        console.error('Erro ao atualizar configurações:', error);
        res.status(500).json({ error: 'Erro ao atualizar configurações' });
    }
});

// ===== REMOVER ROTAS DE FRONTEND =====
// ❌ DELETAR estas linhas do seu código:
// app.get('/admin*', ...)
// app.get('*', ...)

// ===== TRATAMENTO DE ERROS =====
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Arquivo muito grande. Máximo 5MB.' });
        }
    }
    
    console.error('Erro no servidor:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
});

// ===== INICIALIZAÇÃO DO SERVIDOR =====
const server = app.listen(PORT, () => {
    console.log('');
    console.log('🐂 ===== BLACK FACE OX API =====');
    console.log(`🚀 API rodando na porta ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🛒 Produtos: http://localhost:${PORT}/api/products`);
    console.log(`🗂️ Categorias: http://localhost:${PORT}/api/categories`);
    console.log('');
    console.log('🎨 Frontend React deve rodar em: http://localhost:5173');
    console.log('=======================================');
    console.log('');
});

process.on('uncaughtException', (error) => {
    console.error('❌ Erro não capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promise rejeitada:', reason);
});

module.exports = app;