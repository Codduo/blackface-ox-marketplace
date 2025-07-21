'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Adicionar campos para reset de senha
    await queryInterface.addColumn('users', 'resetToken', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('users', 'resetTokenExpiry', {
      type: Sequelize.DATE,
      allowNull: true
    });

    // Adicionar campos para verificação de email (futuro)
    await queryInterface.addColumn('users', 'emailVerified', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });

    await queryInterface.addColumn('users', 'emailVerificationToken', {
      type: Sequelize.STRING,
      allowNull: true
    });

    // Adicionar campo de último login
    await queryInterface.addColumn('users', 'lastLoginAt', {
      type: Sequelize.DATE,
      allowNull: true
    });

    // Adicionar índices para performance
    await queryInterface.addIndex('users', ['resetToken'], {
      name: 'users_reset_token'
    });

    await queryInterface.addIndex('users', ['emailVerificationToken'], {
      name: 'users_email_verification_token'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remover índices
    await queryInterface.removeIndex('users', 'users_reset_token');
    await queryInterface.removeIndex('users', 'users_email_verification_token');

    // Remover colunas
    await queryInterface.removeColumn('users', 'resetToken');
    await queryInterface.removeColumn('users', 'resetTokenExpiry');
    await queryInterface.removeColumn('users', 'emailVerified');
    await queryInterface.removeColumn('users', 'emailVerificationToken');
    await queryInterface.removeColumn('users', 'lastLoginAt');
  }
};