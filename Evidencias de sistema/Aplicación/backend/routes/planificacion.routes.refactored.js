// backend/routes/planificacion.routes.refactored.js
const express = require('express');
const router = express.Router();
const planificacionController = require('../controllers/planificacionController.refactored');
const { validateRole } = require('../middleware/validateRole');
const { authMiddleware } = require('../middleware/auth');
const { ROLES } = require('../constants/enums');

/**
 * Rutas refactorizadas para planificaciones de mantenimiento
 * Utilizan el nuevo controlador que genera OTs automáticamente
 */

/**
 * @route   POST /api/planificaciones-v2
 * @desc    Crear nueva planificación con OTs automáticas
 * @access  Encargado de Mantenimiento, Administrador
 */
router.post(
  '/',
  authMiddleware,
  // validateRole([ROLES.ENCARGADO_MANTENIMIENTO, ROLES.ADMINISTRADOR]),
  planificacionController.crearPlanificacionConOts
);

/**
 * @route   GET /api/planificaciones-v2
 * @desc    Obtener todas las planificaciones
 * @access  Todos los usuarios autenticados
 */
router.get('/', authMiddleware, planificacionController.listarPlanificaciones);

/**
 * @route   GET /api/planificaciones-v2/:id
 * @desc    Obtener planificación por ID
 * @access  Todos los usuarios autenticados
 */
router.get(
  '/:id',
  authMiddleware,
  planificacionController.obtenerPlanificacionPorId
);

/**
 * @route   PUT /api/planificaciones-v2/:id
 * @desc    Actualizar planificación por ID
 * @access  Encargado de Mantenimiento, Administrador
 */
router.put(
  '/:id',
  authMiddleware,
  // validateRole([ROLES.ENCARGADO_MANTENIMIENTO, ROLES.ADMINISTRADOR]),
  planificacionController.actualizarPlanificacion
);

/**
 * @route   DELETE /api/planificaciones-v2/:id
 * @desc    Eliminar planificación por ID
 * @access  Administrador
 */
router.delete(
  '/:id',
  // validateRole([ROLES.ADMINISTRADOR]),
  planificacionController.eliminarPlanificacion
);

module.exports = router;
