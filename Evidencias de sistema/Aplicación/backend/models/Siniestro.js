// backend/models/Siniestro.js

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Siniestro = sequelize.define('Siniestro', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'id_sini'
    },
    tipo: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'tipo_sini'
    },
    fecha: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'fec_sini'
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'desc_sini'
    },
     estado: {
      type: DataTypes.ENUM('reportado', 'en_revision', 'resuelto', 'cancelado'),
      allowNull: false,
      defaultValue: 'reportado', // Un valor por defecto es una excelente práctica
      field: 'estado_sin'
    },
    ubicacion: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'ubicacion_sini'
    },
    costoEstimado: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'costo_estimado_reparacion'
    },
    archivoUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'archivo_url_sini'
    },
    vehiculoId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'vehiculo_id_vehi'
    },
    conductorId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'usuario_id_usu_conductor'
    },
    reportaId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'usuario_id_usu_reporta'
    }
  }, {
    tableName: 'siniestro',
    timestamps: false 
  });

  return Siniestro;
};