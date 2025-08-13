const db = require('../models');
const sequelize = db.sequelize;
const ordenTrabajoService = require('../services/ordenTrabajoService');
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

exports.getMantenimientoReport = async (req, res) => {
  try {
    const { fechaDesde, fechaHasta, vehiculoId } = req.query;

    let whereClause = {};

    if (fechaDesde && fechaHasta) {
      whereClause.fec_ini_ot = {
        [Op.between]: [new Date(fechaDesde), new Date(fechaHasta)],
      };
    }

    if (vehiculoId) {
      whereClause.vehiculoIdVehi = vehiculoId;
    }

    const ordenes = await OrdenTrabajo.findAll({
      where: whereClause,
      include: [
        {
          model: Vehiculo,
          as: 'vehiculo',
          attributes: ['patente', 'marca', 'modelo'],
        },
        {
          model: Usuario,
          as: 'encargado',
          attributes: ['pri_nom_usu', 'pri_ape_usu'],
        },
      ],
      order: [['fec_ini_ot', 'DESC']],
    });

    res.status(200).json(ordenes);
  } catch (error) {
    console.error('Error al generar el reporte de mantenimientos:', error);
    res
      .status(500)
      .json({ message: 'Error interno del servidor al generar el reporte' });
  }
};

exports.generarOtDesdePlan = async (req, res) => {
  console.log('Usuario desde token:', req.usuario);

  const { id_plan, id_vehi, id_usuario_solicitante } = req.body;

  if (!id_plan || !id_vehi || !id_usuario_solicitante) {
    return res.status(400).json({
      error:
        'Faltan datos requeridos: id_plan, id_vehi y id_usuario_solicitante son obligatorios.',
    });
  }

  const t = await sequelize.transaction();

  try {
    const vehiculo = await Vehiculo.findByPk(id_vehi);
    if (!vehiculo) {
      await t.rollback();
      return res.status(404).json({ error: 'Vehículo no encontrado.' });
    }

    const planificacion = await PlanificacionMantenimiento.findByPk(id_plan, {
      include: [{ model: TareaPlanificacion, as: 'tareas' }],
    });

    if (
      !planificacion ||
      !planificacion.tareas ||
      planificacion.tareas.length === 0
    ) {
      await t.rollback();
      return res.status(404).json({
        error: 'Planificación no encontrada o no tiene tareas asociadas.',
      });
    }
    const solicitante = await Usuario.findByPk(id_usuario_solicitante, {
      transaction: t,
    });
    if (!solicitante) {
      await t.rollback();
      return res.status(404).json({
        error: `El usuario solicitante con ID ${id_usuario_solicitante} extraído del token no fue encontrado en la base de datos.`,
      });
    }
    const vehiculoPlan = await VehiculoPlanificacion.findOne({
      where: {
        vehiculoIdVehi: id_vehi,
        planificacionMantenimientoIdPlan: id_plan,
      },
    });

    if (!vehiculoPlan) {
      await t.rollback();
      return res.status(404).json({
        error: 'La asociación entre el vehículo y el plan no existe.',
      });
    }
    let fechaParaOt = null;
    if (planificacion.fechaActivacion) {
      fechaParaOt = `${planificacion.fechaActivacion}T00:00:00`;
    }
    const nuevaOt = await OrdenTrabajo.create(
      {
        km_ot: vehiculo.kmVehi,
        descripcion_ot: `OT generada desde el plan: "${planificacion.descPlan}"`,
        fec_ini_ot: fechaParaOt,
        vehiculoIdVehi: id_vehi,
        usuarioIdUsuSolicitante: id_usuario_solicitante,
        vehiculoPlanificacionVehiculoIdVehi: id_vehi,
        vehiculoPlanificacionPlanIdPlan: id_plan,
      },
      { transaction: t }
    );

    const detallesParaCrear = planificacion.tareas.map(tarea => ({
      desc_det: tarea.nomTareaPlan,
      ordenTrabajoIdOt: nuevaOt.id_ot,
    }));

    await DetalleOt.bulkCreate(detallesParaCrear, { transaction: t });

    await t.commit();
    res.status(201).json({
      message: 'Orden de Trabajo generada con éxito.',
      id_ot: nuevaOt.id_ot,
    });
  } catch (error) {
    await t.rollback();
    console.error('Error al generar la Orden de Trabajo:', error);
    res.status(500).json({
      error: 'Error interno del servidor al generar la OT.',
      details: error.message || error,
    });
  }
};

exports.listarOrdenesTrabajo = async (req, res) => {
  try {
    const ordenes = await OrdenTrabajo.findAll({
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
      ],
      order: [['fec_ini_ot', 'DESC']],
    });
    res.status(200).json(ordenes);
  } catch (error) {
    console.error('Error al listar las órdenes de trabajo:', error);
    res.status(500).send('Error interno del servidor');
  }
};

exports.getOrdenTrabajoPorId = async (req, res) => {
  const { id } = req.params;
  try {
    const ordenTrabajo = await OrdenTrabajo.findByPk(id, {
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
          attributes: ['id_usu', 'pri_nom_usu', 'pri_ape_usu'],
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
      return res
        .status(404)
        .json({ message: 'Orden de trabajo no encontrada' });
    }

    res.json(ordenTrabajo);
  } catch (error) {
    console.error('Error al obtener la orden de trabajo:', error);
    res
      .status(500)
      .json({ message: 'Error interno del servidor', error: error.message });
  }
};

exports.getOrdenesPorTecnico = async (req, res) => {
  try {
    const { tecnicoId } = req.params;

    const ordenes = await OrdenTrabajo.findAll({
      include: [
        {
          model: DetalleOt,
          as: 'detalles',

          where: { usuarioIdUsuTecnico: tecnicoId },
          required: true,
        },
        {
          model: Vehiculo,
          as: 'vehiculo',
          attributes: ['patente', 'marca', 'modelo'],
        },
      ],
      order: [['fec_ini_ot', 'DESC']],
    });

    res.status(200).json(ordenes);
  } catch (error) {
    console.error(
      'Error al obtener órdenes de trabajo para el técnico:',
      error
    );
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

exports.actualizarDetallesOt = async (req, res) => {
  const { id: idOt } = req.params;
  const { km_ot, descripcion_ot, detalles } = req.body;

  if (!Array.isArray(detalles)) {
    return res.status(400).json({
      error: 'Formato de datos incorrecto. Se espera un array de "detalles".',
    });
  }

  const t = await sequelize.transaction();
  try {
    if (km_ot !== undefined && descripcion_ot !== undefined) {
      await OrdenTrabajo.update(
        {
          km_ot: km_ot,
          descripcion_ot: descripcion_ot,
        },
        {
          where: { id_ot: idOt },
          transaction: t,
        }
      );
    }

    for (const detalle of detalles) {
      // Obtener el detalle actual de la base de datos para comparar cambios
      const detalleActual = await DetalleOt.findOne({
        where: {
          id_det: detalle.id_det,
          ordenTrabajoIdOt: idOt,
        },
        transaction: t,
      });

      if (!detalleActual) {
        throw new Error(`Detalle con ID ${detalle.id_det} no encontrado`);
      }

      const dataToUpdate = {
        checklist: detalle.checklist,
      };

      // Si se está asignando un técnico por primera vez, establecer fecha de inicio
      if (
        detalle.usuario_id_usu_tecnico &&
        !detalleActual.usuario_id_usu_tecnico
      ) {
        dataToUpdate.usuario_id_usu_tecnico = detalle.usuario_id_usu_tecnico;
        dataToUpdate.fec_ini_det = new Date(); // Fecha actual cuando se asigna el técnico
      } else if (detalle.usuario_id_usu_tecnico) {
        // Si ya había un técnico asignado, solo actualizar el técnico
        dataToUpdate.usuario_id_usu_tecnico = detalle.usuario_id_usu_tecnico;
      }

      // Si la tarea se marca como completada por primera vez, establecer fecha de fin y calcular duración
      if (detalle.checklist && !detalleActual.checklist) {
        const fechaFin = new Date();
        dataToUpdate.fec_fin_det = fechaFin;

        // Calcular duración real en minutos si hay fecha de inicio
        if (detalleActual.fec_ini_det) {
          const fechaInicio = new Date(detalleActual.fec_ini_det);
          const duracionMs = fechaFin.getTime() - fechaInicio.getTime();
          const duracionMinutos = Math.round(duracionMs / (1000 * 60)); // Convertir a minutos
          dataToUpdate.duracion_real_det = duracionMinutos;
        }
      }
      // Si se desmarca la tarea (checklist = false), limpiar fecha de fin y duración
      else if (!detalle.checklist && detalleActual.checklist) {
        dataToUpdate.fec_fin_det = null;
        dataToUpdate.duracion_real_det = null;
      }

      await DetalleOt.update(dataToUpdate, {
        where: {
          id_det: detalle.id_det,
          ordenTrabajoIdOt: idOt,
        },
        transaction: t,
      });
    }

    await t.commit();
    res.status(200).json({ message: 'Cambios guardados con éxito.' });
  } catch (error) {
    await t.rollback();
    console.error('Error al actualizar la OT:', error);
    res
      .status(500)
      .json({ error: 'Error interno del servidor al actualizar la OT.' });
  }
};

exports.actualizarEstadoOt = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado_ot, usuario_id_usu_encargado } = req.body;

    if (!estado_ot) {
      return res.status(400).json({
        message: 'El campo estado_ot es requerido.',
      });
    }

    const resultado = await ordenTrabajoService.actualizarEstadoOt(
      parseInt(id),
      estado_ot,
      usuario_id_usu_encargado
    );

    res.status(200).json(resultado);
  } catch (error) {
    console.error('Error al actualizar el estado de la OT:', error);
    res.status(500).json({
      message: error.message || 'Error interno del servidor',
      error: error.message,
    });
  }
};

exports.rechazarOrdenTrabajo = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo_rechazo, usuario_id } = req.body;

    if (!motivo_rechazo || motivo_rechazo.trim().length === 0) {
      return res.status(400).json({
        message: 'El motivo del rechazo es obligatorio.',
      });
    }

    if (!usuario_id) {
      return res.status(400).json({
        message: 'El ID del usuario es obligatorio.',
      });
    }

    const resultado = await ordenTrabajoService.rechazarOrdenTrabajo(
      parseInt(id),
      motivo_rechazo.trim(),
      parseInt(usuario_id)
    );

    res.status(200).json(resultado);
  } catch (error) {
    console.error('Error al rechazar la OT:', error);
    res.status(500).json({
      message: error.message || 'Error interno del servidor',
      error: error.message,
    });
  }
};
exports.generarOtsParaPlanBulk = async (req, res) => {
  // 1. Extraer los datos enviados desde el nuevo método del ApiService
  const { id_plan, vehiculos_ids, id_usuario_solicitante } = req.body;

  // 2. Validar que los datos requeridos estén presentes
  if (
    !id_plan ||
    !vehiculos_ids ||
    !Array.isArray(vehiculos_ids) ||
    vehiculos_ids.length === 0
  ) {
    return res.status(400).json({
      msg: 'Faltan datos requeridos: id_plan y un array de vehiculos_ids son obligatorios.',
    });
  }
  if (!id_usuario_solicitante) {
    return res
      .status(400)
      .json({ msg: 'El ID del usuario solicitante es obligatorio.' });
  }

  // 3. Iniciar una transacción para asegurar la integridad de los datos
  const transaction = await sequelize.transaction();

  try {
    // Buscar la planificación y sus tareas una sola vez
    const planificacion = await PlanificacionMantenimiento.findByPk(id_plan, {
      include: [{ model: TareaPlanificacion, as: 'tareas' }],
      transaction,
    });

    if (
      !planificacion ||
      !planificacion.tareas ||
      planificacion.tareas.length === 0
    ) {
      await transaction.rollback();
      return res.status(404).json({
        msg: 'Planificación no encontrada o no tiene tareas asociadas.',
      });
    }

    // 4. Iniciar un bucle para procesar cada vehículo
    for (const vehiculoId of vehiculos_ids) {
      const vehiculo = await Vehiculo.findByPk(vehiculoId, { transaction });
      if (!vehiculo) {
        // Si un vehículo no existe, la transacción entera debe fallar
        throw new Error(`El vehículo con ID ${vehiculoId} no fue encontrado.`);
      }

      // Crear la Orden de Trabajo para este vehículo
      const nuevaOt = await OrdenTrabajo.create(
        {
          km_ot: vehiculo.kmVehi,
          descripcion_ot: `OT generada desde el plan: "${planificacion.descPlan}"`,
          fec_ini_ot: new Date(),
          vehiculoIdVehi: vehiculoId,
          usuarioIdUsuSolicitante: id_usuario_solicitante,
        },
        { transaction }
      );

      // Crear los detalles para esta nueva OT
      const detallesParaCrear = planificacion.tareas.map(tarea => ({
        desc_det: tarea.nomTareaPlan,
        ordenTrabajoIdOt: nuevaOt.id_ot,
      }));
      await DetalleOt.bulkCreate(detallesParaCrear, { transaction });

      // Actualizar el estado del vehículo a 'mantenimiento'
      await Vehiculo.update(
        { estadoVehi: 'mantenimiento' },
        { where: { idVehi: vehiculoId }, transaction }
      );
    }

    // 5. Si el bucle se completa sin errores, confirmar todos los cambios
    await transaction.commit();

    res.status(201).json({
      message: `${vehiculos_ids.length} Órden(es) de Trabajo generada(s) con éxito.`,
    });
  } catch (error) {
    // 6. Si algo falla, revertir todos los cambios
    await transaction.rollback();
    console.error('Error en la generación masiva de OTs:', error);
    res.status(500).json({
      msg: 'Error interno del servidor al generar las OTs.',
      error: error.message,
    });
  }
};
