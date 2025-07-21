'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class OrderItem extends Model {
    static associate(models) {
      // Um item de pedido pertence a um pedido
      OrderItem.belongsTo(models.Order, { 
        foreignKey: 'orderId',
        as: 'order'
      });
      
      // Um item de pedido pertence a um produto
      OrderItem.belongsTo(models.Product, { 
        foreignKey: 'productId',
        as: 'product'
      });
    }
  }
  
  OrderItem.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'orders',
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
    productName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    productSku: {
      type: DataTypes.STRING,
      allowNull: true
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1
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
    productVariant: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const value = this.getDataValue('productVariant');
        return value ? JSON.parse(value) : {};
      },
      set(value) {
        this.setDataValue('productVariant', JSON.stringify(value || {}));
      }
    }
  }, {
    sequelize,
    modelName: 'OrderItem',
    tableName: 'order_items',
    timestamps: true,
    indexes: [
      {
        fields: ['orderId']
      },
      {
        fields: ['productId']
      }
    ],
    hooks: {
      beforeCreate: (orderItem) => {
        // Calcular subtotal automaticamente
        orderItem.subtotal = orderItem.quantity * orderItem.price;
      },
      beforeUpdate: (orderItem) => {
        // Recalcular subtotal se quantidade ou preço mudarem
        if (orderItem.changed('quantity') || orderItem.changed('price')) {
          orderItem.subtotal = orderItem.quantity * orderItem.price;
        }
      }
    }
  });
  
  return OrderItem;
};