// backend/models/AsignacionRecorrido.js
const { DataTypes } = require('sequelize');
module.exports = (sequelize, SequelizeDataTypes) => {
const AsignacionRecorrido = sequelize.define('AsignacionRecorrido', {
  idAsig: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    field: 'id_asig' 
  },
  estadoAsig: {
    type: DataTypes.ENUM('pendiente', 'asignado', 'en_progreso', 'completado', 'cancelado'),
    allowNull: false,
    defaultValue: 'pendiente',
    field: 'estado_asig'
  },
  fecCreAsig: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'fec_cre_asig'
  },
  fecIniRecor: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'fec_ini_recor'
  },
  fecFinRecor: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'fec_fin_recor'
  },
  efiCombRecor: {
    type: DataTypes.DECIMAL(7, 2), 
    allowNull: true,
    field: 'efi_comb_recor'
  },
  kmIniRecor: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'km_ini_recor'
  },
  kmFinRecor: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'km_fin_recor'
  },
  notas: {
    type: DataTypes.TEXT,
    allowNull: true
   
  },
  
}, {
  tableName: 'ASIGNACION_RECORRIDO',
  timestamps: false, 
  
});

return AsignacionRecorrido; 
};