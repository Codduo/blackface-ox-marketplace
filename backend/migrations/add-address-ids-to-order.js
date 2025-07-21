'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('orders', 'shippingAddressId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'addresses',
        key: 'id'
      }
    });
    
    await queryInterface.addColumn('orders', 'billingAddressId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'addresses',
        key: 'id'
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('orders', 'shippingAddressId');
    await queryInterface.removeColumn('orders', 'billingAddressId');
  }
};