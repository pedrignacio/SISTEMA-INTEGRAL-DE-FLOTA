// backend/constants/enums.js
/**
 * Enumeraciones centralizadas para el sistema
 * Mantiene consistencia entre base de datos, modelos y lógica de negocio
 */

const ESTADOS_ORDEN_TRABAJO = {
  SIN_INICIAR: 'sin_iniciar',
  INICIADA: 'iniciada',
  EN_PROGRESO: 'en_progreso',
  CANCELADA: 'cancelada',
  COMPLETADA: 'completada',
  RECHAZADO: 'rechazado',
};

const PRIORIDADES_ORDEN_TRABAJO = {
  BAJA: 'baja',
  MEDIA: 'media',
  ALTA: 'alta',
  URGENTE: 'urgente',
};

const ESTADOS_VEHICULO = {
  ACTIVO: 'activo',
  INACTIVO: 'inactivo',
  MANTENIMIENTO: 'mantenimiento',
  TALLER: 'taller',
  BAJA: 'baja',
};

const ROLES_USUARIO = {
  ADMIN: 'admin',
  CONDUCTOR: 'conductor',
  GESTOR: 'gestor',
  MANTENIMIENTO: 'mantenimiento',
  TECNICO: 'tecnico',
};

const ESTADOS_USUARIO = {
  ACTIVO: 'activo',
  INACTIVO: 'inactivo',
  LICENCIA: 'licencia',
};

const ESTADOS_SINIESTRO = {
  REPORTADO: 'reportado',
  EN_REVISION: 'en_revision',
  RESUELTO: 'resuelto',
  CANCELADO: 'cancelado',
};

const ESTADOS_ASIGNACION = {
  PENDIENTE: 'pendiente',
  ASIGNADO: 'asignado',
  EN_PROGRESO: 'en_progreso',
  COMPLETADO: 'completado',
  CANCELADO: 'cancelado',
};

const TIPOS_COMBUSTIBLE = {
  GASOLINA_93: 'gasolina_93',
  GASOLINA_95: 'gasolina_95',
  GASOLINA_97: 'gasolina_97',
  DIESEL: 'diesel',
  ELECTRICO: 'electrico',
  OTRO: 'otro',
};

// Obtener valores como arrays para validaciones
const getEnumValues = enumObject => Object.values(enumObject);

module.exports = {
  ESTADOS_ORDEN_TRABAJO,
  PRIORIDADES_ORDEN_TRABAJO,
  ESTADOS_VEHICULO,
  ROLES_USUARIO,
  ESTADOS_USUARIO,
  ESTADOS_SINIESTRO,
  ESTADOS_ASIGNACION,
  TIPOS_COMBUSTIBLE,
  getEnumValues,
};
