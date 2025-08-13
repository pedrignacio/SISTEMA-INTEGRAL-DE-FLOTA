// backend/utils/validators.js
const {
  ESTADOS_ORDEN_TRABAJO,
  PRIORIDADES_ORDEN_TRABAJO,
  ROLES_USUARIO,
} = require('../constants/enums');

/**
 * Utilidades de validación para el backend
 */

/**
 * Valida si un estado de orden de trabajo es válido
 */
const isValidEstadoOT = estado => {
  return Object.values(ESTADOS_ORDEN_TRABAJO).includes(estado);
};

/**
 * Valida si una prioridad de orden de trabajo es válida
 */
const isValidPrioridadOT = prioridad => {
  return Object.values(PRIORIDADES_ORDEN_TRABAJO).includes(prioridad);
};

/**
 * Valida si un rol de usuario es válido
 */
const isValidRol = rol => {
  return Object.values(ROLES_USUARIO).includes(rol);
};

/**
 * Valida si un ID es un número entero positivo
 */
const isValidId = id => {
  return Number.isInteger(Number(id)) && Number(id) > 0;
};

/**
 * Valida formato de email básico
 */
const isValidEmail = email => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Valida formato de fecha YYYY-MM-DD
 */
const isValidDate = dateString => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
};

/**
 * Valida que un objeto tenga las propiedades requeridas
 */
const hasRequiredFields = (obj, requiredFields) => {
  return requiredFields.every(
    field =>
      obj.hasOwnProperty(field) &&
      obj[field] !== null &&
      obj[field] !== undefined &&
      obj[field] !== ''
  );
};

/**
 * Sanitiza entrada de texto para prevenir inyecciones
 */
const sanitizeString = str => {
  if (typeof str !== 'string') return str;
  return str.trim().replace(/[<>]/g, '');
};

/**
 * Valida los datos de una planificación de mantenimiento
 */
const validarPlanificacion = (datos, esActualizacion = false) => {
  const errores = [];

  // Validaciones requeridas para creación
  if (!esActualizacion) {
    if (
      !datos.descPlan ||
      typeof datos.descPlan !== 'string' ||
      datos.descPlan.trim().length < 5
    ) {
      errores.push(
        'La descripción del plan es requerida y debe tener al menos 5 caracteres'
      );
    }

    if (
      !datos.frecuencia ||
      !Number.isInteger(Number(datos.frecuencia)) ||
      Number(datos.frecuencia) < 1
    ) {
      errores.push('La frecuencia debe ser un número entero positivo');
    }

    if (
      !datos.tipoFrecuencia ||
      !['km', 'dias', 'semanas', 'meses'].includes(datos.tipoFrecuencia)
    ) {
      errores.push(
        'El tipo de frecuencia debe ser uno de: km, dias, semanas, meses'
      );
    }

    if (!Array.isArray(datos.tareas) || datos.tareas.length === 0) {
      errores.push('Debe incluir al menos una tarea');
    } else {
      datos.tareas.forEach((tarea, index) => {
        if (
          !tarea.nomTareaPlan ||
          typeof tarea.nomTareaPlan !== 'string' ||
          tarea.nomTareaPlan.trim().length === 0
        ) {
          errores.push(`La tarea ${index + 1} debe tener un nombre válido`);
        }
      });
    }

    if (!Array.isArray(datos.vehiculosIds) || datos.vehiculosIds.length === 0) {
      errores.push('Debe asignar al menos un vehículo');
    } else {
      datos.vehiculosIds.forEach((id, index) => {
        if (!isValidId(id)) {
          errores.push(`El ID del vehículo ${index + 1} no es válido`);
        }
      });
    }
  }

  // Validaciones opcionales para actualización
  if (datos.descPlan !== undefined) {
    if (
      typeof datos.descPlan !== 'string' ||
      datos.descPlan.trim().length < 5
    ) {
      errores.push('La descripción del plan debe tener al menos 5 caracteres');
    }
  }

  if (datos.fechaActivacion !== undefined && datos.fechaActivacion !== null) {
    if (!isValidDate(datos.fechaActivacion)) {
      errores.push('La fecha de activación no es válida');
    }
  }

  if (datos.esPreventivo !== undefined) {
    if (typeof datos.esPreventivo !== 'boolean') {
      errores.push('El campo esPreventivo debe ser booleano');
    }
  }

  if (datos.esActivoPlan !== undefined) {
    if (typeof datos.esActivoPlan !== 'boolean') {
      errores.push('El campo esActivoPlan debe ser booleano');
    }
  }

  return {
    esValido: errores.length === 0,
    errores,
  };
};

module.exports = {
  isValidEstadoOT,
  isValidPrioridadOT,
  isValidRol,
  isValidId,
  isValidEmail,
  isValidDate,
  hasRequiredFields,
  sanitizeString,
  validarPlanificacion,
};
