'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Cart extends Model {
    static associate(models) {
      // Um carrinho pertence a um usuário
      Cart.belongsTo(models.User, { 
        foreignKey: 'userId',
        as: 'user'
      });
      
      // Um carrinho tem muitos itens
      Cart.hasMany(models.CartItem, { 
        foreignKey: 'cartId',
        as: 'items'
      });
    }
  }
  
  Cart.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true, // Um usuário só pode ter um carrinho
      references: {
        model: 'users',
        key: 'id'
      }
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
      allowNull: false
    },
    itemsCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    lastActivity: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'Cart',
    tableName: 'carts',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['userId']
      },
      {
        fields: ['lastActivity']
      }
    ],
    hooks: {
      afterUpdate: async (cart) => {
        // Atualizar lastActivity sempre que o carrinho for modificado
        if (!cart.changed('lastActivity')) {
          cart.lastActivity = new Date();
          await cart.save({ fields: ['lastActivity'] });
        }
      }
    }
  });
  
  return Cart;
};