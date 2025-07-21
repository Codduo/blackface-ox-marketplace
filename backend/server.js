// ===== SERVER.JS - Black Face OX com PostgreSQL =====
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { MercadoPagoConfig, Payment, Preference } = require('mercadopago');
const jwt = require('jsonwebtoken');


// Importar models PostgreSQL
const { User, Product, Category, Order, OrderItem, Address, Cart, CartItem, sequelize } = require('./models');


const { Op } = require('sequelize');

const client = new MercadoPagoConfig({ 
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
    options: { timeout: 5000, idempotencyKey: 'abc' }
});

const payment = new Payment(client);
const preference = new Preference(client);

// Configuração inicial
const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'blackface-ox-secret-key-2025';

console.log('🔥 Iniciando servidor Black Face OX com PostgreSQL...');

// ===== CORS CONFIGURADO PARA REACT =====
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://seudominio.com.br'] 
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ===== MIDDLEWARES =====
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

// ===== SERVIR UPLOADS (IMAGENS) =====
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ===== CRIAR DIRETÓRIOS =====
const createDirectories = () => {
    const dirs = [
        'uploads/products',
        'uploads/categories'
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

// ===== TESTAR CONEXÃO POSTGRESQL =====
sequelize.authenticate()
    .then(() => console.log('✅ Conectado ao PostgreSQL'))
    .catch(err => {
        console.error('❌ Erro ao conectar ao PostgreSQL:', err);
        process.exit(1);
    });

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
app.get('/api/health', async (req, res) => {
    try {
        await sequelize.authenticate();
        const stats = {
            users: await User.count(),
            products: await Product.count(),
            categories: await Category.count(),
            orders: await Order.count()
        };
        
        res.json({ 
            status: 'OK',
            database: 'PostgreSQL conectado',
            timestamp: new Date().toISOString(),
            stats: stats,
            message: 'Black Face OX API funcionando com PostgreSQL!'
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'ERROR',
            database: 'PostgreSQL desconectado',
            error: error.message
        });
    }
});

// ===== ROTAS DE AUTENTICAÇÃO =====
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
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
            user: { 
                id: user.id, 
                email: user.email, 
                role: user.role, 
                name: user.name 
            }
        });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ===== SISTEMA DE AUTENTICAÇÃO COMPLETO =====
// Adicionar estas rotas ao server.js existente

const crypto = require('crypto');
const { body, validationResult } = require('express-validator');

// ===== VALIDAÇÕES =====
const validateRegister = [
    body('name')
        .isLength({ min: 2, max: 255 })
        .withMessage('Nome deve ter entre 2 e 255 caracteres')
        .matches(/^[a-zA-ZÀ-ÿ\s]+$/)
        .withMessage('Nome deve conter apenas letras e espaços'),
    
    body('email')
        .isEmail()
        .withMessage('Email inválido')
        .normalizeEmail(),
    
    body('password')
        .isLength({ min: 6 })
        .withMessage('Senha deve ter pelo menos 6 caracteres')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Senha deve conter pelo menos: 1 letra minúscula, 1 maiúscula e 1 número'),
    
    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Confirmação de senha não confere');
            }
            return true;
        }),
    
    body('phone')
        .optional()
        .isMobilePhone('pt-BR')
        .withMessage('Telefone inválido')
];

const validateLogin = [
    body('email')
        .isEmail()
        .withMessage('Email inválido')
        .normalizeEmail(),
    
    body('password')
        .notEmpty()
        .withMessage('Senha é obrigatória')
];

const validateForgotPassword = [
    body('email')
        .isEmail()
        .withMessage('Email inválido')
        .normalizeEmail()
];

const validateResetPassword = [
    body('token')
        .notEmpty()
        .withMessage('Token é obrigatório'),
    
    body('password')
        .isLength({ min: 6 })
        .withMessage('Senha deve ter pelo menos 6 caracteres')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Senha deve conter pelo menos: 1 letra minúscula, 1 maiúscula e 1 número'),
    
    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Confirmação de senha não confere');
            }
            return true;
        })
];

const validateUpdateProfile = [
    body('name')
        .optional()
        .isLength({ min: 2, max: 255 })
        .withMessage('Nome deve ter entre 2 e 255 caracteres'),
    
    body('phone')
        .optional()
        .isMobilePhone('pt-BR')
        .withMessage('Telefone inválido'),
    
    body('address')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Endereço deve ter no máximo 500 caracteres')
];

// ===== HELPER FUNCTIONS =====
const generateResetToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

const hashPassword = async (password) => {
    return await bcrypt.hash(password, 10);
};

const comparePassword = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};

// ===== MIDDLEWARE PARA VALIDAÇÕES =====
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Dados inválidos',
            errors: errors.array()
        });
    }
    next();
};

// ===== ROTAS DE AUTENTICAÇÃO =====

// 1. REGISTRO DE USUÁRIO
app.post('/api/register', validateRegister, handleValidationErrors, async (req, res) => {
    try {
        const { name, email, password, phone, address } = req.body;

        // Verificar se usuário já existe
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email já está em uso'
            });
        }

        // Hash da senha
        const hashedPassword = await hashPassword(password);

        // Criar usuário
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            phone: phone || null,
            address: address || null,
            role: 'customer',
            status: 'active'
        });

        // Gerar token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Resposta (sem senha)
        res.status(201).json({
            success: true,
            message: 'Usuário criado com sucesso',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                status: user.status,
                createdAt: user.createdAt
            }
        });

    } catch (error) {
        console.error('Erro no registro:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// 2. LOGIN (melhorado)
app.post('/api/login', validateLogin, handleValidationErrors, async (req, res) => {
    try {
        const { email, password } = req.body;

        // Buscar usuário
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Email ou senha incorretos'
            });
        }

        // Verificar status do usuário
        if (user.status !== 'active') {
            return res.status(401).json({
                success: false,
                message: 'Conta desativada. Entre em contato com o suporte.'
            });
        }

        // Verificar senha
        const validPassword = await comparePassword(password, user.password);
        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: 'Email ou senha incorretos'
            });
        }

        // Gerar token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Resposta
        res.json({
            success: true,
            message: 'Login realizado com sucesso',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                status: user.status
            }
        });

    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// 3. LOGOUT
app.post('/api/logout', authenticateToken, async (req, res) => {
    try {
        // Aqui você pode implementar blacklist de tokens se necessário
        // Por simplicidade, apenas retornamos sucesso
        res.json({
            success: true,
            message: 'Logout realizado com sucesso'
        });
    } catch (error) {
        console.error('Erro no logout:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// 4. ESQUECI MINHA SENHA
app.post('/api/forgot-password', validateForgotPassword, handleValidationErrors, async (req, res) => {
    try {
        const { email } = req.body;

        // Buscar usuário
        const user = await User.findOne({ where: { email } });
        if (!user) {
            // Por segurança, não informamos se o email existe ou não
            return res.json({
                success: true,
                message: 'Se o email estiver cadastrado, você receberá instruções para redefinir a senha'
            });
        }

        // Gerar token de reset
        const resetToken = generateResetToken();
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hora

        // Salvar token no banco (você pode criar uma tabela separada ou adicionar campos ao User)
        await user.update({
            resetToken: resetToken,
            resetTokenExpiry: resetTokenExpiry
        });

        // Aqui você enviaria o email com o token
        // Por enquanto, vamos apenas logar o token (APENAS PARA DESENVOLVIMENTO)
        console.log('🔑 Token de reset para', email, ':', resetToken);
        console.log('🔗 Link de reset: http://localhost:3000/reset-password?token=' + resetToken);

        res.json({
            success: true,
            message: 'Se o email estiver cadastrado, você receberá instruções para redefinir a senha',
            // APENAS PARA DESENVOLVIMENTO - REMOVER EM PRODUÇÃO
            token: resetToken
        });

    } catch (error) {
        console.error('Erro no esqueci senha:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// 5. REDEFINIR SENHA
app.post('/api/reset-password', validateResetPassword, handleValidationErrors, async (req, res) => {
    try {
        const { token, password } = req.body;

        // Buscar usuário pelo token
        const user = await User.findOne({
            where: {
                resetToken: token,
                resetTokenExpiry: { [Op.gt]: new Date() }
            }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Token inválido ou expirado'
            });
        }

        // Hash da nova senha
        const hashedPassword = await hashPassword(password);

        // Atualizar senha e limpar token
        await user.update({
            password: hashedPassword,
            resetToken: null,
            resetTokenExpiry: null
        });

        res.json({
            success: true,
            message: 'Senha redefinida com sucesso'
        });

    } catch (error) {
        console.error('Erro no reset senha:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// 6. PERFIL DO USUÁRIO
app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: ['id', 'name', 'email', 'phone', 'address', 'role', 'status', 'createdAt']
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        res.json({
            success: true,
            user: user
        });

    } catch (error) {
        console.error('Erro ao buscar perfil:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// 7. ATUALIZAR PERFIL
app.put('/api/profile', authenticateToken, validateUpdateProfile, handleValidationErrors, async (req, res) => {
    try {
        const { name, phone, address } = req.body;

        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        // Atualizar campos
        await user.update({
            name: name || user.name,
            phone: phone || user.phone,
            address: address || user.address
        });

        res.json({
            success: true,
            message: 'Perfil atualizado com sucesso',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                address: user.address,
                role: user.role,
                status: user.status
            }
        });

    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// 8. ALTERAR SENHA (logado)
app.put('/api/change-password', authenticateToken, [
    body('currentPassword')
        .notEmpty()
        .withMessage('Senha atual é obrigatória'),
    
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('Nova senha deve ter pelo menos 6 caracteres')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Nova senha deve conter pelo menos: 1 letra minúscula, 1 maiúscula e 1 número'),
    
    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('Confirmação de senha não confere');
            }
            return true;
        })
], handleValidationErrors, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        // Verificar senha atual
        const validPassword = await comparePassword(currentPassword, user.password);
        if (!validPassword) {
            return res.status(400).json({
                success: false,
                message: 'Senha atual incorreta'
            });
        }

        // Hash da nova senha
        const hashedPassword = await hashPassword(newPassword);

        // Atualizar senha
        await user.update({ password: hashedPassword });

        res.json({
            success: true,
            message: 'Senha alterada com sucesso'
        });

    } catch (error) {
        console.error('Erro ao alterar senha:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});


// ===== ROTAS DE ENDEREÇOS =====
// Adicionar ao server.js após as rotas de autenticação

// Validações para endereços
const validateAddress = [
    body('label')
        .isLength({ min: 2, max: 100 })
        .withMessage('Label deve ter entre 2 e 100 caracteres'),
    
    body('recipientName')
        .isLength({ min: 2, max: 255 })
        .withMessage('Nome do destinatário deve ter entre 2 e 255 caracteres'),
    
    body('recipientPhone')
        .optional()
        .isMobilePhone('pt-BR')
        .withMessage('Telefone inválido'),
    
    body('street')
        .isLength({ min: 5, max: 255 })
        .withMessage('Rua deve ter entre 5 e 255 caracteres'),
    
    body('number')
        .isLength({ min: 1, max: 20 })
        .withMessage('Número deve ter entre 1 e 20 caracteres'),
    
    body('complement')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Complemento deve ter no máximo 100 caracteres'),
    
    body('neighborhood')
        .isLength({ min: 2, max: 100 })
        .withMessage('Bairro deve ter entre 2 e 100 caracteres'),
    
    body('city')
        .isLength({ min: 2, max: 100 })
        .withMessage('Cidade deve ter entre 2 e 100 caracteres'),
    
    body('state')
        .isLength({ min: 2, max: 2 })
        .withMessage('Estado deve ter 2 caracteres (ex: SP)'),
    
    body('zipCode')
        .matches(/^\d{5}-?\d{3}$/)
        .withMessage('CEP deve estar no formato 00000-000 ou 00000000'),
    
    body('type')
        .optional()
        .isIn(['home', 'work', 'other'])
        .withMessage('Tipo deve ser: home, work ou other'),
    
    body('instructions')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Instruções deve ter no máximo 500 caracteres')
];

// 1. LISTAR ENDEREÇOS DO USUÁRIO
app.get('/api/addresses', authenticateToken, async (req, res) => {
    try {
        const addresses = await Address.findAll({
            where: { userId: req.user.id },
            order: [['isDefault', 'DESC'], ['createdAt', 'DESC']]
        });

        res.json({
            success: true,
            addresses: addresses
        });

    } catch (error) {
        console.error('Erro ao buscar endereços:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// 2. BUSCAR ENDEREÇO ESPECÍFICO
app.get('/api/addresses/:id', authenticateToken, async (req, res) => {
    try {
        const address = await Address.findOne({
            where: { 
                id: req.params.id,
                userId: req.user.id 
            }
        });

        if (!address) {
            return res.status(404).json({
                success: false,
                message: 'Endereço não encontrado'
            });
        }

        res.json({
            success: true,
            address: address
        });

    } catch (error) {
        console.error('Erro ao buscar endereço:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// 3. CRIAR NOVO ENDEREÇO
app.post('/api/addresses', authenticateToken, validateAddress, handleValidationErrors, async (req, res) => {
    try {
        const {
            label, recipientName, recipientPhone, street, number, complement,
            neighborhood, city, state, zipCode, type, instructions, isDefault
        } = req.body;

        // Normalizar CEP
        const normalizedZipCode = zipCode.replace(/\D/g, '');

        const address = await Address.create({
            userId: req.user.id,
            label,
            recipientName,
            recipientPhone,
            street,
            number,
            complement,
            neighborhood,
            city,
            state: state.toUpperCase(),
            zipCode: normalizedZipCode,
            country: 'BR',
            type: type || 'home',
            instructions,
            isDefault: isDefault || false
        });

        res.status(201).json({
            success: true,
            message: 'Endereço criado com sucesso',
            address: address
        });

    } catch (error) {
        console.error('Erro ao criar endereço:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// 4. ATUALIZAR ENDEREÇO
app.put('/api/addresses/:id', authenticateToken, validateAddress, handleValidationErrors, async (req, res) => {
    try {
        const address = await Address.findOne({
            where: { 
                id: req.params.id,
                userId: req.user.id 
            }
        });

        if (!address) {
            return res.status(404).json({
                success: false,
                message: 'Endereço não encontrado'
            });
        }

        const {
            label, recipientName, recipientPhone, street, number, complement,
            neighborhood, city, state, zipCode, type, instructions, isDefault
        } = req.body;

        // Normalizar CEP
        const normalizedZipCode = zipCode.replace(/\D/g, '');

        await address.update({
            label,
            recipientName,
            recipientPhone,
            street,
            number,
            complement,
            neighborhood,
            city,
            state: state.toUpperCase(),
            zipCode: normalizedZipCode,
            type: type || address.type,
            instructions,
            isDefault: isDefault !== undefined ? isDefault : address.isDefault
        });

        res.json({
            success: true,
            message: 'Endereço atualizado com sucesso',
            address: address
        });

    } catch (error) {
        console.error('Erro ao atualizar endereço:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// 5. DELETAR ENDEREÇO
app.delete('/api/addresses/:id', authenticateToken, async (req, res) => {
    try {
        const address = await Address.findOne({
            where: { 
                id: req.params.id,
                userId: req.user.id 
            }
        });

        if (!address) {
            return res.status(404).json({
                success: false,
                message: 'Endereço não encontrado'
            });
        }

        // Verificar se o endereço não está sendo usado em pedidos
        const orderCount = await Order.count({
            where: {
                [Op.or]: [
                    { shippingAddressId: address.id },
                    { billingAddressId: address.id }
                ]
            }
        });

        if (orderCount > 0) {
            return res.status(400).json({
                success: false,
                message: 'Não é possível deletar endereço que está sendo usado em pedidos'
            });
        }

        await address.destroy();

        res.json({
            success: true,
            message: 'Endereço deletado com sucesso'
        });

    } catch (error) {
        console.error('Erro ao deletar endereço:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// 6. DEFINIR ENDEREÇO COMO PADRÃO
app.put('/api/addresses/:id/default', authenticateToken, async (req, res) => {
    try {
        const address = await Address.findOne({
            where: { 
                id: req.params.id,
                userId: req.user.id 
            }
        });

        if (!address) {
            return res.status(404).json({
                success: false,
                message: 'Endereço não encontrado'
            });
        }

        // Remover padrão de todos os endereços do usuário
        await Address.update(
            { isDefault: false },
            { where: { userId: req.user.id } }
        );

        // Definir este endereço como padrão
        await address.update({ isDefault: true });

        res.json({
            success: true,
            message: 'Endereço definido como padrão',
            address: address
        });

    } catch (error) {
        console.error('Erro ao definir endereço padrão:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// 7. BUSCAR CEP (integração com API externa)
app.get('/api/addresses/cep/:cep', authenticateToken, async (req, res) => {
    try {
        const cep = req.params.cep.replace(/\D/g, '');
        
        if (cep.length !== 8) {
            return res.status(400).json({
                success: false,
                message: 'CEP deve ter 8 dígitos'
            });
        }

        // Fazer requisição para API do ViaCEP
        const fetch = require('node-fetch');
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();

        if (data.erro) {
            return res.status(404).json({
                success: false,
                message: 'CEP não encontrado'
            });
        }

        res.json({
            success: true,
            address: {
                zipCode: data.cep,
                street: data.logradouro,
                neighborhood: data.bairro,
                city: data.localidade,
                state: data.uf,
                complement: data.complemento
            }
        });

    } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar CEP'
        });
    }
});

// ===== ROTAS DO CARRINHO =====

// Validações para carrinho
const validateCartItem = [
    body('productId')
        .isInt({ min: 1 })
        .withMessage('ID do produto deve ser um número válido'),
    
    body('quantity')
        .isInt({ min: 1, max: 99 })
        .withMessage('Quantidade deve ser entre 1 e 99'),
    
    body('selectedColor')
        .optional()
        .isLength({ min: 1, max: 50 })
        .withMessage('Cor deve ter entre 1 e 50 caracteres'),
    
    body('selectedSize')
        .optional()
        .isLength({ min: 1, max: 20 })
        .withMessage('Tamanho deve ter entre 1 e 20 caracteres')
];

// Helper function para buscar ou criar carrinho
async function getOrCreateCart(userId) {
    let cart = await Cart.findOne({ where: { userId } });
    
    if (!cart) {
        cart = await Cart.create({ userId });
    }
    
    return cart;
}

// 1. VER CARRINHO DO USUÁRIO
app.get('/api/cart', authenticateToken, async (req, res) => {
    try {
        const cart = await Cart.findOne({
            where: { userId: req.user.id },
            include: [
                {
                    model: CartItem,
                    as: 'items',
                    include: [
                        {
                            model: Product,
                            as: 'product',
                            attributes: ['id', 'name', 'price', 'stock', 'images', 'colors', 'sizes', 'sku'],
                            include: [
                                {
                                    model: Category,
                                    as: 'category',
                                    attributes: ['id', 'name', 'displayName']
                                }
                            ]
                        }
                    ]
                }
            ]
        });

        if (!cart) {
            return res.json({
                success: true,
                cart: {
                    id: null,
                    userId: req.user.id,
                    subtotal: 0,
                    itemsCount: 0,
                    items: []
                }
            });
        }

        res.json({
            success: true,
            cart: cart
        });

    } catch (error) {
        console.error('Erro ao buscar carrinho:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// 2. ADICIONAR ITEM AO CARRINHO
app.post('/api/cart/add', authenticateToken, validateCartItem, handleValidationErrors, async (req, res) => {
    try {
        const { productId, quantity, selectedColor, selectedSize } = req.body;

        // Verificar se o produto existe e tem estoque
        const product = await Product.findByPk(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Produto não encontrado'
            });
        }

        if (product.stock < quantity) {
            return res.status(400).json({
                success: false,
                message: 'Estoque insuficiente'
            });
        }

        // Buscar ou criar carrinho
        const cart = await getOrCreateCart(req.user.id);

        // Verificar se o item já existe no carrinho (mesmo produto + variação)
        const existingItem = await CartItem.findOne({
            where: {
                cartId: cart.id,
                productId: productId,
                selectedColor: selectedColor || null,
                selectedSize: selectedSize || null
            }
        });

        if (existingItem) {
            // Atualizar quantidade do item existente
            const newQuantity = existingItem.quantity + quantity;
            
            if (newQuantity > product.stock) {
                return res.status(400).json({
                    success: false,
                    message: 'Quantidade solicitada excede o estoque disponível'
                });
            }

            await existingItem.update({
                quantity: newQuantity,
                price: product.price // Atualizar preço caso tenha mudado
            });

            res.json({
                success: true,
                message: 'Quantidade atualizada no carrinho',
                item: existingItem
            });

        } else {
            // Criar novo item no carrinho
            const cartItem = await CartItem.create({
                cartId: cart.id,
                productId: productId,
                quantity: quantity,
                price: product.price,
                subtotal: quantity * product.price,
                selectedColor: selectedColor || null,
                selectedSize: selectedSize || null
            });

            res.status(201).json({
                success: true,
                message: 'Item adicionado ao carrinho',
                item: cartItem
            });
        }

    } catch (error) {
        console.error('Erro ao adicionar item ao carrinho:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// 3. ATUALIZAR QUANTIDADE DO ITEM
app.put('/api/cart/items/:id', authenticateToken, [
    body('quantity')
        .isInt({ min: 1, max: 99 })
        .withMessage('Quantidade deve ser entre 1 e 99')
], handleValidationErrors, async (req, res) => {
    try {
        const { quantity } = req.body;

        // Buscar item do carrinho
        const cartItem = await CartItem.findOne({
            where: { id: req.params.id },
            include: [
                {
                    model: Cart,
                    as: 'cart',
                    where: { userId: req.user.id }
                },
                {
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'name', 'stock', 'price']
                }
            ]
        });

        if (!cartItem) {
            return res.status(404).json({
                success: false,
                message: 'Item não encontrado no carrinho'
            });
        }

        // Verificar estoque
        if (quantity > cartItem.product.stock) {
            return res.status(400).json({
                success: false,
                message: 'Quantidade solicitada excede o estoque disponível'
            });
        }

        // Atualizar quantidade
      await cartItem.update({
    quantity: quantity,
    price: cartItem.product.price,
    subtotal: quantity * cartItem.product.price // ← ADICIONAR ESTA LINHA
});

        res.json({
            success: true,
            message: 'Quantidade atualizada',
            item: cartItem
        });

    } catch (error) {
        console.error('Erro ao atualizar item do carrinho:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// 4. REMOVER ITEM DO CARRINHO
app.delete('/api/cart/items/:id', authenticateToken, async (req, res) => {
    try {
        // Buscar item do carrinho
        const cartItem = await CartItem.findOne({
            where: { id: req.params.id },
            include: [
                {
                    model: Cart,
                    as: 'cart',
                    where: { userId: req.user.id }
                }
            ]
        });

        if (!cartItem) {
            return res.status(404).json({
                success: false,
                message: 'Item não encontrado no carrinho'
            });
        }

        await cartItem.destroy();

        res.json({
            success: true,
            message: 'Item removido do carrinho'
        });

    } catch (error) {
        console.error('Erro ao remover item do carrinho:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// 5. LIMPAR CARRINHO
app.delete('/api/cart/clear', authenticateToken, async (req, res) => {
    try {
        const cart = await Cart.findOne({
            where: { userId: req.user.id }
        });

        if (!cart) {
            return res.json({
                success: true,
                message: 'Carrinho já está vazio'
            });
        }

        // Remover todos os itens
        await CartItem.destroy({
            where: { cartId: cart.id }
        });

        // Atualizar totais do carrinho
        await cart.update({
            subtotal: 0,
            itemsCount: 0,
            lastActivity: new Date()
        });

        res.json({
            success: true,
            message: 'Carrinho limpo com sucesso'
        });

    } catch (error) {
        console.error('Erro ao limpar carrinho:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// 6. ATUALIZAR MÚLTIPLOS ITENS (para checkout)
app.put('/api/cart/update-multiple', authenticateToken, [
    body('items')
        .isArray({ min: 1 })
        .withMessage('Items deve ser um array não vazio'),
    body('items.*.id')
        .isInt({ min: 1 })
        .withMessage('ID do item deve ser um número válido'),
    body('items.*.quantity')
        .isInt({ min: 1, max: 99 })
        .withMessage('Quantidade deve ser entre 1 e 99')
], handleValidationErrors, async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const { items } = req.body;
        const updatedItems = [];

        for (const itemData of items) {
            const cartItem = await CartItem.findOne({
                where: { id: itemData.id },
                include: [
                    {
                        model: Cart,
                        as: 'cart',
                        where: { userId: req.user.id }
                    },
                    {
                        model: Product,
                        as: 'product',
                        attributes: ['id', 'stock', 'price']
                    }
                ],
                transaction
            });

            if (!cartItem) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: `Item ${itemData.id} não encontrado no carrinho`
                });
            }

            if (itemData.quantity > cartItem.product.stock) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Estoque insuficiente para o produto ${cartItem.product.id}`
                });
            }

            await cartItem.update({
                quantity: itemData.quantity,
                price: cartItem.product.price
            }, { transaction });

            updatedItems.push(cartItem);
        }

        await transaction.commit();

        res.json({
            success: true,
            message: 'Itens atualizados com sucesso',
            items: updatedItems
        });

    } catch (error) {
        await transaction.rollback();
        console.error('Erro ao atualizar múltiplos itens:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// 7. MOVER CARRINHO PARA PEDIDO (helper para checkout)
app.post('/api/cart/move-to-order', authenticateToken, async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const cart = await Cart.findOne({
            where: { userId: req.user.id },
            include: [
                {
                    model: CartItem,
                    as: 'items',
                    include: [
                        {
                            model: Product,
                            as: 'product',
                            attributes: ['id', 'name', 'price', 'stock', 'sku']
                        }
                    ]
                }
            ],
            transaction
        });

        if (!cart || cart.items.length === 0) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'Carrinho está vazio'
            });
        }

        // Verificar estoque de todos os itens
        for (const item of cart.items) {
            if (item.quantity > item.product.stock) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Estoque insuficiente para ${item.product.name}`
                });
            }
        }

        // Preparar dados para criação do pedido
        const orderData = {
            userId: req.user.id,
            subtotal: cart.subtotal,
            total: cart.subtotal,
            items: cart.items.map(item => ({
                productId: item.productId,
                productName: item.product.name,
                productSku: item.product.sku,
                quantity: item.quantity,
                price: item.price,
                subtotal: item.subtotal,
                productVariant: {
                    color: item.selectedColor,
                    size: item.selectedSize,
                    ...item.variant
                }
            }))
        };

        await transaction.commit();

        res.json({
            success: true,
            message: 'Carrinho pronto para pedido',
            orderData: orderData
        });

    } catch (error) {
        await transaction.rollback();
        console.error('Erro ao mover carrinho para pedido:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// 8. CONTAR ITENS NO CARRINHO (útil para badge)
app.get('/api/cart/count', authenticateToken, async (req, res) => {
    try {
        const cart = await Cart.findOne({
            where: { userId: req.user.id },
            attributes: ['itemsCount', 'subtotal']
        });

        res.json({
            success: true,
            count: cart ? cart.itemsCount : 0,
            subtotal: cart ? cart.subtotal : 0
        });

    } catch (error) {
        console.error('Erro ao contar itens do carrinho:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});



// ===== ROTAS DE PAGAMENTO =====

// 1. CRIAR PREFERÊNCIA DE PAGAMENTO (CHECKOUT)
// SUBSTITUIR a rota POST /api/payments/create-preference por esta versão:

app.post('/api/payments/create-preference', authenticateToken, async (req, res) => {
    try {
        const { shippingAddressId, billingAddressId } = req.body;

        // Buscar carrinho do usuário
        const cart = await Cart.findOne({
            where: { userId: req.user.id },
            include: [
                {
                    model: CartItem,
                    as: 'items',
                    include: [
                        {
                            model: Product,
                            as: 'product',
                            attributes: ['id', 'name', 'price', 'stock', 'sku', 'images']
                        }
                    ]
                }
            ]
        });

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Carrinho está vazio'
            });
        }

        // Verificar estoque de todos os itens
        for (const item of cart.items) {
            if (item.quantity > item.product.stock) {
                return res.status(400).json({
                    success: false,
                    message: `Estoque insuficiente para ${item.product.name}`
                });
            }
        }

        // Buscar endereços se fornecidos
        let shippingAddress = null;
        if (shippingAddressId) {
            shippingAddress = await Address.findOne({
                where: { id: shippingAddressId, userId: req.user.id }
            });
        }

        // Buscar dados do usuário
        const user = await User.findByPk(req.user.id);

        // Preparar itens para o MercadoPago
        const items = cart.items.map(item => ({
            id: item.product.sku || item.product.id.toString(),
            title: item.product.name,
            quantity: item.quantity,
            unit_price: parseFloat(item.price),
            currency_id: 'BRL'
        }));


        // Configurar preferência (versão simplificada)
      const preferenceData = {
    items: items,
    payer: {
        name: user.name,
        email: user.email,
        phone: {
            area_code: user.phone ? user.phone.substring(0, 2) : "11",
            number: user.phone ? user.phone.substring(2) : "999999999"
        }
    },
    payment_methods: {
        installments: 12,
        default_installments: 1
    },
    back_urls: {
        success: `${process.env.FRONTEND_URL}/checkout/success`,
        failure: `${process.env.FRONTEND_URL}/checkout/failure`,
        pending: `${process.env.FRONTEND_URL}/checkout/pending`
    },
    notification_url: `${process.env.BACKEND_URL}/api/payments/webhook`,
    external_reference: `order-${Date.now()}-${user.id}`,
    statement_descriptor: 'Black Face OX'
};


        console.log('🔧 Criando preferência MercadoPago...', {
            items: items.length,
            total: items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0),
            user: user.email
        });

        // Criar preferência no MercadoPago
        const preferenceResponse = await preference.create({ body: preferenceData });

        console.log('✅ Preferência criada:', preferenceResponse.id);

        // Criar pedido pendente no banco
      const order = await Order.create({
    orderNumber: `BFO-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
    userId: user.id,
    customerInfo: {
        name: user.name,
        email: user.email,
        phone: user.phone
    },
    shippingAddress: shippingAddress ? {
        street: shippingAddress.street,
        number: shippingAddress.number,
        complement: shippingAddress.complement,
        neighborhood: shippingAddress.neighborhood,
        city: shippingAddress.city,
        state: shippingAddress.state,
        zipCode: shippingAddress.zipCode
    } : null,
    // ADICIONAR estes campos:
    shippingAddressId: shippingAddressId || null,
    billingAddressId: billingAddressId || null,
    subtotal: parseFloat(cart.subtotal),
    shipping: 0,
    tax: 0,
    discount: 0,
    total: parseFloat(cart.subtotal),
    status: 'pending',
    paymentStatus: 'pending',
    paymentMethod: 'mercadopago',
    paymentId: `order-${Date.now()}-${user.id}`
});

        // Criar itens do pedido
        for (const item of cart.items) {
            await OrderItem.create({
                orderId: order.id,
                productId: item.productId,
                productName: item.product.name,
                productSku: item.product.sku,
                quantity: item.quantity,
                price: item.price,
                subtotal: item.subtotal,
                productVariant: {
                    color: item.selectedColor,
                    size: item.selectedSize
                }
            });
        }

        res.json({
            success: true,
            message: 'Preferência criada com sucesso',
            preference: {
                id: preferenceResponse.id,
                init_point: preferenceResponse.init_point,
                sandbox_init_point: preferenceResponse.sandbox_init_point
            },
            order: {
                id: order.id,
                orderNumber: order.orderNumber,
                total: order.total
            }
        });

    } catch (error) {
        console.error('Erro ao criar preferência de pagamento:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao processar pagamento',
            error: error.message
        });
    }
});

// 2. WEBHOOK MERCADOPAGO (receber notificações)
app.post('/api/payments/webhook', async (req, res) => {
    try {
        console.log('🔔 Webhook MercadoPago recebido:', req.body);

        // O MercadoPago envia diferentes tipos de notificação
        const { type, data } = req.body;

        if (type === 'payment') {
            const paymentId = data.id;
            
            console.log('💳 Consultando pagamento:', paymentId);
            
            // Buscar detalhes do pagamento no MercadoPago
            const paymentData = await payment.get({ id: paymentId });
            
            console.log('📄 Status do pagamento:', paymentData.status);

            // Buscar pedido pelo paymentId
            const order = await Order.findOne({
                where: { 
                    paymentId: paymentData.external_reference || paymentId,
                    paymentMethod: 'mercadopago'
                }
            });

            if (!order) {
                console.log('❌ Pedido não encontrado para pagamento:', paymentId);
                return res.status(200).send('OK');
            }

            // Atualizar status baseado no pagamento
            let orderStatus = order.status;
            let paymentStatus = order.paymentStatus;

            switch (paymentData.status) {
                case 'approved':
                    orderStatus = 'confirmed';
                    paymentStatus = 'paid';
                    
                    // Decrementar estoque apenas se ainda não foi processado
                    if (order.status === 'pending') {
                        const orderItems = await OrderItem.findAll({
                            where: { orderId: order.id }
                        });
                        
                        for (const item of orderItems) {
                            await Product.decrement('stock', {
                                by: item.quantity,
                                where: { id: item.productId }
                            });
                        }
                        
                        // Limpar carrinho do usuário
                        if (order.userId) {
                            const userCart = await Cart.findOne({ where: { userId: order.userId } });
                            if (userCart) {
                                await CartItem.destroy({ where: { cartId: userCart.id } });
                            }
                        }
                    }
                    break;
                    
                case 'pending':
                case 'in_process':
                    orderStatus = 'pending';
                    paymentStatus = 'pending';
                    break;
                    
                case 'rejected':
                case 'cancelled':
                    orderStatus = 'cancelled';
                    paymentStatus = 'failed';
                    break;
            }

            // Atualizar pedido
            await order.update({
                status: orderStatus,
                paymentStatus: paymentStatus,
                paymentId: paymentId
            });

            console.log(`✅ Pedido ${order.orderNumber} atualizado: ${orderStatus}/${paymentStatus}`);
        }

        res.status(200).send('OK');

    } catch (error) {
        console.error('❌ Erro no webhook:', error);
        res.status(200).send('OK'); // Sempre retornar 200
    }
});

app.get('/api/orders/status/:orderNumber', async (req, res) => {
    try {
        const order = await Order.findOne({
            where: { orderNumber: req.params.orderNumber },
            include: [
                {
                    model: OrderItem,
                    as: 'items',
                    include: [
                        {
                            model: Product,
                            as: 'product',
                            attributes: ['id', 'name', 'images']
                        }
                    ]
                }
            ]
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Pedido não encontrado'
            });
        }

        res.json({
            success: true,
            order: {
                orderNumber: order.orderNumber,
                status: order.status,
                paymentStatus: order.paymentStatus,
                total: order.total,
                createdAt: order.createdAt,
                items: order.items
            }
        });

    } catch (error) {
        console.error('Erro ao verificar pedido:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// 3. CONSULTAR STATUS DO PAGAMENTO
app.get('/api/payments/:paymentId', authenticateToken, async (req, res) => {
    try {
        const paymentData = await payment.get({ id: req.params.paymentId });
        
        res.json({
            success: true,
            payment: {
                id: paymentData.id,
                status: paymentData.status,
                status_detail: paymentData.status_detail,
                amount: paymentData.transaction_amount,
                currency: paymentData.currency_id,
                payment_method: paymentData.payment_method_id,
                created: paymentData.date_created,
                approved: paymentData.date_approved
            }
        });

    } catch (error) {
        console.error('Erro ao consultar pagamento:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao consultar pagamento'
        });
    }
});
app.get('/api/orders/:orderNumber/status', async (req, res) => {
    try {
        const order = await Order.findOne({
            where: { orderNumber: req.params.orderNumber },
            include: [
                {
                    model: OrderItem,
                    as: 'items',
                    include: [
                        {
                            model: Product,
                            as: 'product',
                            attributes: ['id', 'name', 'images']
                        }
                    ]
                }
            ]
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Pedido não encontrado'
            });
        }

        res.json({
            success: true,
            order: {
                orderNumber: order.orderNumber,
                status: order.status,
                paymentStatus: order.paymentStatus,
                total: order.total,
                createdAt: order.createdAt,
                items: order.items
            }
        });

    } catch (error) {
        console.error('Erro ao verificar pedido:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// 4. PROCESSAR PAGAMENTO VIA CARTÃO (CHECKOUT TRANSPARENTE)
app.post('/api/payments/process', authenticateToken, [
    body('token')
        .notEmpty()
        .withMessage('Token do cartão é obrigatório'),
    body('installments')
        .isInt({ min: 1, max: 12 })
        .withMessage('Parcelas deve ser entre 1 e 12'),
    body('shippingAddressId')
        .optional()
        .isInt({ min: 1 })
        .withMessage('ID do endereço de entrega inválido')
], handleValidationErrors, async (req, res) => {
    try {
        const { token, installments, shippingAddressId, billingAddressId } = req.body;

        // Buscar carrinho do usuário
        const cart = await Cart.findOne({
            where: { userId: req.user.id },
            include: [
                {
                    model: CartItem,
                    as: 'items',
                    include: [
                        {
                            model: Product,
                            as: 'product',
                            attributes: ['id', 'name', 'price', 'stock', 'sku']
                        }
                    ]
                }
            ]
        });

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Carrinho está vazio'
            });
        }

        // Verificar estoque
        for (const item of cart.items) {
            if (item.quantity > item.product.stock) {
                return res.status(400).json({
                    success: false,
                    message: `Estoque insuficiente para ${item.product.name}`
                });
            }
        }

        // Buscar usuário
        const user = await User.findByPk(req.user.id);

        // Criar pagamento
        const paymentData = {
            transaction_amount: parseFloat(cart.subtotal),
            token: token,
            description: `Pedido Black Face OX - ${cart.items.length} item(s)`,
            installments: parseInt(installments),
            payment_method_id: 'visa', // Será detectado pelo token
            payer: {
                email: user.email,
                first_name: user.name.split(' ')[0],
                last_name: user.name.split(' ').slice(1).join(' ') || user.name.split(' ')[0]
            },
            external_reference: `cart-${cart.id}-user-${user.id}`
        };

        const paymentResponse = await payment.create({ body: paymentData });

        // Criar pedido no banco
        const order = await Order.create({
            userId: user.id,
            customerInfo: {
                name: user.name,
                email: user.email,
                phone: user.phone
            },
            subtotal: parseFloat(cart.subtotal),
            total: parseFloat(cart.subtotal),
            status: paymentResponse.status === 'approved' ? 'confirmed' : 'pending',
            paymentStatus: paymentResponse.status === 'approved' ? 'paid' : 'pending',
            paymentMethod: 'mercadopago',
            paymentId: paymentResponse.id
        });

        // Se pagamento aprovado, decrementar estoque e limpar carrinho
        if (paymentResponse.status === 'approved') {
            // Decrementar estoque
            for (const item of cart.items) {
                await Product.decrement('stock', {
                    by: item.quantity,
                    where: { id: item.productId }
                });
            }

            // Limpar carrinho
            await CartItem.destroy({
                where: { cartId: cart.id }
            });
        }

        res.json({
            success: true,
            payment: {
                id: paymentResponse.id,
                status: paymentResponse.status,
                status_detail: paymentResponse.status_detail
            },
            order: {
                id: order.id,
                orderNumber: order.orderNumber,
                status: order.status
            }
        });

    } catch (error) {
        console.error('Erro ao processar pagamento:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao processar pagamento',
            error: error.message
        });
    }
});

// ===== MIDDLEWARE PARA VERIFICAR PAPEL DO USUÁRIO =====
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Token de acesso requerido'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado. Permissão insuficiente.'
            });
        }

        next();
    };
};

// Exemplo de uso do middleware de role:
// app.get('/api/admin/something', authenticateToken, requireRole(['admin']), (req, res) => {
//     // Só admins podem acessar
// });

// ===== ROTA PARA VERIFICAR TOKEN =====
app.get('/api/verify-token', authenticateToken, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: ['id', 'name', 'email', 'role', 'status']
        });

        if (!user || user.status !== 'active') {
            return res.status(401).json({
                success: false,
                message: 'Token inválido ou usuário inativo'
            });
        }

        res.json({
            success: true,
            user: user
        });

    } catch (error) {
        console.error('Erro ao verificar token:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// ===== ROTAS PÚBLICAS (API) =====
app.get('/api/products', async (req, res) => {
    try {
        const { category, search, limit = 50, offset = 0 } = req.query;
        
        let whereClause = { status: 'active' };
        
        // Filtrar por categoria
        if (category) {
            const categoryObj = await Category.findOne({ where: { name: category } });
            if (categoryObj) {
                whereClause.categoryId = categoryObj.id;
            }
        }
        
        // Filtrar por busca
        if (search) {
            whereClause[Op.or] = [
                { name: { [Op.iLike]: `%${search}%` } },
                { description: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const products = await Product.findAll({
            where: whereClause,
            include: [{ 
                model: Category, 
                as: 'category',
                attributes: ['id', 'name', 'displayName'] 
            }],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.json(products);
    } catch (error) {
        console.error('Erro ao buscar produtos:', error);
        res.status(500).json({ error: 'Erro ao buscar produtos' });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.id, {
            include: [{ 
                model: Category, 
                as: 'category',
                attributes: ['id', 'name', 'displayName'] 
            }]
        });
        
        if (!product) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }
        
        res.json(product);
    } catch (error) {
        console.error('Erro ao buscar produto:', error);
        res.status(500).json({ error: 'Erro ao buscar produto' });
    }
});

app.get('/api/categories', async (req, res) => {
    try {
        const categories = await Category.findAll({
            where: { status: 'active' },
            order: [['sortOrder', 'ASC'], ['displayName', 'ASC']],
            include: [{
                model: Product,
                as: 'products',
                attributes: ['id'],
                where: { status: 'active' },
                required: false
            }]
        });
        
        // Adicionar contagem de produtos
        const categoriesWithCount = categories.map(cat => ({
            ...cat.toJSON(),
            productCount: cat.products ? cat.products.length : 0
        }));
        
        res.json(categoriesWithCount);
    } catch (error) {
        console.error('Erro ao buscar categorias:', error);
        res.status(500).json({ error: 'Erro ao buscar categorias' });
    }
});

// ===== ROTAS DE PEDIDOS =====
app.post('/api/orders', async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const { items, customerInfo, shippingAddress, paymentMethod } = req.body;
        
        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'Pedido deve conter pelo menos um item' });
        }

        // Calcular total
        let subtotal = 0;
        const orderItems = [];
        
        for (const item of items) {
            const product = await Product.findByPk(item.productId, { transaction });
            if (!product) {
                throw new Error(`Produto ${item.productId} não encontrado`);
            }
            
            if (product.stock < item.quantity) {
                throw new Error(`Estoque insuficiente para ${product.name}`);
            }
            
            const itemSubtotal = parseFloat(product.price) * item.quantity;
            subtotal += itemSubtotal;
            
            orderItems.push({
                productId: product.id,
                productName: product.name,
                productSku: product.sku,
                quantity: item.quantity,
                price: product.price,
                subtotal: itemSubtotal,
                productVariant: item.variant || {}
            });
        }

        // Criar pedido
        const order = await Order.create({
            customerInfo,
            shippingAddress,
            subtotal,
            total: subtotal, // Sem frete por enquanto
            paymentMethod,
            status: 'pending',
            paymentStatus: 'pending'
        }, { transaction });

        // Criar itens do pedido
        for (const orderItem of orderItems) {
            await OrderItem.create({
                orderId: order.id,
                ...orderItem
            }, { transaction });
            
            // Atualizar estoque
            await Product.decrement('stock', {
                by: orderItem.quantity,
                where: { id: orderItem.productId },
                transaction
            });
        }

        await transaction.commit();
        
        // Retornar pedido completo
        const completeOrder = await Order.findByPk(order.id, {
            include: [{
                model: OrderItem,
                as: 'items',
                include: [{
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'name', 'images']
                }]
            }]
        });

        res.status(201).json(completeOrder);
    } catch (error) {
        await transaction.rollback();
        console.error('Erro ao criar pedido:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== ROTAS ADMINISTRATIVAS =====
app.get('/api/admin/products', authenticateToken, async (req, res) => {
    try {
        const { category, search, status, limit = 100, offset = 0 } = req.query;
        
        let whereClause = {};
        
        if (category) {
            const categoryObj = await Category.findOne({ where: { name: category } });
            if (categoryObj) {
                whereClause.categoryId = categoryObj.id;
            }
        }
        
        if (status) {
            whereClause.status = status;
        }
        
        if (search) {
            whereClause[Op.or] = [
                { name: { [Op.iLike]: `%${search}%` } },
                { description: { [Op.iLike]: `%${search}%` } },
                { sku: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const products = await Product.findAll({
            where: whereClause,
            include: [{ 
                model: Category, 
                as: 'category',
                attributes: ['id', 'name', 'displayName'] 
            }],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.json(products);
    } catch (error) {
        console.error('Erro ao buscar produtos admin:', error);
        res.status(500).json({ error: 'Erro ao buscar produtos' });
    }
});

app.post('/api/admin/products', authenticateToken, upload.array('images', 5), async (req, res) => {
    try {
        const {
            name, description, price, stock, categoryId, sku,
            weight, dimensions, colors, sizes, status = 'active'
        } = req.body;

        // Processar imagens
        const images = req.files ? req.files.map(file => `/uploads/products/${file.filename}`) : [];

        const product = await Product.create({
            name,
            description,
            price: parseFloat(price),
            stock: parseInt(stock),
            categoryId: parseInt(categoryId),
            sku,
            weight: parseFloat(weight) || null,
            dimensions,
            colors: colors ? colors.split(',').map(c => c.trim()) : [],
            sizes: sizes ? sizes.split(',').map(s => s.trim()) : [],
            images,
            status
        });

        // Retornar produto com categoria
        const completeProduct = await Product.findByPk(product.id, {
            include: [{ 
                model: Category, 
                as: 'category',
                attributes: ['id', 'name', 'displayName'] 
            }]
        });

        res.status(201).json(completeProduct);
    } catch (error) {
        console.error('Erro ao criar produto:', error);
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/admin/products/:id', authenticateToken, upload.array('images', 5), async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }

        const {
            name, description, price, stock, categoryId, sku,
            weight, dimensions, colors, sizes, status
        } = req.body;

        const updateData = {
            name,
            description,
            price: parseFloat(price),
            stock: parseInt(stock),
            categoryId: parseInt(categoryId),
            sku,
            weight: parseFloat(weight) || null,
            dimensions,
            colors: colors ? colors.split(',').map(c => c.trim()) : [],
            sizes: sizes ? sizes.split(',').map(s => s.trim()) : [],
            status
        };

        // Atualizar imagens se enviadas
        if (req.files && req.files.length > 0) {
            updateData.images = req.files.map(file => `/uploads/products/${file.filename}`);
        }

        await product.update(updateData);

        // Retornar produto atualizado com categoria
        const updatedProduct = await Product.findByPk(product.id, {
            include: [{ 
                model: Category, 
                as: 'category',
                attributes: ['id', 'name', 'displayName'] 
            }]
        });

        res.json(updatedProduct);
    } catch (error) {
        console.error('Erro ao atualizar produto:', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/admin/products/:id', authenticateToken, async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }

        await product.destroy();
        res.json({ message: 'Produto deletado com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar produto:', error);
        res.status(500).json({ error: 'Erro ao deletar produto' });
    }
});

app.get('/api/admin/orders', authenticateToken, async (req, res) => {
    try {
        const { status, limit = 50, offset = 0 } = req.query;
        
        let whereClause = {};
        if (status) {
            whereClause.status = status;
        }

        const orders = await Order.findAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'email']
                },
                {
                    model: OrderItem,
                    as: 'items',
                    include: [{
                        model: Product,
                        as: 'product',
                        attributes: ['id', 'name', 'images']
                    }]
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.json(orders);
    } catch (error) {
        console.error('Erro ao buscar pedidos:', error);
        res.status(500).json({ error: 'Erro ao buscar pedidos' });
    }
});

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
    console.log(`👤 Login: POST http://localhost:${PORT}/api/login`);
    console.log('');
    console.log('🔐 Credenciais padrão:');
    console.log('   Email: admin@blackfaceox.com');
    console.log('   Senha: admin123');
    console.log('');
    console.log('🎨 Frontend React: http://localhost:5173');
    console.log('🗄️ Banco: PostgreSQL');
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