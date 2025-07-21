'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CartItem extends Model {
    static associate(models) {
      // Um item do carrinho pertence a um carrinho
      CartItem.belongsTo(models.Cart, { 
        foreignKey: 'cartId',
        as: 'cart'
      });
      
      // Um item do carrinho referencia um produto
      CartItem.belongsTo(models.Product, { 
        foreignKey: 'productId',
        as: 'product'
      });
    }
  }
  
  CartItem.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    cartId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'carts',
        key: 'id'
      }
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id'
      }
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1,
        max: 99
      }
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    selectedColor: {
      type: DataTypes.STRING,
      allowNull: true
    },
    selectedSize: {
      type: DataTypes.STRING,
      allowNull: true
    },
    variant: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const value = this.getDataValue('variant');
        return value ? JSON.parse(value) : {};
      },
      set(value) {
        this.setDataValue('variant', JSON.stringify(value || {}));
      }
    }
  }, {
    sequelize,
    modelName: 'CartItem',
    tableName: 'cart_items',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['cartId', 'productId', 'selectedColor', 'selectedSize']
      },
      {
        fields: ['cartId']
      },
      {
        fields: ['productId']
      }
    ],
    hooks: {
      beforeCreate: (cartItem) => {
        // Calcular subtotal automaticamente
        cartItem.subtotal = cartItem.quantity * cartItem.price;
      },
      beforeUpdate: (cartItem) => {
        // Recalcular subtotal se quantidade ou preço mudarem
        if (cartItem.changed('quantity') || cartItem.changed('price')) {
          cartItem.subtotal = cartItem.quantity * cartItem.price;
        }
      },
      afterCreate: async (cartItem) => {
        // Atualizar totais do carrinho
        await updateCartTotals(cartItem.cartId);
      },
      afterUpdate: async (cartItem) => {
        // Atualizar totais do carrinho
        await updateCartTotals(cartItem.cartId);
      },
      afterDestroy: async (cartItem) => {
        // Atualizar totais do carrinho
        await updateCartTotals(cartItem.cartId);
      }
    }
  });
  
  return CartItem;
};

// Função helper para atualizar totais do carrinho
async function updateCartTotals(cartId) {
  const { Cart, CartItem } = require('./index');
  
  const cart = await Cart.findByPk(cartId);
  if (!cart) return;
  
  const items = await CartItem.findAll({ where: { cartId } });
  
  const subtotal = items.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
  const itemsCount = items.reduce((sum, item) => sum + item.quantity, 0);
  
  await cart.update({
    subtotal: subtotal,
    itemsCount: itemsCount,
    lastActivity: new Date()
  });
}