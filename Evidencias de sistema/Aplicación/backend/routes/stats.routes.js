

const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
router.get('/dashboard-kpis', statsController.getDashboardKpis);

router.get('/vehiculos-por-tipo', statsController.getVehiculosPorTipo);
router.get('/mantenimientos-por-estado', statsController.getMantenimientosPorEstado);
module.exports = router;