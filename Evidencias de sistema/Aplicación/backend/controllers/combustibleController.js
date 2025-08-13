// backend/controllers/combustibleController.js

const { RegistroCombustible, Vehiculo, Usuario } = require('../models');

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', 'uploads/comprobantes');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage: storage });
exports.uploadFile = upload.single('comprobante');

exports.createRegistroCombustible = async (req, res) => {
  try {
    const {
      vehiculoId,
      usuarioId,
      fecha,
      monto,
      litros,
      kilometraje,
      tipoCombustible,
    } = req.body;

    let urlComprobante = null;
    if (req.file) {
      urlComprobante = `/uploads/comprobantes/${req.file.filename}`;
    }

    const nuevoRegistro = await RegistroCombustible.create({
      fecha: fecha,
      monto: monto,
      litros: litros,
      kilometraje: kilometraje,
      tipoCombustible: tipoCombustible,
      urlComprobante: urlComprobante,
      vehiculoId: vehiculoId,
      usuarioId: usuarioId,
    });

    res.status(201).json(nuevoRegistro);
  } catch (error) {
    console.error('Error al crear registro de combustible:', error);
    res
      .status(500)
      .json({ message: 'Error interno del servidor', error: error.message });
  }
};

exports.getHistorialPorConductor = async (req, res) => {
  try {
    const { conductorId } = req.params;

    if (!conductorId) {
      return res.status(400).json({ message: 'ID de conductor requerido' });
    }

    console.log(`Buscando historial para conductor ID: ${conductorId}`);

    // IMPORTANTE: Usar el nombre de campo correcto según tu modelo
    const historial = await RegistroCombustible.findAll({
      where: {
        usuarioId: conductorId, // Usar el nombre correcto según tu modelo

        // O alternativamente:
        // usuario_id_usu_registro: conductorId  // Nombre en la base de datos
      },
      include: {
        model: Vehiculo,
        as: 'vehiculo',
        attributes: ['patente', 'marca', 'modelo'],
      },
      order: [['fecha', 'DESC']],
    });

    res.status(200).json(historial);
  } catch (error) {
    console.error('Error al obtener historial de combustible:', error);
    res.status(500).json({
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

exports.getCombustibleById = async (req, res) => {
  try {
    const { id } = req.params;
    const registro = await RegistroCombustible.findByPk(id, {});

    if (!registro) {
      return res
        .status(404)
        .json({ message: 'Registro de combustible no encontrado.' });
    }
    res.json(registro);
  } catch (error) {
    console.error('Error al obtener el registro de combustible:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};
