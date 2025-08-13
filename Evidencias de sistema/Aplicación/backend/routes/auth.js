// backend/routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt'); 
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer'); // Asegúrate de instalar nodemailer
const router = express.Router();

const { Usuario } = require('../models'); 

const saltRounds = 10;

// POST /api/auth/register
router.post('/register', async (req, res) => {
 
    const {
        pri_nom_usu, seg_nom_usu, pri_ape_usu, seg_ape_usu,
        email, clave, rut_usu, celular,
        fec_emi_lic, fec_ven_lic, tipo_lic, archivo_url_lic, rol
    } = req.body;

    if (!pri_nom_usu || !pri_ape_usu || !email || !clave) {
        return res.status(400).json({ message: 'Nombre, apellido, email y clave son requeridos.' });
    }

    try {
        const existingUserByEmail = await Usuario.findOne({ where: { email: email } });
        if (existingUserByEmail) {
            return res.status(409).json({ message: 'El email ya está registrado.' });
        }
        if (rut_usu) { // rutUsu es el campo en el modelo Sequelize
            const existingUserByRut = await Usuario.findOne({ where: { rutUsu: rut_usu } });
            if (existingUserByRut) {
                return res.status(409).json({ message: 'El RUT ya está registrado.' });
            }
        }

        const hashedPassword = await bcrypt.hash(clave, saltRounds);

        // Usar los nombres de campo camelCase del modelo Sequelize al crear
        const newUser = await Usuario.create({
            priNomUsu: pri_nom_usu,
            segNomUsu: seg_nom_usu,
            priApeUsu: pri_ape_usu,
            segApeUsu: seg_ape_usu,
            email: email,
            celular: celular,
            rutUsu: rut_usu,
            fecEmiLic: fec_emi_lic ? new Date(fec_emi_lic) : null, 
            fecVenLic: fec_ven_lic ? new Date(fec_ven_lic) : null, 
            tipoLic: tipo_lic,
            archivoUrlLic: archivo_url_lic,
            rol: rol || 'conductor', 
            clave: hashedPassword
        });

      
        const userResponse = {
            idUsu: newUser.idUsu,
            priNomUsu: newUser.priNomUsu,
            priApeUsu: newUser.priApeUsu, 
            email: newUser.email,
            rol: newUser.rol
            
        };
        res.status(201).json(userResponse);

    } catch (error) {
        console.error("Error en el registro:", error);
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ message: 'Error de validación.', errors: error.errors.map(e => e.message) });
        }
        if (error.name === 'SequelizeUniqueConstraintError') {
             return res.status(409).json({ message: 'Error: El email o RUT ya existe.', errors: error.errors.map(e => e.message) });
        }
        res.status(500).json({ message: 'Error interno del servidor durante el registro.' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, clave } = req.body; 

  if (!email || !clave) {
    return res.status(400).json({ message: 'Email y clave son requeridos.' });
  }

  try {
    const user = await Usuario.findOne({ where: { email: email } });
    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas.' });
    }

    const isMatch = await bcrypt.compare(clave, user.clave);
    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciales inválidas.' });
    }
    
    if (user.estadoUsu !== 'activo') {
      return res.status(403).json({ message: 'Su cuenta ha sido desactivada. Por favor, contacte al administrador.' });
    }

    // --- CORRECCIÓN EN EL PAYLOAD DEL TOKEN ---
    // Usamos los nombres camelCase del objeto 'user' de Sequelize
    const payload = {
      id_usu: user.idUsu,
      email: user.email,
      rol: user.rol,
      nombre: user.priNomUsu
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'tu_secreto_jwt_por_defecto', { expiresIn: '24h' });

   
    res.status(200).json({
      message: 'Login exitoso!',
      token: token,
      user: {
        id_usu: user.idUsu,         
        pri_nom_usu: user.priNomUsu,
        pri_ape_usu: user.priApeUsu,
        email: user.email,
        rol: user.rol
      }
    });

  } catch (error) {
    console.error("Error en el login:", error);
    res.status(500).json({ message: 'Error interno del servidor durante el login.' });
  }
});

// GET /api/auth/users - Para listar usuarios (ej. para selectores de conductor)
router.get('/users', async (req, res) => {
    try {
        const { rol } = req.query;
        
        // --- CAMBIO 2: FILTRAR SIEMPRE POR USUARIOS ACTIVOS ---
        const whereClause = { estado_usu: 'activo' };
        if (rol) {
            whereClause.rol = rol;
        }
        // --- FIN DEL CAMBIO 2 ---

        const usuarios = await Usuario.findAll({
            where: whereClause,
            attributes: ['id_usu', 'pri_nom_usu', 'seg_nom_usu', 'pri_ape_usu', 'seg_ape_usu', 'email', 'rol']
        });
        res.json(usuarios);
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener la lista de usuarios.' });
    }
});

// POST /api/auth/recover-password
router.post('/recover-password', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'El correo es requerido.' });
    }

    try {
        const user = await Usuario.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ message: 'El correo no está registrado.' });
        }

        // Generar un token de recuperación (válido por 1 hora)
        const recoveryToken = jwt.sign({ id: user.idUsu }, process.env.JWT_SECRET, { expiresIn: '1h' });

        // Configurar el transporte de correo
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER, // Configura tu correo en el archivo .env
                pass: process.env.EMAIL_PASS, // Configura tu contraseña en el archivo .env
            },
        });

        // Enviar el correo
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Recuperación de Contraseña',
            text: `Haz clic en el siguiente enlace para recuperar tu contraseña: ${process.env.FRONTEND_URL}/reset-password?token=${recoveryToken}`,
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({ message: 'Se ha enviado un enlace de recuperación a tu correo.' });
    } catch (error) {
        console.error('Error en recuperación de contraseña:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await Usuario.findByPk(decoded.id);

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.clave = hashedPassword;
        await user.save();

        res.status(200).json({ message: 'Contraseña actualizada exitosamente.' });
    } catch (error) {
        console.error('Error al restablecer contraseña:', error);
        res.status(400).json({ message: 'Token inválido o expirado.' });
    }
});

module.exports = router;
