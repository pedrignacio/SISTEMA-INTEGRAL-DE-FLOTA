// backend/models/associations.js
/**
 * Archivo centralizado para todas las asociaciones entre modelos
 * Esto separa la lógica de asociaciones del archivo index.js principal
 */

const setupAssociations = db => {
  console.log('Configurando asociaciones de modelos...');

  // === ASOCIACIONES DE SINIESTROS ===
  setupSiniestroAssociations(db);

  // === ASOCIACIONES DE ASIGNACIONES DE RECORRIDO ===
  setupAsignacionRecorridoAssociations(db);

  // === ASOCIACIONES DE PLANIFICACIÓN DE MANTENIMIENTO ===
  setupPlanificacionMantenimientoAssociations(db);

  // === ASOCIACIONES DE ÓRDENES DE TRABAJO ===
  setupOrdenTrabajoAssociations(db);

  // === ASOCIACIONES DE REGISTRO DE COMBUSTIBLE ===
  setupRegistroCombustibleAssociations(db);

  console.log('Asociaciones configuradas exitosamente.');
};

/**
 * Configura las asociaciones para el modelo Siniestro
 */
const setupSiniestroAssociations = db => {
  if (db.Siniestro && db.Usuario && db.Vehiculo) {
    // Un siniestro es reportado por un Usuario (conductor)
    db.Siniestro.belongsTo(db.Usuario, {
      foreignKey: {
        name: 'conductorId',
        field: 'usuario_id_usu_conductor',
        allowNull: false,
      },
      as: 'conductor',
    });

    db.Usuario.hasMany(db.Siniestro, {
      foreignKey: 'usuario_id_usu_conductor',
      as: 'siniestrosComoConductor',
    });

    // Un siniestro también tiene un usuario que reporta
    db.Siniestro.belongsTo(db.Usuario, {
      foreignKey: {
        name: 'reportaId',
        field: 'usuario_id_usu_reporta',
        allowNull: false,
      },
      as: 'reporta',
    });

    // Un siniestro pertenece a un Vehiculo
    db.Siniestro.belongsTo(db.Vehiculo, {
      foreignKey: {
        name: 'vehiculoId',
        field: 'vehiculo_id_vehi',
        allowNull: false,
      },
      as: 'vehiculo',
    });

    db.Vehiculo.hasMany(db.Siniestro, {
      foreignKey: 'vehiculo_id_vehi',
      as: 'siniestros',
    });
  } else {
    console.warn('Modelos faltantes para asociaciones de Siniestro');
  }
};

/**
 * Configura las asociaciones para AsignacionRecorrido
 */
const setupAsignacionRecorridoAssociations = db => {
  // AsignacionRecorrido -> Vehiculo
  if (db.AsignacionRecorrido && db.Vehiculo) {
    db.AsignacionRecorrido.belongsTo(db.Vehiculo, {
      foreignKey: {
        name: 'vehiculoIdVehi',
        allowNull: false,
        field: 'vehiculo_id_vehi',
      },
      as: 'vehiculo',
      targetKey: 'idVehi',
    });

    db.Vehiculo.hasMany(db.AsignacionRecorrido, {
      foreignKey: {
        name: 'vehiculoIdVehi',
        allowNull: false,
        field: 'vehiculo_id_vehi',
      },
      as: 'recorridosAsignados',
    });
  }

  // AsignacionRecorrido -> Usuario (Conductor)
  if (db.AsignacionRecorrido && db.Usuario) {
    db.AsignacionRecorrido.belongsTo(db.Usuario, {
      foreignKey: {
        name: 'usuarioIdUsuConductor',
        field: 'usuario_id_usu',
        allowNull: false,
      },
      as: 'conductor',
      targetKey: 'idUsu',
    });

    db.Usuario.hasMany(db.AsignacionRecorrido, {
      foreignKey: {
        name: 'usuarioIdUsuConductor',
        field: 'usuario_id_usu',
        allowNull: false,
      },
      as: 'asignacionesComoConductor',
    });
  }

  // AsignacionRecorrido -> Ruta
  if (db.AsignacionRecorrido && db.Ruta) {
    db.AsignacionRecorrido.belongsTo(db.Ruta, {
      foreignKey: {
        name: 'rutaIdRuta',
        allowNull: false,
        field: 'ruta_id_ruta',
      },
      as: 'rutaPlantilla',
      targetKey: 'idRuta',
    });

    db.Ruta.hasMany(db.AsignacionRecorrido, {
      foreignKey: {
        name: 'rutaIdRuta',
        allowNull: false,
        field: 'ruta_id_ruta',
      },
      as: 'asignacionesEnEstaRuta',
    });
  }
};

/**
 * Configura las asociaciones para PlanificacionMantenimiento
 */
const setupPlanificacionMantenimientoAssociations = db => {
  // PlanificacionMantenimiento -> TareaPlanificacion (1:N)
  if (db.PlanificacionMantenimiento && db.TareaPlanificacion) {
    db.PlanificacionMantenimiento.hasMany(db.TareaPlanificacion, {
      foreignKey: {
        name: 'planificacionMantenimientoIdPlan',
        field: 'planificacion_mantenimiento_id_plan',
        allowNull: false,
      },
      as: 'tareas',
    });

    db.TareaPlanificacion.belongsTo(db.PlanificacionMantenimiento, {
      foreignKey: {
        name: 'planificacionMantenimientoIdPlan',
        field: 'planificacion_mantenimiento_id_plan',
        allowNull: false,
      },
    });
  }

  // PlanificacionMantenimiento <-> Vehiculo (N:M a través de VehiculoPlanificacion)
  if (
    db.PlanificacionMantenimiento &&
    db.Vehiculo &&
    db.VehiculoPlanificacion
  ) {
    db.PlanificacionMantenimiento.belongsToMany(db.Vehiculo, {
      through: db.VehiculoPlanificacion,
      foreignKey: {
        name: 'planificacionMantenimientoIdPlan',
        field: 'planificacion_mantenimiento_id_plan',
        allowNull: false,
      },
      otherKey: {
        name: 'vehiculoIdVehi',
        field: 'vehiculo_id_vehi',
        allowNull: false,
      },
      as: 'vehiculosEnPlan',
    });

    db.Vehiculo.belongsToMany(db.PlanificacionMantenimiento, {
      through: db.VehiculoPlanificacion,
      foreignKey: {
        name: 'vehiculoIdVehi',
        field: 'vehiculo_id_vehi',
        allowNull: false,
      },
      otherKey: {
        name: 'planificacionMantenimientoIdPlan',
        field: 'planificacion_mantenimiento_id_plan',
        allowNull: false,
      },
      as: 'planificacionesDelVehiculo',
    });

    // Direct associations for junction table access
    db.PlanificacionMantenimiento.hasMany(db.VehiculoPlanificacion, {
      foreignKey: {
        name: 'planificacionMantenimientoIdPlan',
        field: 'planificacion_mantenimiento_id_plan',
        allowNull: false,
      },
      as: 'vehiculosPlanificacion',
    });

    db.VehiculoPlanificacion.belongsTo(db.PlanificacionMantenimiento, {
      foreignKey: {
        name: 'planificacionMantenimientoIdPlan',
        field: 'planificacion_mantenimiento_id_plan',
        allowNull: false,
      },
      as: 'planificacion',
    });

    db.Vehiculo.hasMany(db.VehiculoPlanificacion, {
      foreignKey: {
        name: 'vehiculoIdVehi',
        field: 'vehiculo_id_vehi',
        allowNull: false,
      },
      as: 'planificacionesVehiculo',
    });

    db.VehiculoPlanificacion.belongsTo(db.Vehiculo, {
      foreignKey: {
        name: 'vehiculoIdVehi',
        field: 'vehiculo_id_vehi',
        allowNull: false,
      },
      as: 'vehiculo',
    });
  }
};

/**
 * Configura las asociaciones para OrdenTrabajo y DetalleOt
 */
const setupOrdenTrabajoAssociations = db => {
  // OrdenTrabajo -> DetalleOt (1:N)
  if (db.OrdenTrabajo && db.DetalleOt) {
    db.OrdenTrabajo.hasMany(db.DetalleOt, {
      foreignKey: {
        name: 'ordenTrabajoIdOt',
        field: 'orden_trabajo_id_ot',
        allowNull: false,
      },
      as: 'detalles',
    });

    db.DetalleOt.belongsTo(db.OrdenTrabajo, {
      foreignKey: {
        name: 'ordenTrabajoIdOt',
        field: 'orden_trabajo_id_ot',
        allowNull: false,
      },
    });
  }

  // OrdenTrabajo -> Vehiculo (N:1)
  if (db.OrdenTrabajo && db.Vehiculo) {
    db.OrdenTrabajo.belongsTo(db.Vehiculo, {
      foreignKey: {
        name: 'vehiculoIdVehi',
        field: 'vehiculo_id_vehi',
        allowNull: false,
      },
      as: 'vehiculo',
    });

    db.Vehiculo.hasMany(db.OrdenTrabajo, {
      foreignKey: {
        name: 'vehiculoIdVehi',
        field: 'vehiculo_id_vehi',
        allowNull: false,
      },
      as: 'ordenesTrabajo',
    });
  }

  // OrdenTrabajo -> Usuario (Solicitante y Encargado)
  if (db.OrdenTrabajo && db.Usuario) {
    db.OrdenTrabajo.belongsTo(db.Usuario, {
      foreignKey: {
        name: 'usuarioIdUsuSolicitante',
        field: 'usuario_id_usu_solicitante',
      },
      as: 'solicitante',
    });

    db.OrdenTrabajo.belongsTo(db.Usuario, {
      foreignKey: {
        name: 'usuarioIdUsuEncargado',
        field: 'usuario_id_usu_encargado',
      },
      as: 'encargado',
    });

    db.Usuario.hasMany(db.OrdenTrabajo, {
      foreignKey: 'usuario_id_usu_solicitante',
      as: 'ordenesSolicitadas',
    });

    db.Usuario.hasMany(db.OrdenTrabajo, {
      foreignKey: 'usuario_id_usu_encargado',
      as: 'ordenesEncargadas',
    });
  }

  // DetalleOt -> Usuario (Técnico)
  if (db.DetalleOt && db.Usuario) {
    db.DetalleOt.belongsTo(db.Usuario, {
      foreignKey: {
        name: 'usuarioIdUsuTecnico',
        field: 'usuario_id_usu_tecnico',
      },
      as: 'tecnico',
    });

    db.Usuario.hasMany(db.DetalleOt, {
      foreignKey: {
        name: 'usuarioIdUsuTecnico',
        field: 'usuario_id_usu_tecnico',
      },
      as: 'tareasAsignadas',
    });
  }

  // OrdenTrabajo -> VehiculoPlanificacion (Referencias opcionales)
  if (db.OrdenTrabajo && db.VehiculoPlanificacion) {
    db.OrdenTrabajo.belongsTo(db.VehiculoPlanificacion, {
      foreignKey: {
        name: 'vehiculoPlanificacionVehiculoIdVehi',
        field: 'vehiculo_planificacion_vehiculo_id_vehi',
      },
      as: 'planificacionVehiculo',
    });

    db.OrdenTrabajo.belongsTo(db.VehiculoPlanificacion, {
      foreignKey: {
        name: 'vehiculoPlanificacionPlanIdPlan',
        field: 'vehiculo_planificacion_plan_id_plan',
      },
      as: 'planificacionMantenimiento',
    });
  }
};

/**
 * Configura las asociaciones para RegistroCombustible
 */
const setupRegistroCombustibleAssociations = db => {
  if (db.RegistroCombustible && db.Vehiculo) {
    db.RegistroCombustible.belongsTo(db.Vehiculo, {
      foreignKey: 'vehiculoId',
      as: 'vehiculo',
    });

    db.Vehiculo.hasMany(db.RegistroCombustible, {
      foreignKey: 'vehiculoId',
      as: 'registrosCombustible',
    });
  }

  if (db.RegistroCombustible && db.Usuario) {
    db.RegistroCombustible.belongsTo(db.Usuario, {
      foreignKey: 'usuarioId',
      as: 'usuario',
    });

    db.Usuario.hasMany(db.RegistroCombustible, {
      foreignKey: 'usuarioId',
      as: 'registrosCombustible',
    });
  }
};

module.exports = setupAssociations;
