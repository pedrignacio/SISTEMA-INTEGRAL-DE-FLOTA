// backend/services/planificacionService.js
const db = require('../models');
const { ESTADOS_ORDEN_TRABAJO } = require('../constants/enums');
const ordenTrabajoService = require('./ordenTrabajoService');
const {
  PlanificacionMantenimiento,
  TareaPlanificacion,
  Vehiculo,
  VehiculoPlanificacion,
  Usuario,
} = db;

class PlanificacionService {
  /**
   * Crea una planificación de mantenimiento y genera OTs automáticamente
   */
  async crearPlanificacionConOts(datosPlanificacion, idUsuarioSolicitante) {
    const transaction = await db.sequelize.transaction();

    try {
      // 1. Crear la planificación de mantenimiento
      const nuevaPlanificacion = await this._crearPlanificacion(
        datosPlanificacion,
        transaction
      );

      // 2. Crear las tareas asociadas
      await this._crearTareasPlanificacion(
        nuevaPlanificacion.idPlan,
        datosPlanificacion.tareas,
        transaction
      );

      // 3. Asociar vehículos al plan
      await this._asociarVehiculosAlPlan(
        nuevaPlanificacion.idPlan,
        datosPlanificacion.vehiculosIds,
        transaction
      );

      // 4. Generar OTs automáticamente para todos los vehículos
      const resultadosOts = await this._generarOtsAutomaticas(
        nuevaPlanificacion.idPlan,
        datosPlanificacion.vehiculosIds,
        idUsuarioSolicitante,
        transaction
      );

      await transaction.commit();

      return {
        success: true,
        planificacion: nuevaPlanificacion,
        ordenesTrabajo: resultadosOts,
        message: `Planificación creada exitosamente con ${resultadosOts.length} órdenes de trabajo generadas.`,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Obtener todas las planificaciones con información relacionada
   */
  async obtenerTodasLasPlanificaciones() {
    try {
      const planificaciones = await PlanificacionMantenimiento.findAll({
        include: [
          {
            model: TareaPlanificacion,
            as: 'tareas',
            attributes: ['id_tarea_plan', 'nomTareaPlan', 'descTareaPlan'],
          },
          {
            model: Vehiculo,
            as: 'vehiculosEnPlan',
            attributes: ['idVehi', 'patente', 'marca', 'modelo'],
            through: {
              attributes: [
                'fecUltPlan',
                'kmUltPlan',
                'fecProxPlan',
                'kmProxPlan',
              ],
            },
          },
        ],
        order: [['createdAt', 'DESC']],
      });

      return planificaciones;
    } catch (error) {
      console.error('❌ Error al obtener planificaciones:', error);
      throw error;
    }
  }

  /**
   * Obtener una planificación por ID con toda su información relacionada
   */
  async obtenerPlanificacionPorId(idPlan) {
    try {
      const planificacion = await PlanificacionMantenimiento.findByPk(idPlan, {
        include: [
          {
            model: TareaPlanificacion,
            as: 'tareas',
            attributes: ['id_tarea_plan', 'nomTareaPlan', 'descTareaPlan'],
          },
          {
            model: Vehiculo,
            as: 'vehiculosEnPlan',
            attributes: ['idVehi', 'patente', 'marca', 'modelo'],
            through: {
              attributes: [
                'fecUltPlan',
                'kmUltPlan',
                'fecProxPlan',
                'kmProxPlan',
              ],
            },
          },
        ],
      });

      return planificacion;
    } catch (error) {
      console.error('❌ Error al obtener planificación por ID:', error);
      throw error;
    }
  }

  /**
   * Actualizar una planificación existente
   */
  async actualizarPlanificacion(idPlan, datosActualizacion) {
    const transaction = await db.sequelize.transaction();

    try {
      // Verificar que la planificación existe
      const planificacionExistente = await PlanificacionMantenimiento.findByPk(
        idPlan
      );
      if (!planificacionExistente) {
        throw new Error('Planificación no encontrada');
      }

      // Actualizar datos básicos de la planificación
      const { tareas, vehiculosIds, ...datosPlanificacion } =
        datosActualizacion;

      await PlanificacionMantenimiento.update(datosPlanificacion, {
        where: { idPlan: idPlan },
        transaction,
      });

      // Actualizar tareas si se proporcionaron
      if (tareas && Array.isArray(tareas)) {
        await this._actualizarTareasPlanificacion(idPlan, tareas, transaction);
      }

      // Actualizar vehículos si se proporcionaron
      if (vehiculosIds && Array.isArray(vehiculosIds)) {
        await this._actualizarVehiculosDelPlan(
          idPlan,
          vehiculosIds,
          transaction
        );
      }

      await transaction.commit();

      // Retornar la planificación actualizada
      return await this.obtenerPlanificacionPorId(idPlan);
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error al actualizar planificación:', error);
      throw error;
    }
  }

  /**
   * Eliminar una planificación
   */
  async eliminarPlanificacion(idPlan) {
    const transaction = await db.sequelize.transaction();

    try {
      // Verificar que la planificación existe
      const planificacionExistente = await PlanificacionMantenimiento.findByPk(
        idPlan
      );
      if (!planificacionExistente) {
        throw new Error('Planificación no encontrada');
      }

      // Eliminar tareas asociadas
      await TareaPlanificacion.destroy({
        where: { planificacionMantenimientoIdPlan: idPlan },
        transaction,
      });

      // Eliminar asociaciones con vehículos
      await VehiculoPlanificacion.destroy({
        where: { planificacionMantenimientoIdPlan: idPlan },
        transaction,
      });

      // Eliminar la planificación
      await PlanificacionMantenimiento.destroy({
        where: { idPlan: idPlan },
        transaction,
      });

      await transaction.commit();
      return true;
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error al eliminar planificación:', error);
      throw error;
    }
  }

  // Métodos privados

  async _crearPlanificacion(datos, transaction) {
    const nuevaPlanificacion = await PlanificacionMantenimiento.create(
      {
        descPlan: datos.descPlan,
        frecuencia: datos.frecuencia,
        tipoFrecuencia: datos.tipoFrecuencia,
        fechaActivacion: datos.fechaActivacion,
        esActivoPlan: datos.esActivoPlan,
        esPreventivo: datos.esPreventivo,
      },
      { transaction }
    );

    console.log('📝 Planificación creada con ID:', nuevaPlanificacion.idPlan);

    return nuevaPlanificacion;
  }

  async _crearTareasPlanificacion(idPlan, tareas, transaction) {
    console.log('🔧 Creando tareas con ID de planificación:', idPlan);
    const tareasParaCrear = tareas.map(tarea => ({
      nomTareaPlan: tarea.nomTareaPlan,
      descTareaPlan: tarea.descTareaPlan || null,
      planificacionMantenimientoIdPlan: idPlan,
    }));

    console.log('🔧 Tareas a crear:', JSON.stringify(tareasParaCrear, null, 2));

    return await TareaPlanificacion.bulkCreate(tareasParaCrear, {
      transaction,
    });
  }

  async _asociarVehiculosAlPlan(idPlan, vehiculosIds, transaction) {
    const asociaciones = vehiculosIds.map(vehiculoId => ({
      vehiculoIdVehi: vehiculoId,
      planificacionMantenimientoIdPlan: idPlan,
      fecUltMant: null,
      kmUltMant: null,
      fecProxMant: null,
      kmProxPlan: null,
    }));

    return await VehiculoPlanificacion.bulkCreate(asociaciones, {
      transaction,
    });
  }

  async _generarOtsAutomaticas(
    idPlan,
    vehiculosIds,
    idUsuarioSolicitante,
    transaction
  ) {
    const resultados = [];

    for (const vehiculoId of vehiculosIds) {
      try {
        // Usar el servicio de órdenes de trabajo existente
        const datosOt = {
          idPlan: idPlan,
          id_vehi: vehiculoId,
          id_usuario_solicitante: idUsuarioSolicitante,
        };

        // Crear OT individual
        const nuevaOt = await this._crearOtIndividual(datosOt, transaction);

        resultados.push({
          vehiculoId,
          success: true,
          id_ot: nuevaOt.id_ot,
          estado: 'sin_iniciar',
        });
      } catch (error) {
        console.error(
          `Error creando OT para vehículo ${vehiculoId}:`,
          error.message
        );
        resultados.push({
          vehiculoId,
          success: false,
          error: error.message,
        });
      }
    }

    return resultados;
  }

  async _crearOtIndividual(datosOt, transaction) {
    const { idPlan, id_vehi, id_usuario_solicitante } = datosOt;

    // Validar vehículo
    const vehiculo = await Vehiculo.findByPk(id_vehi, { transaction });
    if (!vehiculo) {
      throw new Error(`Vehículo con ID ${id_vehi} no encontrado.`);
    }

    // Validar planificación y obtener tareas
    const planificacion = await PlanificacionMantenimiento.findByPk(idPlan, {
      include: [{ model: TareaPlanificacion, as: 'tareas' }],
      transaction,
    });

    if (!planificacion) {
      throw new Error('Planificación no encontrada.');
    }

    // Validar usuario solicitante
    const solicitante = await Usuario.findByPk(id_usuario_solicitante, {
      transaction,
    });
    if (!solicitante) {
      throw new Error('Usuario solicitante no encontrado.');
    }

    // Crear la orden de trabajo
    let fechaParaOt = null;
    if (planificacion.fechaActivacion) {
      fechaParaOt = `${planificacion.fechaActivacion}T00:00:00`;
    }

    const nuevaOt = await db.OrdenTrabajo.create(
      {
        km_ot: vehiculo.kmVehi || 0,
        descripcion_ot: `OT generada automáticamente desde planificación: "${planificacion.descPlan}"`,
        fec_ini_ot: fechaParaOt || new Date(),
        estado_ot: ESTADOS_ORDEN_TRABAJO.SIN_INICIAR,
        vehiculoIdVehi: id_vehi,
        usuarioIdUsuSolicitante: id_usuario_solicitante,
        vehiculoPlanificacionVehiculoIdVehi: id_vehi,
        vehiculoPlanificacionPlanIdPlan: idPlan,
      },
      { transaction }
    );

    // Crear detalles de la OT basados en las tareas del plan
    if (planificacion.tareas && planificacion.tareas.length > 0) {
      const detallesParaCrear = planificacion.tareas.map(tarea => ({
        desc_det: tarea.nomTareaPlan,
        checklist: false,
        es_activo_det: true,
        ordenTrabajoIdOt: nuevaOt.id_ot,
      }));

      await db.DetalleOt.bulkCreate(detallesParaCrear, { transaction });
    }

    return nuevaOt;
  }

  async _actualizarTareasPlanificacion(idPlan, nuevasTareas, transaction) {
    // Eliminar tareas existentes
    await TareaPlanificacion.destroy({
      where: { planificacionMantenimientoIdPlan: idPlan },
      transaction,
    });

    // Crear nuevas tareas
    return await this._crearTareasPlanificacion(
      idPlan,
      nuevasTareas,
      transaction
    );
  }

  async _actualizarVehiculosDelPlan(idPlan, nuevosVehiculos, transaction) {
    // Eliminar asociaciones existentes
    await VehiculoPlanificacion.destroy({
      where: { planificacionMantenimientoIdPlan: idPlan },
      transaction,
    });

    // Crear nuevas asociaciones
    return await this._asociarVehiculosAlPlan(
      idPlan,
      nuevosVehiculos,
      transaction
    );
  }
}

module.exports = new PlanificacionService();
