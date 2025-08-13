require('dotenv').config();

const { Sequelize } = require('sequelize');

// Defaults y validación de variables de entorno
const dialect = process.env.DB_DIALECT || 'mysql';
const host = process.env.DB_HOST || '127.0.0.1';
const port = process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306;
const dbName = process.env.DB_NAME;
const dbUser = process.env.DB_USER;
const dbPass = process.env.DB_PASSWORD ?? '';

if (!dbName || !dbUser) {
  throw new Error(
    `Faltan variables de entorno obligatorias para la BD. ` +
    `Asegúrate de definir DB_NAME y DB_USER en backend/.env`
  );
}

const sequelize = new Sequelize(
  dbName,
  dbUser,
  dbPass,
  {
    host,
    port,
    dialect,
    logging: console.log,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

module.exports = sequelize;
