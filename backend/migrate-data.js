// migrate-data.js - Migração JSON → PostgreSQL
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { User, Product, Category, Order, OrderItem, sequelize } = require('./models');

console.log('🚀 Iniciando migração Black Face OX: JSON → PostgreSQL...');
console.log('');

async function migrateData() {
    try {
        // Testar conexão
        await sequelize.authenticate();
        console.log('✅ Conexão PostgreSQL estabelecida');

        // Ler dados do JSON antigo
        let oldData = {};
        const jsonPath = path.join(__dirname, 'data', 'database.json');
        
        if (fs.existsSync(jsonPath)) {
            const data = fs.readFileSync(jsonPath, 'utf8');
            oldData = JSON.parse(data);
            console.log('📂 Dados carregados do database.json');
        } else {
            console.log('📂 Usando dados padrão do sistema');
            // Dados padrão do seu server.js original
            oldData = {
                users: [
                    {
                        id: 1,
                        email: 'admin@blackfaceox.com',
                        password: 'admin123',
                        role: 'admin',
                        name: 'Admin Black Face OX'
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
                        sizes: ['Único']
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
                        sizes: ['P', 'M', 'G', 'GG']
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
                        sizes: ['P', 'M', 'G', 'GG', 'XG']
                    }
                ],
                orders: []
            };
        }

        console.log('');
        console.log('🔄 Iniciando migração dos dados...');

        // 1. MIGRAR CATEGORIAS
        console.log('📂 Migrando categorias...');
        const categoryMap = {};
        
        for (const cat of oldData.categories || []) {
            const existingCategory = await Category.findOne({ 
                where: { name: cat.name } 
            });
            
            if (!existingCategory) {
                const newCategory = await Category.create({
                    name: cat.name,
                    displayName: cat.displayName,
                    description: cat.description || null,
                    status: 'active'
                });
                categoryMap[cat.name] = newCategory.id;
                console.log(`   ✅ Categoria criada: ${cat.displayName}`);
            } else {
                categoryMap[cat.name] = existingCategory.id;
                console.log(`   ↩️ Categoria existe: ${cat.displayName}`);
            }
        }

        // 2. MIGRAR USUÁRIOS
        console.log('👤 Migrando usuários...');
        
        for (const user of oldData.users || []) {
            const existingUser = await User.findOne({ 
                where: { email: user.email } 
            });
            
            if (!existingUser) {
                // Hash da senha
                let hashedPassword = user.password;
                if (!user.password.startsWith('$2b$')) {
                    hashedPassword = await bcrypt.hash(user.password, 10);
                }
                
                const newUser = await User.create({
                    email: user.email,
                    password: hashedPassword,
                    name: user.name,
                    role: user.role || 'customer',
                    status: 'active'
                });
                console.log(`   ✅ Usuário criado: ${user.email} (${user.role})`);
            } else {
                console.log(`   ↩️ Usuário existe: ${user.email}`);
            }
        }

        // 3. MIGRAR PRODUTOS
        console.log('📦 Migrando produtos...');
        
        for (const product of oldData.products || []) {
            const existingProduct = await Product.findOne({ 
                where: { sku: product.sku } 
            });
            
            if (!existingProduct) {
                // Encontrar ID da categoria
                const categoryId = categoryMap[product.category] || 1;
                
                const newProduct = await Product.create({
                    name: product.name,
                    description: product.description || null,
                    price: parseFloat(product.price),
                    stock: parseInt(product.stock) || 0,
                    categoryId: categoryId,
                    sku: product.sku,
                    weight: parseFloat(product.weight) || 0,
                    dimensions: product.dimensions || null,
                    status: product.status || 'active',
                    colors: product.colors || [],
                    sizes: product.sizes || [],
                    images: product.images || [],
                    featured: false,
                    tags: []
                });
                console.log(`   ✅ Produto criado: ${product.name}`);
            } else {
                console.log(`   ↩️ Produto existe: ${product.name}`);
            }
        }

        // 4. MIGRAR PEDIDOS (se existirem)
        console.log('🛒 Migrando pedidos...');
        
        for (const order of oldData.orders || []) {
            const existingOrder = await Order.findOne({ 
                where: { id: order.id } 
            });
            
            if (!existingOrder) {
                // Encontrar usuário se existir
                let userId = null;
                if (order.userId) {
                    const user = await User.findByPk(order.userId);
                    if (user) userId = user.id;
                }
                
                const newOrder = await Order.create({
                    userId: userId,
                    customerInfo: order.customerInfo || {},
                    subtotal: parseFloat(order.subtotal) || 0,
                    total: parseFloat(order.total) || 0,
                    status: order.status || 'pending',
                    paymentStatus: order.paymentStatus || 'pending',
                    paymentMethod: order.paymentMethod || null,
                    shippingMethod: order.shippingMethod || null,
                    notes: order.notes || null
                });
                
                // Migrar itens do pedido
                for (const item of order.items || []) {
                    const product = await Product.findByPk(item.productId);
                    if (product) {
                        await OrderItem.create({
                            orderId: newOrder.id,
                            productId: item.productId,
                            productName: product.name,
                            productSku: product.sku,
                            quantity: item.quantity,
                            price: parseFloat(item.price),
                            subtotal: parseFloat(item.quantity * item.price)
                        });
                    }
                }
                
                console.log(`   ✅ Pedido criado: ${newOrder.orderNumber}`);
            } else {
                console.log(`   ↩️ Pedido existe: ${order.id}`);
            }
        }

        // 5. ESTATÍSTICAS FINAIS
        const totalUsers = await User.count();
        const totalCategories = await Category.count();
        const totalProducts = await Product.count();
        const totalOrders = await Order.count();

        console.log('');
        console.log('🎉 ===== MIGRAÇÃO CONCLUÍDA COM SUCESSO! =====');
        console.log('');
        console.log('📊 Estatísticas finais:');
        console.log(`   👤 Usuários: ${totalUsers}`);
        console.log(`   📂 Categorias: ${totalCategories}`);
        console.log(`   📦 Produtos: ${totalProducts}`);
        console.log(`   🛒 Pedidos: ${totalOrders}`);
        console.log('');
        console.log('🚀 Próximos passos:');
        console.log('   1. Atualizar server.js para usar PostgreSQL');
        console.log('   2. Testar API: npm start');
        console.log('   3. Verificar endpoints: http://localhost:8080/api/health');
        console.log('   4. Testar produtos: http://localhost:8080/api/products');
        console.log('');
        console.log('💡 Dica: O arquivo data/database.json foi preservado como backup');
        console.log('=========================================');
        
        // Fechar conexão
        await sequelize.close();
        console.log('✅ Conexão PostgreSQL fechada');
        
    } catch (error) {
        console.error('❌ Erro durante a migração:', error);
        console.error('📝 Detalhes:', error.message);
        
        // Dicas de solução
        if (error.message.includes('relation') && error.message.includes('does not exist')) {
            console.log('💡 Dica: Execute primeiro o comando para criar as tabelas');
        } else if (error.message.includes('duplicate key')) {
            console.log('💡 Dica: Dados já existem no banco (migração já executada?)');
        } else if (error.message.includes('connection')) {
            console.log('💡 Dica: Verifique se o PostgreSQL está rodando');
        }
        
        process.exit(1);
    }
}

// Verificar se é execução direta
if (require.main === module) {
    migrateData();
}

module.exports = migrateData;