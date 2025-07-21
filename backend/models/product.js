'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Product extends Model {
    static associate(models) {
      // Um produto pertence a uma categoria
      Product.belongsTo(models.Category, { 
        foreignKey: 'categoryId',
        as: 'category'
      });
      
      // Um produto pode estar em muitos itens de pedido
      Product.hasMany(models.OrderItem, { 
        foreignKey: 'productId',
        as: 'orderItems'
      });
    }
  }
  
  Product.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [2, 255]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    comparePrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: 0
      }
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    sku: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    weight: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true,
      validate: {
        min: 0
      }
    },
    dimensions: {
      type: DataTypes.STRING,
      allowNull: true
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'categories',
        key: 'id'
      }
    },
    images: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const value = this.getDataValue('images');
        return value ? JSON.parse(value) : [];
      },
      set(value) {
        this.setDataValue('images', JSON.stringify(value || []));
      }
    },
    colors: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const value = this.getDataValue('colors');
        return value ? JSON.parse(value) : [];
      },
      set(value) {
        this.setDataValue('colors', JSON.stringify(value || []));
      }
    },
    sizes: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const value = this.getDataValue('sizes');
        return value ? JSON.parse(value) : [];
      },
      set(value) {
        this.setDataValue('sizes', JSON.stringify(value || []));
      }
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'draft'),
      defaultValue: 'active',
      allowNull: false
    },
    featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    tags: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const value = this.getDataValue('tags');
        return value ? JSON.parse(value) : [];
      },
      set(value) {
        this.setDataValue('tags', JSON.stringify(value || []));
      }
    }
  }, {
    sequelize,
    modelName: 'Product',
    tableName: 'products',
    timestamps: true,
    indexes: [
      {
        fields: ['categoryId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['featured']
      },
      {
        fields: ['price']
      },
      {
        unique: true,
        fields: ['sku']
      },
      {
        fields: ['name']
      }
    ]
  });
  
  return Product;
};