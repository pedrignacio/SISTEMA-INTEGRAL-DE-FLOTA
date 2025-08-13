// backend/routes/usuario.routes.js
const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
router.get('/check-rut', usuarioController.checkRutExistence); 

router.get('/check-email', usuarioController.checkEmailExistence); 
router.get('/', usuarioController.getUsuarios);

router.get('/', usuarioController.getUsuarios);
router.put('/:id', usuarioController.updateUsuario);

router.delete('/:id', usuarioController.deleteUsuario);
router.post('/', usuarioController.createUsuario);
// PUT /api/usuarios/reactivate/:id
router.put('/reactivate/:id', usuarioController.reactivateUsuario);
module.exports = router;