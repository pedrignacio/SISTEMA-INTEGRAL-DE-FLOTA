// backend/routes/ordenTrabajo.routes.js
const express = require('express');
const router = express.Router();
const ordenTrabajoController = require('../controllers/ordenTrabajoController.refactored');
const { authMiddleware } = require('../middleware/auth');
const { validateRole } = require('../middleware/validateRole');
const { ROLES_USUARIO } = require('../constants/enums');

/**
 * Rutas para la gestión de órdenes de trabajo
 * Todas las rutas requieren autenticación
 */

// Middleware de autenticación para todas las rutas
router.use(authMiddleware);

/**
 * @route   POST /api/ordenes-trabajo/generar
 * @desc    Generar una orden de trabajo desde un plan de mantenimiento
 * @access  Private (Admin, Gestor, Mantenimiento)
 */
router.post(
  '/generar',
  validateRole([
    ROLES_USUARIO.ADMIN,
    ROLES_USUARIO.GESTOR,
    ROLES_USUARIO.MANTENIMIENTO,
  ]),
  ordenTrabajoController.generarOtDesdePlan
);

/**
 * @route   POST /api/ordenes-trabajo/generar-bulk
 * @desc    Generar múltiples órdenes de trabajo para varios vehículos
 * @access  Private (Admin, Gestor, Mantenimiento)
 */
router.post(
  '/generar-bulk',
  validateRole([
    ROLES_USUARIO.ADMIN,
    ROLES_USUARIO.GESTOR,
    ROLES_USUARIO.MANTENIMIENTO,
  ]),
  ordenTrabajoController.generarOtsParaPlanBulk
);

/**
 * @route   GET /api/ordenes-trabajo
 * @desc    Listar todas las órdenes de trabajo
 * @access  Private (Todos los roles autenticados)
 */
router.get('/', ordenTrabajoController.listarOrdenesTrabajo);

/**
 * @route   GET /api/ordenes-trabajo/reporte/mantenimientos
 * @desc    Generar reporte de mantenimientos
 * @access  Private (Admin, Gestor, Mantenimiento)
 */
router.get(
  '/reporte/mantenimientos',
  validateRole([
    ROLES_USUARIO.ADMIN,
    ROLES_USUARIO.GESTOR,
    ROLES_USUARIO.MANTENIMIENTO,
  ]),
  ordenTrabajoController.getMantenimientoReport
);

/**
 * @route   GET /api/ordenes-trabajo/tecnico/:tecnicoId
 * @desc    Obtener órdenes de trabajo asignadas a un técnico
 * @access  Private (Admin, Gestor, Mantenimiento, Técnico específico)
 */
router.get(
  '/tecnico/:tecnicoId',
  // Middleware personalizado para validar acceso del técnico
  (req, res, next) => {
    const { tecnicoId } = req.params;
    const { usuario } = req;

    // Admin, gestor y mantenimiento pueden ver cualquier técnico
    if (
      [
        ROLES_USUARIO.ADMIN,
        ROLES_USUARIO.GESTOR,
        ROLES_USUARIO.MANTENIMIENTO,
      ].includes(usuario.rol)
    ) {
      return next();
    }

    // Un técnico solo puede ver sus propias órdenes
    if (
      usuario.rol === ROLES_USUARIO.TECNICO &&
      usuario.id_usu.toString() === tecnicoId
    ) {
      return next();
    }

    return res.status(403).json({
      error: 'No tienes permisos para acceder a las órdenes de este técnico.',
    });
  },
  ordenTrabajoController.getOrdenesPorTecnico
);

/**
 * @route   GET /api/ordenes-trabajo/:id
 * @desc    Obtener una orden de trabajo por ID
 * @access  Private (Todos los roles autenticados)
 */
router.get('/:id', ordenTrabajoController.getOrdenTrabajoPorId);

/**
 * @route   PUT /api/ordenes-trabajo/:id/estado
 * @desc    Actualizar el estado de una orden de trabajo
 * @access  Private (Admin, Gestor, Mantenimiento, Técnico)
 */
router.put(
  '/:id/estado',
  validateRole([
    ROLES_USUARIO.ADMIN,
    ROLES_USUARIO.GESTOR,
    ROLES_USUARIO.MANTENIMIENTO,
    ROLES_USUARIO.TECNICO,
  ]),
  ordenTrabajoController.actualizarEstadoOt
);

/**
 * @route   PUT /api/ordenes-trabajo/:id/rechazar
 * @desc    Rechazar una orden de trabajo con motivo
 * @access  Private (Admin, Gestor, Mantenimiento)
 */
router.put(
  '/:id/rechazar',
  validateRole([
    ROLES_USUARIO.ADMIN,
    ROLES_USUARIO.GESTOR,
    ROLES_USUARIO.MANTENIMIENTO,
  ]),
  ordenTrabajoController.rechazarOrdenTrabajo
);

/**
 * @route   PUT /api/ordenes-trabajo/:id/detalles
 * @desc    Actualizar los detalles de una orden de trabajo
 * @access  Private (Admin, Gestor, Mantenimiento, Técnico)
 */
router.put(
  '/:id/detalles',
  validateRole([
    ROLES_USUARIO.ADMIN,
    ROLES_USUARIO.GESTOR,
    ROLES_USUARIO.MANTENIMIENTO,
    ROLES_USUARIO.TECNICO,
  ]),
  ordenTrabajoController.actualizarDetallesOt
);

module.exports = router;
