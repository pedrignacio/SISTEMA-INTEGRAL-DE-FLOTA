// backend/routes/ordenTrabajo.routes.js

const express = require('express');
const router = express.Router();
const ordenTrabajoController = require('../controllers/ordenTrabajoController');


router.post('/generar', ordenTrabajoController.generarOtDesdePlan);


router.get('/', ordenTrabajoController.listarOrdenesTrabajo);
router.get('/reporte/mantenimientos', ordenTrabajoController.getMantenimientoReport);


router.get('/:id', ordenTrabajoController.getOrdenTrabajoPorId);


router.put('/:id/detalles', ordenTrabajoController.actualizarDetallesOt);
router.post('/generar-bulk', ordenTrabajoController.generarOtsParaPlanBulk);

router.put('/:id/estado', ordenTrabajoController.actualizarEstadoOt);
router.put('/:id/rechazar', ordenTrabajoController.rechazarOrdenTrabajo);
router.get('/tecnico/:tecnicoId', ordenTrabajoController.getOrdenesPorTecnico);
module.exports = router;