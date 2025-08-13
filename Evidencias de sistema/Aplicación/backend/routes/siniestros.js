// backend/routes/siniestros.js

const express = require('express');
const router = express.Router();
const siniestroController = require('../controllers/siniestroController');
router.post('/', siniestroController.uploadFile, siniestroController.createSiniestro);
// Cuando el frontend pida GET /api/siniestros, se ejecutará esta función.
router.get('/', siniestroController.getAllSiniestros);

// 2. Ruta para obtener un siniestro específico por su ID
// Responderá a peticiones como GET /api/siniestros/5
router.get('/:id', siniestroController.getSiniestroById);

// 3. Ruta para actualizar solo el estado de un siniestro
// Responderá a peticiones PUT /api/siniestros/5/estado
router.put('/:id/estado', siniestroController.updateSiniestroStatus);
router.put('/:id', siniestroController.updateSiniestro); 
module.exports = router;