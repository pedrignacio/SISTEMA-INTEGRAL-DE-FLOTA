// backend/models/TareaPlanificacion.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize, SequelizeDataTypes) => {
  const TareaPlanificacion = sequelize.define('TareaPlanificacion', {
    idTareaPlan: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'id_tarea_plan',
        comment: 'ID único de la tarea de planificación'
    },
    nomTareaPlan: {
        type: DataTypes.STRING(150),
        allowNull: false,
        field: 'nom_tarea_plan',
        comment: 'Nombre de la tarea específica dentro del plan'
    },
    descTareaPlan: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'desc_tarea_plan',
        comment: 'Descripción detallada de la tarea'
    }
   
  }, {
    tableName: 'TAREA_PLANIFICACION', 
    timestamps: false, 
                     
    comment: 'Almacena las tareas específicas creadas para cada plan de mantenimiento'
  });


  return TareaPlanificacion;
};