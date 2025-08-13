// backend/routes/vehiculos.js
const express = require('express');
const router = express.Router();
// Importa vehiculoController solo si getHistorialByVehiculoId se mantiene aquí
const vehiculoController = require('../controllers/vehiculoController'); 

// Importa db y extrae modelos, sequelize y Op
const db = require('../models');
const Vehiculo = db.Vehiculo;
const OrdenTrabajo = db.OrdenTrabajo;
const Siniestro = db.Siniestro;
const RegistroCombustible = db.RegistroCombustible;
const AsignacionRecorrido = db.AsignacionRecorrido;
const sequelize = db.sequelize;
const Op = db.Sequelize.Op; // Importa Op desde db.Sequelize.Op

// Ruta para historial (llama a vehiculoController si aún lo necesitas)
router.get('/:id/historial', vehiculoController.getHistorialByVehiculoId);
router.get('/:id/asignaciones', vehiculoController.getAsignacionesActivas);
// GET /api/vehicles - Obtener TODOS los vehículos
router.get('/', async (req, res) => {
    try {
        const estadoFilter = req.query.estado;
        let whereClause = {};
        if (estadoFilter) {
            if (Array.isArray(estadoFilter)) {
                whereClause.estadoVehi = { [Op.in]: estadoFilter };
            } else {
                whereClause.estadoVehi = estadoFilter;
            }
        }
        
        const vehiculos = await Vehiculo.findAll({
            where: whereClause,
            order: [['marca', 'ASC'], ['modelo', 'ASC']]
        });
        res.status(200).json(vehiculos);
    } catch (err) {
        console.error("Error al obtener vehículos:", err);
        res.status(500).json({ message: 'Error interno del servidor al obtener vehículos.' });
    }
});

// GET /api/vehicles/:idVehi - Obtener UN vehículo por su ID
router.get('/:idVehi', async (req, res) => {
    try {
        const idVehiParam = parseInt(req.params.idVehi, 10);
        if (isNaN(idVehiParam)) {
            return res.status(400).json({ message: 'El ID del vehículo debe ser un número.' });
        }
        const vehiculo = await Vehiculo.findByPk(idVehiParam);
        if (!vehiculo) {
            return res.status(404).json({ message: 'Vehículo no encontrado.' });
        }
        res.status(200).json(vehiculo);
    } catch (err) {
        console.error(`Error al obtener vehículo ${req.params.idVehi}:`, err);
        res.status(500).json({ message: 'Error interno del servidor al obtener el vehículo.' });
    }
});

// POST /api/vehicles - Crear un NUEVO vehículo
router.post('/', async (req, res) => {
    try {
        const nuevoVehiculo = await Vehiculo.create(req.body);

        if (req.io) { 
            req.io.emit('vehicleCreated', nuevoVehiculo.toJSON());
        }
        res.status(201).json(nuevoVehiculo);
    } catch (err) {
        console.error("Error al crear vehículo:", err);
        if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ message: 'Error de validación o restricción.', errors: err.errors.map(e => e.message) });
        }
        res.status(500).json({ message: 'Error interno del servidor al crear el vehículo.' });
    }
});

// PUT /api/vehicles/:idVehi - Actualizar UN vehículo existente
router.put('/:idVehi', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const idVehiParam = parseInt(req.params.idVehi, 10);
    if (isNaN(idVehiParam)) {
      return res.status(400).json({ message: 'El ID del vehículo debe ser un número.' });
    }

    const vehiculo = await Vehiculo.findByPk(idVehiParam, { transaction: t });
    if (!vehiculo) {
      await t.rollback();
      return res.status(404).json({ message: 'Vehículo no encontrado para actualizar.' });
    }

    // ===== INICIO DE LA LÓGICA MEJORADA (PASO 1.3) =====
    const nuevoEstado = req.body.estadoVehi;
    const estadosConflictivos = ['mantenimiento', 'taller', 'inactivo'];

    // EXPLICACIÓN: La validación se activa si el nuevo estado es uno de los que hacen que el vehículo no esté disponible.
    if (nuevoEstado && estadosConflictivos.includes(nuevoEstado)) {
      const asignacionActiva = await AsignacionRecorrido.findOne({
        where: {
          vehiculoIdVehi: idVehiParam,
          // EXPLICACIÓN: Ahora buscamos CUALQUIER asignación que no esté finalizada.
          estadoAsig: { [Op.in]: ['asignado', 'en_progreso'] }
        },
        transaction: t
      });

      if (asignacionActiva) {
        await t.rollback();
        return res.status(409).json({
          message: `Conflicto: No se puede cambiar el estado a "${nuevoEstado}" porque el vehículo tiene una asignación en estado "${asignacionActiva.estadoAsig}" (ID: ${asignacionActiva.idAsig}).`
        });
      }
    }
    // ===== FIN DE LA LÓGICA MEJORADA =====

    await vehiculo.update(req.body, { transaction: t });
    await t.commit();

    if (req.io) {
      req.io.emit('vehicleUpdated', vehiculo.toJSON());
    }
    res.status(200).json(vehiculo);
  } catch (err) {
    await t.rollback();
    console.error(`Error al actualizar vehículo ${req.params.idVehi}:`, err);
    if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Error de validación o restricción.', errors: err.errors.map(e => e.message) });
    }
    res.status(500).json({ message: 'Error interno del servidor al actualizar el vehículo.' });
  }
});

// DELETE /api/vehicles/:idVehi - Cambia el estado del vehículo a 'inactivo' (Soft Delete - NO elimina el registro)
router.delete('/:idVehi', async (req, res) => {
  const t = await sequelize.transaction(); // Iniciar una transacción
  try {
    const idVehiParam = req.params.idVehi;
    const id = parseInt(idVehiParam, 10);

    if (isNaN(id)) {
      await t.rollback();
      return res.status(400).json({ message: 'El ID del vehículo debe ser un número válido.' });
    }

    const vehiculo = await Vehiculo.findByPk(id, { transaction: t });

    if (!vehiculo) {
      await t.rollback();
      return res.status(404).json({ message: 'Vehículo no encontrado.' });
    }

    // Verificar si el vehículo ya está inactivo
    if (vehiculo.estadoVehi === 'inactivo') {
      await t.rollback();
      return res.status(400).json({ message: 'El vehículo ya está desactivado.' });
    }

    // --- VERIFICACIONES INFORMATIVAS (NO BLOQUEAN LA DESACTIVACIÓN) ---
    const warnings = [];

    // 1. Verificar asignaciones de recorrido activas (solo advertencia)
    const asignacionActiva = await AsignacionRecorrido.findOne({
      where: {
        vehiculoIdVehi: id,
        estadoAsig: { [Op.notIn]: ['completado', 'cancelado'] }
      },
      transaction: t
    });
    if (asignacionActiva) {
      warnings.push(`El vehículo tiene una asignación activa (ID: ${asignacionActiva.idAsig}, Estado: ${asignacionActiva.estadoAsig})`);
    }

    // 2. Verificar Órdenes de Trabajo pendientes/activas (solo advertencia)
    const otActiva = await OrdenTrabajo.findOne({
      where: {
        vehiculoIdVehi: id,
        estado_ot: { [Op.notIn]: ['completada', 'cancelada', 'rechazado'] }
      },
      transaction: t
    });
    if (otActiva) {
      warnings.push(`El vehículo tiene una orden de trabajo pendiente (ID: ${otActiva.id_ot}, Estado: ${otActiva.estado_ot})`);
    }

    // 3. Verificar Siniestros pendientes/activos (solo advertencia)
    const siniestroActivo = await Siniestro.findOne({
      where: {
        vehiculoId: id,
        estado: { [Op.notIn]: ['resuelto', 'cancelado'] }
      },
      transaction: t
    });
    if (siniestroActivo) {
      warnings.push(`El vehículo tiene un siniestro pendiente (ID: ${siniestroActivo.id}, Estado: ${siniestroActivo.estado})`);
    }

    // --- REALIZAR SOFT DELETE: CAMBIAR ESTADO A 'INACTIVO' (NO ELIMINAR REGISTRO) ---
    const estadoAnterior = vehiculo.estadoVehi;
    await vehiculo.update({ 
      estadoVehi: 'inactivo'
    }, { transaction: t });

    await t.commit();
    
    // Log para auditoría
    console.log(`[SOFT DELETE] Vehículo ID ${id} (${vehiculo.patente}) cambiado de "${estadoAnterior}" a "inactivo"`);
    
    if (req.io) {
      // Emitir evento para notificar al frontend
      req.io.emit('vehicleUpdated', vehiculo.toJSON());
    }
    
    res.status(200).json({ 
      message: 'Vehículo desactivado exitosamente (soft delete).',
      warnings: warnings.length > 0 ? warnings : undefined,
      vehiculo: {
        id: vehiculo.idVehi,
        patente: vehiculo.patente,
        estadoAnterior: estadoAnterior,
        estadoActual: 'inactivo'
      }
    });

  } catch (error) {
    await t.rollback();
    console.error('[VehiculosRoutes - SOFT DELETE] Error al desactivar vehículo:', error);

    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(409).json({ message: 'No se puede desactivar el vehículo: Está relacionado con otros registros activos.' });
    }

    res.status(500).json({ message: 'Error interno del servidor al desactivar el vehículo.', error: error.message });
  }
});

// PUT /api/vehicles/:idVehi/deactivate - Cambia el estado del vehículo a 'inactivo' (Soft Delete alternativo)
router.put('/:idVehi/deactivate', async (req, res) => {
  const t = await sequelize.transaction(); // Iniciar una transacción
  try {
    const idVehiParam = req.params.idVehi;
    const id = parseInt(idVehiParam, 10);

    if (isNaN(id)) {
      await t.rollback();
      return res.status(400).json({ message: 'El ID del vehículo debe ser un número válido.' });
    }

    const vehiculo = await Vehiculo.findByPk(id, { transaction: t });

    if (!vehiculo) {
      await t.rollback();
      return res.status(404).json({ message: 'Vehículo no encontrado.' });
    }

    // Verificar si el vehículo ya está inactivo
    if (vehiculo.estadoVehi === 'inactivo') {
      await t.rollback();
      return res.status(400).json({ message: 'El vehículo ya está desactivado.' });
    }

    // --- VERIFICACIONES INFORMATIVAS (NO BLOQUEAN LA DESACTIVACIÓN) ---
    const warnings = [];

    // 1. Verificar asignaciones de recorrido activas (solo advertencia)
    const asignacionActiva = await AsignacionRecorrido.findOne({
      where: {
        vehiculoIdVehi: id,
        estadoAsig: { [Op.notIn]: ['completado', 'cancelado'] }
      },
      transaction: t
    });
    if (asignacionActiva) {
      warnings.push(`El vehículo tiene una asignación activa (ID: ${asignacionActiva.idAsig}, Estado: ${asignacionActiva.estadoAsig})`);
    }

    // 2. Verificar Órdenes de Trabajo pendientes/activas (solo advertencia)
    const otActiva = await OrdenTrabajo.findOne({
      where: {
        vehiculoIdVehi: id,
        estado_ot: { [Op.notIn]: ['completada', 'cancelada', 'rechazado'] }
      },
      transaction: t
    });
    if (otActiva) {
      warnings.push(`El vehículo tiene una orden de trabajo pendiente (ID: ${otActiva.id_ot}, Estado: ${otActiva.estado_ot})`);
    }

    // 3. Verificar Siniestros pendientes/activos (solo advertencia)
    const siniestroActivo = await Siniestro.findOne({
      where: {
        vehiculoId: id,
        estado: { [Op.notIn]: ['resuelto', 'cancelado'] }
      },
      transaction: t
    });
    if (siniestroActivo) {
      warnings.push(`El vehículo tiene un siniestro pendiente (ID: ${siniestroActivo.id}, Estado: ${siniestroActivo.estado})`);
    }

    // --- REALIZAR SOFT DELETE: CAMBIAR ESTADO A 'INACTIVO' (NO ELIMINAR REGISTRO) ---
    const estadoAnterior = vehiculo.estadoVehi;
    await vehiculo.update({ 
      estadoVehi: 'inactivo'
    }, { transaction: t });

    await t.commit();
    
    // Log para auditoría
    console.log(`[SOFT DELETE PUT] Vehículo ID ${id} (${vehiculo.patente}) cambiado de "${estadoAnterior}" a "inactivo"`);
    
    if (req.io) {
      // Emitir evento para notificar al frontend
      req.io.emit('vehicleUpdated', vehiculo.toJSON());
    }
    
    res.status(200).json({ 
      message: 'Vehículo desactivado exitosamente (soft delete).',
      warnings: warnings.length > 0 ? warnings : undefined,
      vehiculo: {
        id: vehiculo.idVehi,
        patente: vehiculo.patente,
        estadoAnterior: estadoAnterior,
        estadoActual: 'inactivo'
      }
    });

  } catch (error) {
    await t.rollback();
    console.error('[VehiculosRoutes - SOFT DELETE PUT] Error al desactivar vehículo:', error);

    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(409).json({ message: 'No se puede desactivar el vehículo: Está relacionado con otros registros activos.' });
    }

    res.status(500).json({ message: 'Error interno del servidor al desactivar el vehículo.', error: error.message });
  }
});

module.exports = router;
