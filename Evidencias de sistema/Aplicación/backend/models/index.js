'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const basename = path.basename(__filename);
const setupAssociations = require('./associations');

const sequelize = require('../config/database');
const db = {};

// Cargar todos los modelos dinámicamente
fs.readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file !== 'associations.js' && // Excluir el archivo de asociaciones
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
    );
  })
  .forEach(file => {
    console.log(`Cargando modelo: ${file}`);
    const model = require(path.join(__dirname, file))(
      sequelize,
      Sequelize.DataTypes
    );
    db[model.name] = model;
  });

// Ejecutar el método associate si existe en los modelos (para compatibilidad)
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    console.log(`Ejecutando asociaciones definidas en el modelo: ${modelName}`);
    db[modelName].associate(db);
  }
});

// Configurar todas las asociaciones desde el archivo centralizado
setupAssociations(db);

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
