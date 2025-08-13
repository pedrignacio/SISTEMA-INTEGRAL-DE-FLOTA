// backend/middleware/validateRole.js
const { ROLES_USUARIO } = require('../constants/enums');

/**
 * Middleware para validar que el usuario tenga uno de los roles permitidos
 * @param {Array} rolesPermitidos - Array de roles que pueden acceder a la ruta
 */
const validateRole = rolesPermitidos => {
  return (req, res, next) => {
    try {
      const { usuario } = req;

      if (!usuario) {
        return res.status(401).json({
          error: 'Usuario no autenticado.',
        });
      }

      if (!usuario.rol) {
        return res.status(403).json({
          error: 'Usuario sin rol asignado.',
        });
      }

      // Verificar si el rol del usuario está en la lista de roles permitidos
      if (!rolesPermitidos.includes(usuario.rol)) {
        return res.status(403).json({
          error: 'No tienes permisos suficientes para acceder a este recurso.',
          rolRequerido: rolesPermitidos,
          rolActual: usuario.rol,
        });
      }

      next();
    } catch (error) {
      console.error('Error en validateRole middleware:', error);
      res.status(500).json({
        error: 'Error interno del servidor en validación de roles.',
      });
    }
  };
};

/**
 * Middleware específico para validar que solo administradores accedan
 */
const adminOnly = validateRole([ROLES_USUARIO.ADMIN]);

/**
 * Middleware para validar que solo técnicos y superiores accedan
 */
const tecnicoOrAbove = validateRole([
  ROLES_USUARIO.ADMIN,
  ROLES_USUARIO.GESTOR,
  ROLES_USUARIO.MANTENIMIENTO,
  ROLES_USUARIO.TECNICO,
]);

/**
 * Middleware para validar que solo gestores y superiores accedan
 */
const gestorOrAbove = validateRole([
  ROLES_USUARIO.ADMIN,
  ROLES_USUARIO.GESTOR,
  ROLES_USUARIO.MANTENIMIENTO,
]);

module.exports = {
  validateRole,
  adminOnly,
  tecnicoOrAbove,
  gestorOrAbove,
};
