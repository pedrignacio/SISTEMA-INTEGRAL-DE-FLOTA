// backend/routes/combustibles.js
const express = require('express');
const router = express.Router();
const combustibleController = require('../controllers/combustibleController');

router.post('/', combustibleController.uploadFile, combustibleController.createRegistroCombustible);
router.get('/historial/conductor/:conductorId', combustibleController.getHistorialPorConductor);
router.get('/:id', combustibleController.getCombustibleById);
module.exports = router;