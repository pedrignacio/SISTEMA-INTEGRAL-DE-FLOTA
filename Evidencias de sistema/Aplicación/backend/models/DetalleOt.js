// backend/models/DetalleOt.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DetalleOt = sequelize.define('DetalleOt', {
    id_det: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'id_det',
      comment: 'ID del detalle de la OT'
    },
    usuario_id_usu_tecnico: {
  type: DataTypes.INTEGER,
  allowNull: true,  
  field: 'usuario_id_usu_tecnico',
  references: {
    model: 'usuarios', 
    key: 'id_usu'      
  },
  comment: 'ID del usuario asignado como técnico a esta tarea'
},
    desc_det: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'desc_det',
      comment: 'Descripción de la actividad realizada o a realizar'
    },
    checklist: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'checklist',
      comment: 'Indica si la tarea fue completada (1) o no (0)'
    },
    fec_ini_det: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'fec_ini_det',
      comment: 'Fecha y hora de inicio de esta tarea específica'
    },
    fec_fin_det: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'fec_fin_det',
      comment: 'Fecha y hora de fin de esta tarea específica'
    },
    es_activo_det: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'es_activo_det',
      comment: 'Indica si esta tarea está activa (1) o cancelada (0) dentro de la OT'
    },
    duracion_real_det: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'duracion_real_det',
      comment: 'Duración real de la tarea en minutos'
    }
    // Las FKs (orden_trabajo_id_ot, etc.) se gestionarán a través de las asociaciones en index.js
  }, {
    tableName: 'detalle_ot',
    timestamps: false,
    comment: 'Detalle de las tareas o actividades realizadas dentro de una orden de trabajo'
  });

  return DetalleOt;
};