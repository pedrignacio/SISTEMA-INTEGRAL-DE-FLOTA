// backend/models/Ruta.js
const { DataTypes } = require('sequelize');
module.exports = (sequelize, SequelizeDataTypes) => {
  const Ruta = sequelize.define(
    'Ruta',
    {
      idRuta: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        field: 'id_ruta',
      },
      nombreRuta: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'nom_ruta',
      },
      descripcionRuta: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'desc_ruta',
      },
      puntosRuta: {
        type: DataTypes.JSON,
        allowNull: false,
        field: 'puntos',
      },
      kilometrosRuta: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: 'km_ruta',
        get() {
          const rawValue = this.getDataValue('kilometrosRuta');
          return rawValue !== null ? parseFloat(rawValue) : null;
        },
      },
      duracionEstimada: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'duracion_estimada',
      },
    },
    {
      tableName: 'RUTA',
      timestamps: false,
      comment: 'Tabla para almacenar rutas predefinidas o registradas',
    }
  );

  return Ruta;
};
