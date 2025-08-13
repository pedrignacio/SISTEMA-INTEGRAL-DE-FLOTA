// backend/routes/rutas.js
const express = require('express');
const router = express.Router();
// CAMBIO EN LA IMPORTACIÓN:
const { Ruta } = require('../models'); // Importa desde el index.js de la carpeta models

// GET /api/rutas - Obtener TODAS las rutas
router.get('/', async (req, res) => {
  try {
    const rutas = await Ruta.findAll({
      order: [['nombreRuta', 'ASC']], // Asume que tu modelo Ruta tiene 'nombreRuta'
    });
    res.status(200).json(rutas);
  } catch (err) {
    console.error('Error al obtener rutas:', err);
    res
      .status(500)
      .json({ message: 'Error interno del servidor al obtener rutas.' });
  }
});

// POST /api/rutas - Crear una NUEVA ruta
router.post('/', async (req, res) => {
  const {
    nombreRuta,
    descripcionRuta,
    puntosRuta,
    kilometrosRuta,
    duracionEstimada,
  } = req.body;

  if (!nombreRuta || !puntosRuta) {
    return res
      .status(400)
      .json({ message: 'Los campos nombreRuta y puntosRuta son requeridos.' });
  }
  if (
    !Array.isArray(puntosRuta) ||
    !puntosRuta.every(
      p =>
        Array.isArray(p) &&
        p.length === 2 &&
        typeof p[0] === 'number' &&
        typeof p[1] === 'number'
    )
  ) {
    return res.status(400).json({
      message: 'El campo puntosRuta debe ser un array de coordenadas válido.',
    });
  }

  try {
    const nuevaRuta = await Ruta.create({
      nombreRuta,
      descripcionRuta,
      puntosRuta,
      kilometrosRuta,
      duracionEstimada,
    });
    if (req.io) {
      req.io.emit('routeCreated', nuevaRuta.toJSON());
    }
    res.status(201).json(nuevaRuta);
  } catch (err) {
    console.error('Error al crear ruta:', err);
    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json({
        message: 'Error de validación.',
        errors: err.errors.map(e => e.message),
      });
    }
    res
      .status(500)
      .json({ message: 'Error interno del servidor al crear la ruta.' });
  }
});

// GET /api/rutas/:idRuta - Obtener UNA ruta por su ID
router.get('/:idRuta', async (req, res) => {
  // El parámetro es idRuta
  try {
    const idRutaParam = parseInt(req.params.idRuta, 10);
    if (isNaN(idRutaParam)) {
      return res
        .status(400)
        .json({ message: 'El ID de la ruta debe ser un número.' });
    }
    const ruta = await Ruta.findByPk(idRutaParam);
    if (!ruta) {
      return res.status(404).json({ message: 'Ruta no encontrada.' });
    }
    res.status(200).json(ruta);
  } catch (err) {
    console.error(`Error al obtener ruta ${req.params.idRuta}:`, err);
    res
      .status(500)
      .json({ message: 'Error interno del servidor al obtener la ruta.' });
  }
});

// PUT /api/rutas/:idRuta - Actualizar UNA ruta existente
router.put('/:idRuta', async (req, res) => {
  try {
    const idRutaParam = parseInt(req.params.idRuta, 10);
    if (isNaN(idRutaParam)) {
      return res
        .status(400)
        .json({ message: 'El ID de la ruta debe ser un número.' });
    }
    const ruta = await Ruta.findByPk(idRutaParam);
    if (!ruta) {
      return res
        .status(404)
        .json({ message: 'Ruta no encontrada para actualizar.' });
    }

    if (req.body.puntosRuta !== undefined) {
      const { puntosRuta } = req.body;
      if (
        !Array.isArray(puntosRuta) ||
        !puntosRuta.every(
          p =>
            Array.isArray(p) &&
            p.length === 2 &&
            typeof p[0] === 'number' &&
            typeof p[1] === 'number'
        )
      ) {
        return res.status(400).json({
          message:
            'Si se proporciona puntosRuta, debe ser un array de coordenadas válido.',
        });
      }
    }
    await ruta.update(req.body);
    if (req.io) {
      req.io.emit('routeUpdated', ruta.toJSON());
    }
    res.status(200).json(ruta);
  } catch (err) {
    console.error(`Error al actualizar ruta ${req.params.idRuta}:`, err);
    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json({
        message: 'Error de validación.',
        errors: err.errors.map(e => e.message),
      });
    }
    res
      .status(500)
      .json({ message: 'Error interno del servidor al actualizar la ruta.' });
  }
});

// DELETE /api/rutas/:idRuta - Eliminar UNA ruta existente
router.delete('/:idRuta', async (req, res) => {
  try {
    const idRutaParam = parseInt(req.params.idRuta, 10);
    if (isNaN(idRutaParam)) {
      return res
        .status(400)
        .json({ message: 'El ID de la ruta debe ser un número.' });
    }
    const numeroFilasEliminadas = await Ruta.destroy({
      where: { idRuta: idRutaParam },
    });
    if (numeroFilasEliminadas === 0) {
      return res
        .status(404)
        .json({ message: 'Ruta no encontrada para eliminar.' });
    }
    if (req.io) {
      req.io.emit('routeDeleted', { id: idRutaParam });
    }
    res.status(200).json({ message: 'Ruta eliminada exitosamente.' });
  } catch (err) {
    console.error(`Error al eliminar ruta ${req.params.idRuta}:`, err);
    res
      .status(500)
      .json({ message: 'Error interno del servidor al eliminar la ruta.' });
  }
});

module.exports = router;
