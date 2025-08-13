// backend/routes/asignacionesRecorrido.js
const express = require('express');
const router = express.Router();
const {
  AsignacionRecorrido,
  Vehiculo,
  Usuario,
  Ruta,
  sequelize,
} = require('../models');
const { Op } = require('sequelize');

// POST /api/asignaciones-recorrido - Crear una nueva asignación de recorrido
// POST /api/asignaciones-recorrido - Crear una nueva asignación de recorrido
router.post('/', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    let {
      fecIniRecor,
      fecFinRecor,
      kmIniRecor,
      notas,
      vehiculoIdVehi,
      usuarioIdUsu,
      rutaIdRuta,
      estadoAsig = 'asignado',
    } = req.body;

    if (!fecIniRecor || !vehiculoIdVehi || !usuarioIdUsu || !rutaIdRuta) {
      await t.rollback();
      return res
        .status(400)
        .json({
          message:
            'Fecha de inicio, vehículo, conductor y ruta plantilla son requeridos.',
        });
    }

    const vehiculo = await Vehiculo.findByPk(vehiculoIdVehi, {
      transaction: t,
    });
    if (!vehiculo) {
      await t.rollback();
      return res.status(404).json({ message: 'Vehículo no encontrado.' });
    }

    const conductor = await Usuario.findByPk(usuarioIdUsu, { transaction: t });
    if (!conductor || conductor.rol !== 'conductor') {
      await t.rollback();
      return res
        .status(404)
        .json({ message: 'El usuario no es un conductor válido.' });
    }

    if (fecFinRecor) {
      const asignacionVehiculoExistente = await AsignacionRecorrido.findOne({
        where: {
          vehiculo_id_vehi: vehiculoIdVehi,
          estadoAsig: { [Op.notIn]: ['completado', 'cancelado'] },
          [Op.or]: [
            { fec_ini_recor: { [Op.between]: [fecIniRecor, fecFinRecor] } },
            { fec_fin_recor: { [Op.between]: [fecIniRecor, fecFinRecor] } },
            {
              [Op.and]: [
                { fec_ini_recor: { [Op.lte]: fecIniRecor } },
                { fec_fin_recor: { [Op.gte]: fecFinRecor } },
              ],
            },
          ],
        },
        transaction: t,
      });

      if (asignacionVehiculoExistente) {
        await t.rollback();
        return res
          .status(409)
          .json({
            message: `Conflicto: El vehículo ya está asignado a otro recorrido (ID: ${asignacionVehiculoExistente.idAsig}) en ese período.`,
          });
      }

      const asignacionConductorExistente = await AsignacionRecorrido.findOne({
        where: {
          usuario_id_usu: usuarioIdUsu,
          estadoAsig: { [Op.notIn]: ['completado', 'cancelado'] },
          [Op.or]: [
            { fec_ini_recor: { [Op.between]: [fecIniRecor, fecFinRecor] } },
            { fec_fin_recor: { [Op.between]: [fecIniRecor, fecFinRecor] } },
            {
              [Op.and]: [
                { fec_ini_recor: { [Op.lte]: fecIniRecor } },
                { fec_fin_recor: { [Op.gte]: fecFinRecor } },
              ],
            },
          ],
        },
        transaction: t,
      });

      if (asignacionConductorExistente) {
        await t.rollback();
        return res
          .status(409)
          .json({
            message: `Conflicto: El conductor ya está asignado a otro recorrido (ID: ${asignacionConductorExistente.idAsig}) en ese período.`,
          });
      }
    }

    const kilometrajeInicialAUsar =
      kmIniRecor !== undefined && kmIniRecor !== null
        ? parseInt(kmIniRecor, 10)
        : vehiculo.kmVehi;

    const nuevaAsignacion = await AsignacionRecorrido.create(
      {
        fecIniRecor,
        fecFinRecor: fecFinRecor || null,
        kmIniRecor: kilometrajeInicialAUsar,
        notas,
        vehiculoIdVehi,
        // ===== CORRECCIÓN FINAL AQUÍ =====
        // EXPLICACIÓN: Se revierte mi cambio incorrecto. El modelo SÍ espera 'usuarioIdUsuConductor'.
        usuarioIdUsuConductor: usuarioIdUsu,
        rutaIdRuta,
        estadoAsig,
      },
      { transaction: t }
    );

    await t.commit();
    if (req.io) {
      req.io.emit('asignacionCreada', nuevaAsignacion);
    }
    res.status(201).json(nuevaAsignacion);
  } catch (error) {
    await t.rollback();
    console.error('Error al crear asignación de recorrido:', error);
    res
      .status(500)
      .json({ message: 'Error interno del servidor al crear la asignación.' });
  }
});

// GET /api/asignaciones-recorrido - Listar todas las asignaciones con filtros opcionales
router.get('/', async (req, res) => {
  try {
    const { estado, vehiculoId, conductorId, fechaDesde, fechaHasta } =
      req.query;
    const whereClause = {};

    if (estado) whereClause.estadoAsig = estado;
    if (vehiculoId) whereClause.vehiculoIdVehi = vehiculoId;
    if (conductorId) whereClause.usuarioIdUsu = conductorId;
    if (fechaDesde)
      whereClause.fecIniRecor = { [Op.gte]: new Date(fechaDesde) };
    if (fechaHasta) {
      whereClause.fecIniRecor = {
        ...(whereClause.fecIniRecor || {}),
        [Op.lte]: new Date(new Date(fechaHasta).setHours(23, 59, 59, 999)),
      };
    }

    const asignaciones = await AsignacionRecorrido.findAll({
      where: whereClause,
      include: [
        {
          model: Vehiculo,
          as: 'vehiculo',
          attributes: ['idVehi', 'patente', 'modelo', 'marca'],
        },
        {
          model: Usuario,
          as: 'conductor',
          attributes: ['idUsu', 'priNomUsu', 'priApeUsu', 'email'],
        },

        {
          model: Ruta,
          as: 'rutaPlantilla',
          attributes: ['idRuta', 'nombreRuta', 'kilometrosRuta'],
        },
      ],
      order: [['fecIniRecor', 'DESC']],
    });
    res.status(200).json(asignaciones);
  } catch (error) {
    console.error('Error al obtener asignaciones de recorrido:', error);
    // Devolver el error completo para más detalles en el frontend si es necesario
    res.status(500).json({
      message: 'Error interno del servidor al obtener asignaciones.',
      error: error.message,
      sql: error.parent?.sql, // Si el error tiene un 'parent' con info SQL
    });
  }
});

// GET /api/asignaciones-recorrido/:idAsig - Obtener una asignación específica
router.get('/:idAsig', async (req, res) => {
  try {
    const { idAsig } = req.params;
    const asignacion = await AsignacionRecorrido.findByPk(idAsig, {
      include: [
        { model: Vehiculo, as: 'vehiculo' },
        { model: Usuario, as: 'conductor' },
        { model: Ruta, as: 'rutaPlantilla' }, // Aquí no se especifican atributos, así que trae todos los del modelo Ruta
      ],
    });
    if (!asignacion) {
      return res.status(404).json({ message: 'Asignación no encontrada.' });
    }
    res.status(200).json(asignacion);
  } catch (error) {
    console.error('Error al obtener asignación:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
});

// PUT /api/asignaciones-recorrido/:idAsig - Actualizar una asignación
router.put('/:idAsig', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { idAsig } = req.params;
    const datosActualizacion = req.body;

    const asignacion = await AsignacionRecorrido.findByPk(idAsig, {
      transaction: t,
    });
    if (!asignacion) {
      await t.rollback();
      return res.status(404).json({ message: 'Asignación no encontrada.' });
    }

    const fechaInicioFinal =
      datosActualizacion.fecIniRecor || asignacion.fecIniRecor;
    const fechaFinFinal =
      datosActualizacion.fecFinRecor || asignacion.fecFinRecor;
    const vehiculoIdFinal =
      datosActualizacion.vehiculoIdVehi || asignacion.vehiculoIdVehi;
    const conductorIdFinal =
      datosActualizacion.usuarioIdUsu || asignacion.usuarioIdUsu;

    if (
      (datosActualizacion.fecIniRecor ||
        datosActualizacion.fecFinRecor ||
        datosActualizacion.vehiculoIdVehi ||
        datosActualizacion.usuarioIdUsu) &&
      fechaFinFinal
    ) {
      const asignacionVehiculoExistente = await AsignacionRecorrido.findOne({
        where: {
          id_asig: { [Op.ne]: idAsig },
          vehiculo_id_vehi: vehiculoIdFinal,
          estadoAsig: { [Op.notIn]: ['completado', 'cancelado'] },
          [Op.or]: [
            {
              fec_ini_recor: {
                [Op.between]: [fechaInicioFinal, fechaFinFinal],
              },
            },
            {
              fec_fin_recor: {
                [Op.between]: [fechaInicioFinal, fechaFinFinal],
              },
            },
            {
              [Op.and]: [
                { fec_ini_recor: { [Op.lte]: fechaInicioFinal } },
                { fec_fin_recor: { [Op.gte]: fechaFinFinal } },
              ],
            },
          ],
        },
        transaction: t,
      });

      if (asignacionVehiculoExistente) {
        await t.rollback();
        // ===== CORRECCIÓN AQUÍ =====
        return res
          .status(409)
          .json({
            message: `Conflicto: El vehículo ya tiene otra asignación (ID: ${asignacionVehiculoExistente.idAsig}) en esas fechas.`,
          });
      }

      const asignacionConductorExistente = await AsignacionRecorrido.findOne({
        where: {
          id_asig: { [Op.ne]: idAsig },
          usuario_id_usu: conductorIdFinal,
          estadoAsig: { [Op.notIn]: ['completado', 'cancelado'] },
          [Op.or]: [
            {
              fec_ini_recor: {
                [Op.between]: [fechaInicioFinal, fechaFinFinal],
              },
            },
            {
              fec_fin_recor: {
                [Op.between]: [fechaInicioFinal, fechaFinFinal],
              },
            },
            {
              [Op.and]: [
                { fec_ini_recor: { [Op.lte]: fechaInicioFinal } },
                { fec_fin_recor: { [Op.gte]: fechaFinFinal } },
              ],
            },
          ],
        },
        transaction: t,
      });

      if (asignacionConductorExistente) {
        await t.rollback();
        // ===== CORRECIÓN AQUÍ =====
        return res
          .status(409)
          .json({
            message: `Conflicto: El conductor ya tiene otra asignación (ID: ${asignacionConductorExistente.idAsig}) en esas fechas.`,
          });
      }
    }

    if (datosActualizacion.estadoAsig === 'completado') {
      // Verificamos si se solicita actualización automática de kilometraje
      if (datosActualizacion.actualizarKmAutomatico) {
        // Buscar el kilometraje actual del vehículo
        const vehiculo = await Vehiculo.findByPk(asignacion.vehiculoIdVehi, {
          transaction: t,
        });
        if (vehiculo) {
          // Usar el kilometraje actual del vehículo como kilometraje final
          datosActualizacion.kmFinRecor = vehiculo.kmVehi;
        }
      }

      const kmFinal = datosActualizacion.kmFinRecor;

      // Si aún no hay kilometraje final después de intentar la actualización automática
      if (kmFinal === undefined || kmFinal === null) {
        await t.rollback();
        return res
          .status(400)
          .json({
            message: 'Para completar, el kilometraje final es requerido.',
          });
      }

      if (!datosActualizacion.fecFinRecor) {
        datosActualizacion.fecFinRecor = new Date();
      }

      await Vehiculo.update(
        { kmVehi: kmFinal },
        { where: { id_vehi: asignacion.vehiculoIdVehi }, transaction: t }
      );
    }

    await asignacion.update(datosActualizacion, { transaction: t });
    await t.commit();

    const asignacionActualizada = await AsignacionRecorrido.findByPk(idAsig, {
      include: [
        { model: Vehiculo, as: 'vehiculo' },
        { model: Usuario, as: 'conductor' },
        { model: Ruta, as: 'rutaPlantilla' },
      ],
    });

    if (req.io) {
      req.io.emit('asignacionActualizada', asignacionActualizada);
    }
    res.status(200).json(asignacionActualizada);
  } catch (error) {
    await t.rollback();
    console.error('Error al actualizar asignación:', error);
    res
      .status(500)
      .json({
        message: 'Error interno del servidor al actualizar la asignación.',
      });
  }
});
router.get('/vehiculo-activo/conductor/:conductorId', async (req, res) => {
  try {
    const { conductorId } = req.params;

    const asignacion = await AsignacionRecorrido.findOne({
      where: {
        usuario_id_usu: conductorId,
        estado_asig: 'en_progreso',
      },

      include: {
        model: Vehiculo,
        as: 'vehiculo',
      },
    });

    if (asignacion && asignacion.vehiculo) {
      res.json(asignacion.vehiculo);
    } else {
      res
        .status(404)
        .json({
          message:
            'No se encontró un vehículo activo asignado para este conductor.',
        });
    }
  } catch (error) {
    console.error('Error al obtener vehículo activo:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

router.delete('/:idAsig', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { idAsig } = req.params;
    const asignacion = await AsignacionRecorrido.findByPk(idAsig, {
      transaction: t,
    });
    if (!asignacion) {
      await t.rollback();
      return res.status(404).json({ message: 'Asignación no encontrada.' });
    }

    await asignacion.destroy({ transaction: t });
    await t.commit();
    if (req.io) {
      req.io.emit('asignacionEliminada', { idAsig: parseInt(idAsig, 10) });
    }
    res.status(200).json({ message: 'Asignación eliminada exitosamente.' });
  } catch (error) {
    await t.rollback();
    console.error('Error al eliminar/cancelar asignación:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
});

module.exports = router;
