'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Address extends Model {
    static associate(models) {
      // Um endereço pertence a um usuário
      Address.belongsTo(models.User, { 
        foreignKey: 'userId',
        as: 'user'
      });
      
      // Um endereço pode ser usado em muitos pedidos
      Address.hasMany(models.Order, { 
        foreignKey: 'shippingAddressId',
        as: 'shippingOrders'
      });
      
      Address.hasMany(models.Order, { 
        foreignKey: 'billingAddressId',
        as: 'billingOrders'
      });
    }
  }
  
  Address.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    label: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [2, 100]
      }
    },
    recipientName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [2, 255]
      }
    },
    recipientPhone: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [10, 15]
      }
    },
    street: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [5, 255]
      }
    },
    number: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 20]
      }
    },
    complement: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [0, 100]
      }
    },
    neighborhood: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [2, 100]
      }
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [2, 100]
      }
    },
    state: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [2, 2]
      }
    },
    zipCode: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [8, 10]
      }
    },
    country: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'BR'
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    type: {
      type: DataTypes.ENUM('home', 'work', 'other'),
      defaultValue: 'home'
    },
    instructions: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Address',
    tableName: 'addresses',
    timestamps: true,
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['zipCode']
      },
      {
        fields: ['isDefault']
      },
      {
        fields: ['type']
      }
    ],
    hooks: {
      beforeCreate: async (address) => {
        // Se for marcado como padrão, desmarcar outros endereços do usuário
        if (address.isDefault) {
          await Address.update(
            { isDefault: false },
            { where: { userId: address.userId } }
          );
        }
      },
      beforeUpdate: async (address) => {
        // Se for marcado como padrão, desmarcar outros endereços do usuário
        if (address.isDefault && address.changed('isDefault')) {
          await Address.update(
            { isDefault: false },
            { where: { userId: address.userId, id: { [sequelize.Op.ne]: address.id } } }
          );
        }
      }
    }
  });
  
  return Address;
};