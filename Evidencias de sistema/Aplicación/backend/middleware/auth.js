// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const { Usuario } = require('../models');

/**
 * Middleware de autenticación JWT
 * Extrae y valida el token del header Authorization
 */
const authMiddleware = async (req, res, next) => {
  try {
    // Obtener token del header Authorization
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Token de acceso requerido.',
      });
    }

    // Extraer el token (remover "Bearer ")
    const token = authHeader.substring(7);

    if (!token) {
      return res.status(401).json({
        error: 'Token de acceso requerido.',
      });
    }

    // Verificar y decodificar el token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'tu_secreto_jwt_por_defecto'
    );

    // Obtener información completa del usuario desde la base de datos
    const usuario = await Usuario.findByPk(decoded.id_usu);

    if (!usuario) {
      return res.status(401).json({
        error: 'Usuario no encontrado.',
      });
    }

    if (usuario.estadoUsu !== 'activo') {
      return res.status(403).json({
        error: 'Usuario inactivo.',
      });
    }

    // Agregar información del usuario al request para uso en siguientes middlewares
    req.usuario = {
      id_usu: usuario.idUsu, // Usar el valor del campo JavaScript
      email: usuario.email,
      rol: usuario.rol,
      nombre: usuario.priNomUsu,
      apellido: usuario.priApeUsu,
    };

    console.log('✅ Usuario autenticado en middleware:', {
      id_usu: req.usuario.id_usu,
      email: req.usuario.email,
      rol: req.usuario.rol,
      nombre: req.usuario.nombre,
    });

    next();
  } catch (error) {
    console.error('Error en authMiddleware:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Token inválido.',
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expirado.',
      });
    }

    res.status(500).json({
      error: 'Error interno del servidor en autenticación.',
    });
  }
};

/**
 * Middleware opcional de autenticación
 * No falla si no hay token, pero si hay uno lo valida
 */
const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No hay token, continuar sin usuario
      req.usuario = null;
      return next();
    }

    const token = authHeader.substring(7);

    if (!token) {
      req.usuario = null;
      return next();
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'tu_secreto_jwt_por_defecto'
    );
    const usuario = await Usuario.findByPk(decoded.id_usu);

    if (usuario && usuario.estadoUsu === 'activo') {
      req.usuario = {
        id_usu: usuario.idUsu, // Usar el nombre del atributo en JavaScript
        email: usuario.email,
        rol: usuario.rol,
        nombre: usuario.priNomUsu, // Usar el nombre del atributo en JavaScript
        apellido: usuario.priApeUsu, // Usar el nombre del atributo en JavaScript
      };
    } else {
      req.usuario = null;
    }

    next();
  } catch (error) {
    // En caso de error, continuar sin usuario autenticado
    req.usuario = null;
    next();
  }
};

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
};
