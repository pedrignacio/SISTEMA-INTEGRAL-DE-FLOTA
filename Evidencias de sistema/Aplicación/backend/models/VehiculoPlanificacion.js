// backend/models/VehiculoPlanificacion.js
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const VehiculoPlanificacion = sequelize.define('VehiculoPlanificacion', {
    
    planificacionMantenimientoIdPlan: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true, 
      field: 'planificacion_mantenimiento_id_plan'
    },
    vehiculoIdVehi: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true, 
      field: 'vehiculo_id_vehi'
    },
    
    fecUltPlan: {
      type: DataTypes.DATEONLY, 
      allowNull: true,
      field: 'fec_ult_plan'
    },
    kmUltPlan: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'km_ult_plan'
    },
    fecProxPlan: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'fec_prox_plan'
    },
    kmProxPlan: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'km_prox_plan'
    }
  }, {
    tableName: 'VEHICULO_PLANIFICACION',
    timestamps: false
  });
 
  return VehiculoPlanificacion;
};