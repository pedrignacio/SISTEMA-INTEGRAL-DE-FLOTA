// backend/models/Usuario.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize, SequelizeDataTypes) => {

// --- CORRECCIÓN AQUÍ ---
const ROLES_USUARIO = ['admin', 'conductor', 'gestor', 'mantenimiento', 'tecnico'];

const Usuario = sequelize.define('Usuario', { 
    idUsu: { 
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        field: 'id_usu' 
    },
    rutUsu: { 
        type: DataTypes.STRING(12),
        allowNull: true,
        unique: true,
        field: 'rut_usu'
    },
    priNomUsu: { 
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'pri_nom_usu'
    },
    segNomUsu: { 
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'seg_nom_usu'
    },
    priApeUsu: { 
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'pri_ape_usu'
    },
    segApeUsu: { 
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'seg_ape_usu'
    },
    email: { 
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    celular: { 
        type: DataTypes.STRING(15),
        allowNull: true
    },
    fecEmiLic: { 
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'fec_emi_lic'
    },
    fecVenLic: { 
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'fec_ven_lic'
    },
    tipoLic: { 
        type: DataTypes.STRING(5),
        allowNull: true,
        field: 'tipo_lic'
    },
    archivoUrlLic: { 
        type: DataTypes.STRING(2000),
        allowNull: true,
        field: 'archivo_url_lic'
    },
    rol: { 
        type: DataTypes.ENUM(ROLES_USUARIO),
        allowNull: false,
        defaultValue: 'conductor'
    },
    clave: { 
        type: DataTypes.STRING(255),
        allowNull: false
    },
     
    estadoUsu: {
        type: DataTypes.ENUM('activo', 'inactivo'),
        allowNull: false,
        defaultValue: 'activo',
        field: 'estado_usu'
    }
}, {
    tableName: 'USUARIO', 
    timestamps: false,     
    underscored: false,     
});

return  Usuario; 
};