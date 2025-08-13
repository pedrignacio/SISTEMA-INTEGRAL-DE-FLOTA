// backend/services/ordenTrabajoService.js
const db = require('../models');
const {
  ESTADOS_ORDEN_TRABAJO,
  ESTADOS_VEHICULO,
} = require('../constants/enums');
const {
  OrdenTrabajo,
  DetalleOt,
  PlanificacionMantenimiento,
  Vehiculo,
  VehiculoPlanificacion,
  Usuario,
  TareaPlanificacion,
} = db;
const { Op } = require('sequelize');

class OrdenTrabajoService {
  /**
   * Genera una orden de trabajo desde un plan de mantenimiento
   */
  async generarOtDesdePlan(datosOt) {
    const { id_plan, id_vehi, id_usuario_solicitante } = datosOt;

    // Validar datos requeridos
    this._validarDatosRequeridos({ id_plan, id_vehi, id_usuario_solicitante });

    const transaction = await db.sequelize.transaction();

    try {
      // Validar entidades relacionadas
      const { vehiculo, planificacion, solicitante, vehiculoPlan } =
        await this._validarEntidadesRelacionadas(
          id_plan,
          id_vehi,
          id_usuario_solicitante,
          transaction
        );

      // Crear la orden de trabajo
      const nuevaOt = await this._crearOrdenTrabajo(
        vehiculo,
        planificacion,
        id_vehi,
        id_usuario_solicitante,
        id_plan,
        transaction
      );

      // Crear los detalles de la OT basados en las tareas del plan
      await this._crearDetallesOt(
        planificacion.tareas,
        nuevaOt.id_ot,
        transaction
      );

      await transaction.commit();

      return {
        success: true,
        message: 'Orden de Trabajo generada con éxito.',
        id_ot: nuevaOt.id_ot,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Genera múltiples órdenes de trabajo para varios vehículos
   */
  async generarOtsParaPlanBulk(datosBulk) {
    const { id_plan, vehiculos_ids, id_usuario_solicitante } = datosBulk;

    this._validarDatosBulk({ id_plan, vehiculos_ids, id_usuario_solicitante });

    const transaction = await db.sequelize.transaction();

    try {
      // Validar plan y que tenga tareas
      const planificacion = await this._validarPlanificacion(
        id_plan,
        transaction
      );

      // Validar usuario solicitante
      await this._validarUsuario(id_usuario_solicitante, transaction);

      const resultados = [];

      // Procesar cada vehículo
      for (const vehiculoId of vehiculos_ids) {
        try {
          const resultado = await this._procesarVehiculoParaOt(
            vehiculoId,
            id_plan,
            id_usuario_solicitante,
            planificacion,
            transaction
          );
          resultados.push(resultado);
        } catch (error) {
          console.error(
            `Error procesando vehículo ${vehiculoId}:`,
            error.message
          );
          resultados.push({
            vehiculoId,
            success: false,
            error: error.message,
          });
        }
      }

      await transaction.commit();

      return {
        success: true,
        message: `Proceso completado. ${
          resultados.filter(r => r.success).length
        } OTs generadas de ${vehiculos_ids.length} vehículos.`,
        resultados,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Lista todas las órdenes de trabajo con sus relaciones
   */
  async listarOrdenesTrabajo(filtros = {}) {
    const whereClause = this._construirFiltrosWhere(filtros);

    return await OrdenTrabajo.findAll({
      where: whereClause,
      include: [
        {
          model: Vehiculo,
          as: 'vehiculo',
          attributes: ['patente', 'marca', 'modelo'],
        },
        {
          model: Usuario,
          as: 'solicitante',
          attributes: ['pri_nom_usu', 'pri_ape_usu'],
        },
        {
          model: Usuario,
          as: 'encargado',
          attributes: ['pri_nom_usu', 'pri_ape_usu'],
        },
      ],
      order: [['fec_ini_ot', 'DESC']],
    });
  }

  /**
   * Obtiene una orden de trabajo por ID con todos sus detalles
   */
  async obtenerOrdenTrabajoPorId(id) {
    console.log(`🔍 Buscando OT con ID: ${id}`);

    const ordenTrabajo = await OrdenTrabajo.findByPk(id, {
      include: [
        {
          model: Vehiculo,
          as: 'vehiculo',
          attributes: ['id_vehi', 'patente', 'marca', 'modelo'],
        },
        {
          model: Usuario,
          as: 'solicitante',
          attributes: ['pri_nom_usu', 'pri_ape_usu'],
        },
        {
          model: Usuario,
          as: 'encargado',
          attributes: ['pri_nom_usu', 'pri_ape_usu'],
        },
        {
          model: DetalleOt,
          as: 'detalles',
          include: [
            {
              model: Usuario,
              as: 'tecnico',
              attributes: ['id_usu', 'pri_nom_usu', 'pri_ape_usu'],
            },
          ],
        },
      ],
    });

    if (!ordenTrabajo) {
      throw new Error('Orden de trabajo no encontrada');
    }

    // Añadir información de depuración
    console.log(`📋 OT ${ordenTrabajo.id_ot} encontrada:`, {
      id_ot: ordenTrabajo.id_ot,
      estado_ot: ordenTrabajo.estado_ot,
      usuario_id_usu_encargado: ordenTrabajo.usuario_id_usu_encargado,
      tieneEncargado: ordenTrabajo.encargado ? 'Sí' : 'No',
      encargadoInfo: ordenTrabajo.encargado
        ? {
            id: ordenTrabajo.encargado.id_usu,
            nombre: `${ordenTrabajo.encargado.pri_nom_usu} ${ordenTrabajo.encargado.pri_ape_usu}`,
          }
        : 'No hay encargado',
    });

    // Agregar el vehiculo_id_vehi directamente en la respuesta para facilitar el acceso desde el frontend
    const result = ordenTrabajo.toJSON();
    if (result.vehiculo && result.vehiculo.id_vehi) {
      result.vehiculo_id_vehi = result.vehiculo.id_vehi;
    }

    return result;
  }

  /**
   * Actualiza el estado de una orden de trabajo con validación de transiciones
   */
  async actualizarEstadoOt(
    id,
    nuevoEstado,
    encargadoId = null,
    motivoRechazo = null
  ) {
    // Validar que el estado sea válido
    if (!Object.values(ESTADOS_ORDEN_TRABAJO).includes(nuevoEstado)) {
      throw new Error(`Estado '${nuevoEstado}' no es válido`);
    }

    // Obtener la OT actual para validar transiciones
    const otActual = await OrdenTrabajo.findByPk(id);
    if (!otActual) {
      throw new Error('Orden de trabajo no encontrada');
    }

    // Ver todos los campos disponibles en el modelo
    console.log('🔍 CAMPOS DEL MODELO OT:', Object.keys(otActual.dataValues));

    // Validar transiciones de estado permitidas
    this._validarTransicionEstado(otActual.estado_ot, nuevoEstado);

    // Validar estado del vehículo si se intenta poner la OT en progreso
    if (nuevoEstado === ESTADOS_ORDEN_TRABAJO.EN_PROGRESO) {
      await this._validarEstadoVehiculoParaOt(otActual.vehiculoIdVehi);
    }

    const updateData = { estado_ot: nuevoEstado };

    if (encargadoId) {
      // Validar que el encargado existe
      const encargado = await Usuario.findByPk(encargadoId);
      if (!encargado) {
        throw new Error('Usuario encargado no encontrado');
      }
      // Usar el campo de la base de datos (campo real)
      updateData.usuario_id_usu_encargado = encargadoId;
      console.log(
        `Asignando encargado ID: ${encargadoId} a la orden de trabajo, campo: usuario_id_usu_encargado`
      );
    }

    // Si se completa la OT, establecer fecha de fin
    if (nuevoEstado === ESTADOS_ORDEN_TRABAJO.COMPLETADA) {
      updateData.fec_fin_ot = new Date();
    }

    // Si se rechaza la OT, agregar motivo en descripción
    if (nuevoEstado === ESTADOS_ORDEN_TRABAJO.RECHAZADO && motivoRechazo) {
      const descripcionActual = otActual.descripcion_ot || '';
      updateData.descripcion_ot = `${descripcionActual}\n\nRECHAZADO: ${motivoRechazo}`;
    }

    // Mostrar datos antes de la actualización para depuración
    console.log('📊 DATOS PARA ACTUALIZAR:', {
      id_ot: id,
      updateData,
      encargadoId,
    });

    console.log(
      'SQL que se ejecutará aproximadamente:',
      `UPDATE orden_trabajo SET estado_ot = '${updateData.estado_ot}'` +
        (updateData.usuario_id_usu_encargado
          ? `, usuario_id_usu_encargado = ${updateData.usuario_id_usu_encargado}`
          : '') +
        (updateData.fec_fin_ot
          ? `, fec_fin_ot = '${updateData.fec_fin_ot.toISOString()}'`
          : '') +
        (updateData.descripcion_ot
          ? `, descripcion_ot = '${updateData.descripcion_ot}'`
          : '') +
        ` WHERE id_ot = ${id}`
    );

    const [filasActualizadas] = await OrdenTrabajo.update(updateData, {
      where: { id_ot: id },
    });

    console.log(`🔄 Filas actualizadas: ${filasActualizadas}`);

    if (filasActualizadas === 0) {
      throw new Error('Orden de trabajo no encontrada');
    }

    // Verificar si se guardó correctamente
    const otActualizada = await OrdenTrabajo.findByPk(id, {
      raw: true, // Get the raw data to see all fields
    });
    console.log(
      '✅ OT DESPUÉS DE ACTUALIZAR (DATOS COMPLETOS):',
      otActualizada
    );

    return {
      success: true,
      message: this._getMensajeEstado(nuevoEstado),
      estadoAnterior: otActual.estado_ot,
      estadoNuevo: nuevoEstado,
    };
  }

  /**
   * Rechaza una orden de trabajo con motivo
   */
  async rechazarOrdenTrabajo(id, motivoRechazo, usuarioId) {
    if (!motivoRechazo || motivoRechazo.trim().length === 0) {
      throw new Error('El motivo del rechazo es obligatorio');
    }

    return await this.actualizarEstadoOt(
      id,
      ESTADOS_ORDEN_TRABAJO.RECHAZADO,
      usuarioId,
      motivoRechazo
    );
  }

  /**
   * Obtiene órdenes de trabajo asignadas a un técnico
   */
  async obtenerOrdenesPorTecnico(tecnicoId) {
    return await OrdenTrabajo.findAll({
      include: [
        {
          model: DetalleOt,
          as: 'detalles',
          where: { usuarioIdUsuTecnico: tecnicoId },
          include: [
            {
              model: Usuario,
              as: 'tecnico',
              attributes: ['id_usu', 'pri_nom_usu', 'pri_ape_usu'],
            },
          ],
        },
        {
          model: Vehiculo,
          as: 'vehiculo',
          attributes: ['patente', 'marca', 'modelo'],
        },
      ],
      order: [['fec_ini_ot', 'DESC']],
    });
  }

  /**
   * Actualiza los detalles de una orden de trabajo
   */
  async actualizarDetallesOt(id, datosActualizacion) {
    const { km_ot, descripcion_ot, detalles } = datosActualizacion;

    const transaction = await db.sequelize.transaction();

    try {
      // Verificar que la OT existe
      const ordenTrabajo = await OrdenTrabajo.findByPk(id, { transaction });
      if (!ordenTrabajo) {
        throw new Error('Orden de trabajo no encontrada');
      }

      // Actualizar datos principales de la OT
      const updateDataOt = {};
      if (km_ot !== undefined) updateDataOt.km_ot = km_ot;
      if (descripcion_ot !== undefined)
        updateDataOt.descripcion_ot = descripcion_ot;

      if (Object.keys(updateDataOt).length > 0) {
        await OrdenTrabajo.update(updateDataOt, {
          where: { id_ot: id },
          transaction,
        });
      }

      // Actualizar detalles si se proporcionan
      if (detalles && Array.isArray(detalles)) {
        for (const detalle of detalles) {
          const { id_det, checklist, usuario_id_usu_tecnico } = detalle;

          if (!id_det) continue;

          const updateDataDetalle = {};
          if (checklist !== undefined) updateDataDetalle.checklist = checklist;
          if (detalle.desc_det !== undefined)
            updateDataDetalle.desc_det = detalle.desc_det; // Permitir actualizar desc_det
          if (usuario_id_usu_tecnico !== undefined) {
            // Validar que el técnico existe si se proporciona un ID
            if (usuario_id_usu_tecnico !== null) {
              const tecnico = await Usuario.findByPk(usuario_id_usu_tecnico, {
                transaction,
              });
              if (!tecnico) {
                throw new Error(
                  `Usuario técnico con ID ${usuario_id_usu_tecnico} no encontrado`
                );
              }
            }
            updateDataDetalle.usuarioIdUsuTecnico = usuario_id_usu_tecnico;
          }

          if (Object.keys(updateDataDetalle).length > 0) {
            await DetalleOt.update(updateDataDetalle, {
              where: { id_det: id_det },
              transaction,
            });
          }
        }
      }

      await transaction.commit();

      return {
        success: true,
        message: 'Detalles de la orden de trabajo actualizados correctamente',
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Métodos privados para organizar la lógica

  _validarDatosRequeridos(datos) {
    const { id_plan, id_vehi, id_usuario_solicitante } = datos;
    if (!id_plan || !id_vehi || !id_usuario_solicitante) {
      throw new Error(
        'Faltan datos requeridos: id_plan, id_vehi y id_usuario_solicitante son obligatorios.'
      );
    }
  }

  _validarDatosBulk(datos) {
    const { id_plan, vehiculos_ids, id_usuario_solicitante } = datos;
    if (
      !id_plan ||
      !vehiculos_ids ||
      !Array.isArray(vehiculos_ids) ||
      vehiculos_ids.length === 0 ||
      !id_usuario_solicitante
    ) {
      throw new Error(
        'Faltan datos requeridos para la generación masiva de OTs.'
      );
    }
  }

  async _validarEntidadesRelacionadas(
    id_plan,
    id_vehi,
    id_usuario_solicitante,
    transaction
  ) {
    // Validar vehículo
    const vehiculo = await Vehiculo.findByPk(id_vehi, { transaction });
    if (!vehiculo) {
      throw new Error('Vehículo no encontrado.');
    }

    // Validar planificación y sus tareas
    const planificacion = await PlanificacionMantenimiento.findByPk(id_plan, {
      include: [{ model: TareaPlanificacion, as: 'tareas' }],
      transaction,
    });

    if (
      !planificacion ||
      !planificacion.tareas ||
      planificacion.tareas.length === 0
    ) {
      throw new Error(
        'Planificación no encontrada o no tiene tareas asociadas.'
      );
    }

    // Validar usuario solicitante
    const solicitante = await Usuario.findByPk(id_usuario_solicitante, {
      transaction,
    });
    if (!solicitante) {
      throw new Error(
        `El usuario solicitante con ID ${id_usuario_solicitante} no fue encontrado.`
      );
    }

    // Validar asociación vehículo-plan
    const vehiculoPlan = await VehiculoPlanificacion.findOne({
      where: {
        vehiculoIdVehi: id_vehi,
        planificacionMantenimientoIdPlan: id_plan,
      },
      transaction,
    });

    if (!vehiculoPlan) {
      throw new Error('La asociación entre el vehículo y el plan no existe.');
    }

    return { vehiculo, planificacion, solicitante, vehiculoPlan };
  }

  async _validarPlanificacion(id_plan, transaction) {
    const planificacion = await PlanificacionMantenimiento.findByPk(id_plan, {
      include: [{ model: TareaPlanificacion, as: 'tareas' }],
      transaction,
    });

    if (!planificacion) {
      throw new Error('Planificación de mantenimiento no encontrada.');
    }

    if (!planificacion.tareas || planificacion.tareas.length === 0) {
      throw new Error('La planificación no tiene tareas asociadas.');
    }

    return planificacion;
  }

  async _validarUsuario(id_usuario, transaction) {
    const usuario = await Usuario.findByPk(id_usuario, { transaction });
    if (!usuario) {
      throw new Error(`Usuario con ID ${id_usuario} no encontrado.`);
    }
    return usuario;
  }

  async _crearOrdenTrabajo(
    vehiculo,
    planificacion,
    id_vehi,
    id_usuario_solicitante,
    id_plan,
    transaction
  ) {
    let fechaParaOt = null;
    if (planificacion.fechaActivacion) {
      fechaParaOt = `${planificacion.fechaActivacion}T00:00:00`;
    }

    return await OrdenTrabajo.create(
      {
        km_ot: vehiculo.kmVehi,
        descripcion_ot: `OT generada desde el plan: "${planificacion.descPlan}"`,
        fec_ini_ot: fechaParaOt,
        estado_ot: ESTADOS_ORDEN_TRABAJO.SIN_INICIAR,
        vehiculoIdVehi: id_vehi,
        usuarioIdUsuSolicitante: id_usuario_solicitante,
        vehiculoPlanificacionVehiculoIdVehi: id_vehi,
        vehiculoPlanificacionPlanIdPlan: id_plan,
      },
      { transaction }
    );
  }

  async _crearDetallesOt(tareas, id_ot, transaction) {
    const detallesParaCrear = tareas.map(tarea => ({
      desc_det: tarea.nomTareaPlan,
      checklist: false,
      es_activo_det: true,
      ordenTrabajoIdOt: id_ot,
    }));

    return await DetalleOt.bulkCreate(detallesParaCrear, { transaction });
  }

  async _procesarVehiculoParaOt(
    vehiculoId,
    id_plan,
    id_usuario_solicitante,
    planificacion,
    transaction
  ) {
    // Validar vehículo
    const vehiculo = await Vehiculo.findByPk(vehiculoId, { transaction });
    if (!vehiculo) {
      throw new Error(`Vehículo con ID ${vehiculoId} no encontrado.`);
    }

    // Validar asociación vehículo-plan
    const vehiculoPlan = await VehiculoPlanificacion.findOne({
      where: {
        vehiculoIdVehi: vehiculoId,
        planificacionMantenimientoIdPlan: id_plan,
      },
      transaction,
    });

    if (!vehiculoPlan) {
      throw new Error(
        `No existe asociación entre vehículo ${vehiculoId} y plan ${id_plan}.`
      );
    }

    // Crear OT
    const nuevaOt = await this._crearOrdenTrabajo(
      vehiculo,
      planificacion,
      vehiculoId,
      id_usuario_solicitante,
      id_plan,
      transaction
    );

    // Crear detalles
    await this._crearDetallesOt(
      planificacion.tareas,
      nuevaOt.id_ot,
      transaction
    );

    // Actualizar estado del vehículo
    await Vehiculo.update(
      { estadoVehi: ESTADOS_VEHICULO.MANTENIMIENTO },
      { where: { idVehi: vehiculoId }, transaction }
    );

    return {
      vehiculoId,
      success: true,
      id_ot: nuevaOt.id_ot,
      message: 'OT generada exitosamente',
    };
  }

  _construirFiltrosWhere(filtros) {
    const whereClause = {};

    if (filtros.fechaDesde && filtros.fechaHasta) {
      whereClause.fec_ini_ot = {
        [Op.between]: [
          new Date(filtros.fechaDesde),
          new Date(filtros.fechaHasta),
        ],
      };
    }

    if (filtros.vehiculoId) {
      whereClause.vehiculoIdVehi = filtros.vehiculoId;
    }

    if (filtros.estado) {
      whereClause.estado_ot = filtros.estado;
    }

    if (filtros.prioridad) {
      whereClause.prioridad = filtros.prioridad;
    }

    return whereClause;
  }

  /**
   * Valida las transiciones de estado permitidas
   */
  _validarTransicionEstado(estadoActual, nuevoEstado) {
    const transicionesPermitidas = {
      [ESTADOS_ORDEN_TRABAJO.SIN_INICIAR]: [
        ESTADOS_ORDEN_TRABAJO.EN_PROGRESO,
        ESTADOS_ORDEN_TRABAJO.RECHAZADO,
        ESTADOS_ORDEN_TRABAJO.CANCELADA,
      ],
      [ESTADOS_ORDEN_TRABAJO.EN_PROGRESO]: [
        ESTADOS_ORDEN_TRABAJO.COMPLETADA,
        ESTADOS_ORDEN_TRABAJO.CANCELADA,
      ],
      [ESTADOS_ORDEN_TRABAJO.COMPLETADA]: [], // Estado final
      [ESTADOS_ORDEN_TRABAJO.RECHAZADO]: [], // Estado final
      [ESTADOS_ORDEN_TRABAJO.CANCELADA]: [], // Estado final
    };

    const estadosPermitidos = transicionesPermitidas[estadoActual] || [];

    if (!estadosPermitidos.includes(nuevoEstado)) {
      throw new Error(
        `No se puede cambiar de estado '${estadoActual}' a '${nuevoEstado}'. ` +
          `Estados permitidos: ${estadosPermitidos.join(', ')}`
      );
    }
  }

  /**
   * Obtiene el mensaje apropiado según el estado
   */
  _getMensajeEstado(estado) {
    const mensajes = {
      [ESTADOS_ORDEN_TRABAJO.SIN_INICIAR]: 'Orden de trabajo creada',
      [ESTADOS_ORDEN_TRABAJO.EN_PROGRESO]: 'Orden de trabajo iniciada',
      [ESTADOS_ORDEN_TRABAJO.COMPLETADA]:
        'Orden de trabajo completada exitosamente',
      [ESTADOS_ORDEN_TRABAJO.RECHAZADO]: 'Orden de trabajo rechazada',
      [ESTADOS_ORDEN_TRABAJO.CANCELADA]: 'Orden de trabajo cancelada',
    };

    return mensajes[estado] || 'Estado actualizado correctamente';
  }

  /**
   * Valida que el vehículo esté disponible para iniciar una OT
   */
  async _validarEstadoVehiculoParaOt(vehiculoId) {
    if (!vehiculoId) {
      throw new Error('ID de vehículo no proporcionado');
    }

    const vehiculo = await Vehiculo.findByPk(vehiculoId);
    if (!vehiculo) {
      throw new Error('Vehículo no encontrado');
    }

    if (vehiculo.estadoVehi === 'mantenimiento') {
      throw new Error(
        `El vehículo ${vehiculo.patente} está actualmente en mantenimiento. No se puede iniciar una nueva orden de trabajo hasta que se complete el mantenimiento actual.`
      );
    }

    if (vehiculo.estadoVehi === 'inactivo') {
      throw new Error(
        `El vehículo ${vehiculo.patente} está inactivo. No se pueden realizar órdenes de trabajo en vehículos inactivos.`
      );
    }

    console.log(
      `✅ Vehículo ${vehiculo.patente} disponible para iniciar OT (estado: ${vehiculo.estadoVehi})`
    );
  }
}

module.exports = new OrdenTrabajoService();
