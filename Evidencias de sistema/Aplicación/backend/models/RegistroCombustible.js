// backend/models/RegistroCombustible.js

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RegistroCombustible = sequelize.define('RegistroCombustible', {
  
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'id_comb'
    },
 
    fecha: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'fec_comb'
    },
    litros: {
      type: DataTypes.DECIMAL(7, 2),
      allowNull: false,
      field: 'litros' 
    },
  
    kilometraje: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'km_comb'
    },
   
    tipoCombustible: {
        type: DataTypes.ENUM('gasolina_93', 'gasolina_95', 'gasolina_97', 'diesel', 'electrico', 'otro'),
        allowNull: false,
        field: 'tipo_comb_cargado'
    },
   
    monto: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'costo_total_comb'
    },
   
    urlComprobante: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'archivo_url_comb'
    },
    // Foreign Keys
    vehiculoId: {
      type: DataTypes.INTEGER,
      field: 'vehiculo_id_vehi'
    },
    usuarioId: {
      type: DataTypes.INTEGER,
      field: 'usuario_id_usu_registro'
    }
  }, {
    tableName: 'registro_combustible',
    timestamps: false 
  });

  return RegistroCombustible;
};