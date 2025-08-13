// models/Vehiculo.js
const { DataTypes } = require('sequelize');
module.exports = (sequelize, SequelizeDataTypes) => { // Asegúrate que la ruta a tu instancia de Sequelize sea correcta

const Vehiculo = sequelize.define('Vehiculo', {
  idVehi: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
    field: 'id_vehi',
    comment: 'Número de identificador del vehículo (PK)'
  },
  patente: {
    type: DataTypes.STRING(6),
    allowNull: false,
    unique: true,
    field: 'patente',
    comment: 'Patente del vehículo (ej. AA1234 o AAAA12)'
  },
  chasis: {
    type: DataTypes.STRING(17),
    allowNull: false,
    unique: true,
    field: 'chasis',
    comment: 'Número de chasis del vehículo (VIN)'
  },
  tipoVehi: {
    type: DataTypes.STRING(20),
    allowNull: true, 
    field: 'tipo_vehi',
    comment: 'Tipo del vehículo (ej: ligero, mediano, pesado, sedan, camioneta, furgon)'
  },
  estadoVehi: {
    type: DataTypes.ENUM('activo', 'inactivo', 'mantenimiento', 'taller'),
    allowNull: false,
    defaultValue: 'activo',
    field: 'estado_vehi',
    comment: 'Estado actual del vehículo'
  },
  tipoCombVehi: {
    type: DataTypes.ENUM('gasolina_93', 'gasolina_95', 'gasolina_97', 'diesel', 'electrico', 'otro'),
    allowNull: true,
    field: 'tipo_comb_vehi',
    comment: 'Tipo de combustible principal del vehículo'
  },
  kmVehi: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
    field: 'km_vehi',
    comment: 'Kilometraje actual del vehículo'
  },
  marca: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'marca',
    comment: 'Marca del vehículo (ej. Toyota)'
  },
  modelo: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'modelo',
    comment: 'Modelo del vehículo (ej. Hilux)'
  },
  anio: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'anio',
    validate: { 
      isInt: true,
      min: 1900,
      max: new Date().getFullYear() + 5 
    },
    comment: 'Año de fabricación del vehículo (ej. 2023)'
  },
  kmVidaUtil: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    field: 'km_vida_util',
    comment: 'Kilometraje estimado de vida útil del vehículo'
  },
  efiComb: {
    type: DataTypes.DECIMAL(5, 2), 
    allowNull: true,
    field: 'efi_comb',
    comment: 'Eficiencia de combustible (km/l o kWh/km para eléctricos). Ej: 12.50'
  },
  fecAdqui: {
    type: DataTypes.DATEONLY, 
    allowNull: false,
    field: 'fec_adqui',
    comment: 'Fecha de adquisición del vehículo'
  },
  latitud: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true,
    field: 'latitud',
    comment: 'Última coordenada de latitud conocida del vehículo'
  },
  longitud: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true,
    field: 'longitud',
    comment: 'Última coordenada de longitud conocida del vehículo'
  }
}, {
  tableName: 'VEHICULO', 
  timestamps: false,     
  comment: 'Tabla para almacenar la información detallada de los vehículos de la flota'
  
});



return Vehiculo; 
};