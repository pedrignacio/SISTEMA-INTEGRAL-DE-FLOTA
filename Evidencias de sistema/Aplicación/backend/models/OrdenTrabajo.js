// backend/models/OrdenTrabajo.js
const { DataTypes } = require('sequelize');
const {
  ESTADOS_ORDEN_TRABAJO,
  PRIORIDADES_ORDEN_TRABAJO,
  getEnumValues,
} = require('../constants/enums');

module.exports = sequelize => {
  const OrdenTrabajo = sequelize.define(
    'OrdenTrabajo',
    {
      id_ot: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'id_ot',
        comment: 'Número de identificación de la orden de trabajo',
      },
      fec_ini_ot: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'fec_ini_ot',
        comment: 'Fecha y hora de inicio/creación de la orden',
      },
      fec_fin_ot: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'fec_fin_ot',
        comment: 'Fecha y hora del fin de la orden',
      },
      estado_ot: {
        type: DataTypes.ENUM(...getEnumValues(ESTADOS_ORDEN_TRABAJO)),
        allowNull: false,
        defaultValue: ESTADOS_ORDEN_TRABAJO.SIN_INICIAR,
        field: 'estado_ot',
        comment: 'Estado de la orden de trabajo',
      },
      prioridad: {
        type: DataTypes.ENUM(...getEnumValues(PRIORIDADES_ORDEN_TRABAJO)),
        allowNull: false,
        defaultValue: PRIORIDADES_ORDEN_TRABAJO.MEDIA,
        field: 'prioridad',
        comment: 'Prioridad de la orden de trabajo',
      },
      km_ot: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'km_ot',
        comment: 'Kilometraje del vehículo al momento de crear/iniciar la OT',
      },
      descripcion_ot: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'descripcion_ot',
        comment: 'Descripción general del trabajo o problema reportado',
      },
      usuario_id_usu_solicitante: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'usuario_id_usu_solicitante',
        comment: 'FK al usuario que solicitó o creó la OT',
      },
      usuario_id_usu_encargado: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'usuario_id_usu_encargado',
        comment: 'FK al usuario técnico o encargado de la OT',
      },
      // Las FKs (vehiculo_id_vehi, etc.) se gestionarán a través de las asociaciones en index.js
    },
    {
      tableName: 'orden_trabajo',
      timestamps: false,
      comment: 'Registro de órdenes de trabajo para mantenimientos',
    }
  );

  return OrdenTrabajo;
};
