'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Order extends Model {
    static associate(models) {
  // Um pedido pertence a um usuário
  Order.belongsTo(models.User, { 
    foreignKey: 'userId',
    as: 'user'
  });
  
  // Um pedido tem muitos itens
  Order.hasMany(models.OrderItem, { 
    foreignKey: 'orderId',
    as: 'items'
  });
  
  // ADICIONAR estas associações:
  Order.belongsTo(models.Address, {
    foreignKey: 'shippingAddressId',
    as: 'shippingAddressRef'
  });
  
  Order.belongsTo(models.Address, {
    foreignKey: 'billingAddressId',
    as: 'billingAddressRef'
  });
}
  }
  
  Order.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    orderNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true, // Pode ser null para pedidos de convidados
      references: {
        model: 'users',
        key: 'id'
      }
    },
    customerInfo: {
      type: DataTypes.TEXT,
      allowNull: false,
      get() {
        const value = this.getDataValue('customerInfo');
        return value ? JSON.parse(value) : {};
      },
      set(value) {
        this.setDataValue('customerInfo', JSON.stringify(value || {}));
      }
    },
    shippingAddress: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const value = this.getDataValue('shippingAddress');
        return value ? JSON.parse(value) : {};
      },
      set(value) {
        this.setDataValue('shippingAddress', JSON.stringify(value || {}));
      }
    },
    billingAddress: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const value = this.getDataValue('billingAddress');
        return value ? JSON.parse(value) : {};
      },
      set(value) {
        this.setDataValue('billingAddress', JSON.stringify(value || {}));
      }
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    shipping: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    tax: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    discount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'),
      defaultValue: 'pending',
      allowNull: false
    },
    paymentStatus: {
      type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
      defaultValue: 'pending',
      allowNull: false
    },
    paymentMethod: {
      type: DataTypes.STRING,
      allowNull: true
    },
    paymentId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    shippingMethod: {
      type: DataTypes.STRING,
      allowNull: true
    },
    trackingCode: {
      type: DataTypes.STRING,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    shippingAddressId: {
  type: DataTypes.INTEGER,
  allowNull: true,
  references: {
    model: 'addresses',
    key: 'id'
  }
},
billingAddressId: {
  type: DataTypes.INTEGER,
  allowNull: true,
  references: {
    model: 'addresses',
    key: 'id'
  }
}
    
  }, {
    sequelize,
    modelName: 'Order',
    tableName: 'orders',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['orderNumber']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['paymentStatus']
      },
      {
        fields: ['createdAt']
      }
    ],
    hooks: {
      beforeCreate: (order) => {
        // Gerar número do pedido automaticamente
        if (!order.orderNumber) {
          const timestamp = Date.now().toString(36);
          const random = Math.random().toString(36).substr(2, 5);
          order.orderNumber = `BFO-${timestamp}-${random}`.toUpperCase();
        }
      }
    }
  });
  
  return Order;
};