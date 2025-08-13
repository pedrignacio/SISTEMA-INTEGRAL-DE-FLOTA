// backend/models/PlanificacionMantenimiento.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize, SequelizeDataTypes) => {
  const PlanificacionMantenimiento = sequelize.define('PlanificacionMantenimiento', {
    idPlan: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'id_plan',
        comment: 'Número de identificación de la planificación del mantenimiento'
    },
    descPlan: { 
        type: DataTypes.TEXT,
        allowNull: true, 
        field: 'desc_plan',
        comment: 'Descripción de la planificación del mantenimiento'
    },
    frecuencia: { 
        type: DataTypes.INTEGER, 
        allowNull: true, 
        field: 'frecuencia',
        comment: 'Valor numérico de la frecuencia'
    },
    tipoFrecuencia: { 
        type: DataTypes.ENUM('km', 'dias', 'semanas', 'meses'), 
        allowNull: true, 
        field: 'tipo_frecuencia',
        comment: 'Tipo de frecuencia (km, dias, semanas, meses)'
    },
    
    fechaActivacion: {
        type: DataTypes.DATEONLY, 
        allowNull: true,          
        field: 'fecha_activacion',
        comment: 'Fecha de inicio para la activación del plan de mantenimiento'
    },
    esActivoPlan: { 
        type: DataTypes.BOOLEAN, 
        allowNull: false, 
        defaultValue: true, 
        field: 'es_activo_plan',
        comment: 'Indica si el plan de mantenimiento está habilitado'
    },
    esPreventivo: { 
        type: DataTypes.BOOLEAN, 
        allowNull: false, 
        field: 'es_preventivo',
        comment: 'Indica si el mantenimiento es preventivo (1) o correctivo (0)'
    }
    
  }, {
    tableName: 'PLANIFICACION_MANTENIMIENTO',
    timestamps: true, 
                      
    comment: 'Tabla para almacenar las planificaciones de mantenimiento de vehículos'
  });

  return PlanificacionMantenimiento;
};