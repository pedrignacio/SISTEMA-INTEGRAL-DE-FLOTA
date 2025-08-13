// En backend/controllers/usuarioController.js
const { Usuario, AsignacionRecorrido, DetalleOt, OrdenTrabajo, RegistroCombustible } = require('../models');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize'); // <-- AÑADIR ESTA LÍNEA
exports.getUsuarios = async (req, res) => {
    try {
      
        const { rol, estado } = req.query;
 
        let whereClause = { 
            estado_usu: estado || 'activo' 
        }; 
        
       
        if (rol && rol !== 'todos') { 
            whereClause.rol = rol;
        }

        const usuarios = await Usuario.findAll({
            where: whereClause,
      
            attributes: ['id_usu', 'pri_nom_usu', 'pri_ape_usu', 'email', 'rol', 'estado_usu'],
            raw: true 
        });

   
        const usuariosMapeados = usuarios.map(u => ({
            id_usu: u.id_usu,
            pri_nom_usu: u.pri_nom_usu,
            pri_ape_usu: u.pri_ape_usu,
            email: u.email, 
            rol: u.rol,
            estado_usu: u.estado_usu
        }));
        
        res.status(200).json(usuariosMapeados);

    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};
exports.deleteUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const usuario = await Usuario.findByPk(id);

        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // --- Verificación para cualquier rol involucrado en una OT activa ---
        const otActiva = await OrdenTrabajo.findOne({
            where: {
                [Op.or]: [
                    { usuarioIdUsuEncargado: id },
                    { usuarioIdUsuSolicitante: id }
                ],
                estado_ot: { [Op.notIn]: ['completada', 'cancelada'] }
            }
        });

        if (otActiva) {
            return res.status(409).json({ message: 'No se puede desactivar: El usuario está involucrado en una Orden de Trabajo activa (como solicitante o encargado).' });
        }


        // --- Verificaciones específicas por rol 

        // Validación para ROL CONDUCTOR en recorridos activos
        if (usuario.rol === 'conductor') {
            const asignacionActiva = await AsignacionRecorrido.findOne({
                where: {
                    usuarioIdUsuConductor: id,
                    estadoAsig: { [Op.notIn]: ['completado', 'cancelado'] }
                }
            });
            if (asignacionActiva) {
                return res.status(409).json({ message: 'No se puede desactivar: El conductor tiene un recorrido activo.' });
            }
        }

        // Validación para ROL TECNICO en tareas de OT activas
        if (usuario.rol === 'tecnico') {
            const detalleOtActivo = await DetalleOt.findOne({
                where: { usuarioIdUsuTecnico: id },
                include: [{
                    model: OrdenTrabajo,
                    required: true, 
                    where: {
                        estado_ot: { [Op.notIn]: ['completada', 'cancelada'] }
                    }
                }]
            });
            if (detalleOtActivo) {
                return res.status(409).json({ message: 'No se puede desactivar: El técnico está asignado a una OT activa.' });
            }
        }
        
        // --- ACCIÓN FINAL: SOFT DELETE ---
        await usuario.update({ estadoUsu: 'inactivo' });

        res.status(200).json({ message: 'Usuario desactivado exitosamente' });

    } catch (error) {
        console.error('Error al desactivar usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};
exports.reactivateUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const usuario = await Usuario.findByPk(id);

        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        
        // Verifica si el usuario ya está activo para no hacer un update innecesario
        if (usuario.estadoUsu === 'activo') {
            return res.status(400).json({ message: 'El usuario ya se encuentra activo.' });
        }
        
        // Actualiza el estado a 'activo'
        await usuario.update({ estadoUsu: 'activo' });
        
        res.status(200).json({ message: 'Usuario reactivado exitosamente' });

    } catch (error) {
        console.error('Error al reactivar usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

exports.updateUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const incomingData = req.body; 

        console.log(`[DEBUG] Petición PUT recibida para el usuario ID: ${id}`);
        console.log('[DEBUG] Datos recibidos en el body:', incomingData);

        const usuario = await Usuario.findByPk(id);

        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        console.log('[DEBUG] Usuario encontrado. Datos ANTES:', usuario.toJSON());

        const dataToUpdate = {
            priNomUsu: incomingData.pri_nom_usu,
            priApeUsu: incomingData.pri_ape_usu,
            email: incomingData.email,
            rol: incomingData.rol
        };

       
        await usuario.update(dataToUpdate);

        console.log('[DEBUG] Usuario actualizado. Datos DESPUÉS:', usuario.toJSON());

     
        res.status(200).json(usuario);

    } catch (error) {
        console.error('[DEBUG] CATCH: Error durante la actualización:', error);
        if (error.name === 'SequelizeValidationError') {
            const errors = error.errors.map(e => e.message);
            return res.status(400).json({ message: 'Datos inválidos', errors });
        }
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

exports.createUsuario = async (req, res) => {
    try {
        const { pri_nom_usu, seg_nom_usu, pri_ape_usu, seg_ape_usu, email, rol, clave, rut_usu, celular, fec_emi_lic, fec_ven_lic, tipo_lic, archivo_url_lic } = req.body;

        // Validaciones básicas de campos requeridos para la creación
        if (!pri_nom_usu || !pri_ape_usu || !email || !rol || !clave || !rut_usu) {
            return res.status(400).json({ message: 'Los campos Primer Nombre, Primer Apellido, Email, Rol, Contraseña y RUT son requeridos.' });
        }

        // Validación de unicidad de RUT y Email
        const existingUserByRut = await Usuario.findOne({ where: { rutUsu: rut_usu } });
        if (existingUserByRut) {
            return res.status(409).json({ message: 'El RUT proporcionado ya está registrado.' });
        }
        const existingUserByEmail = await Usuario.findOne({ where: { email: email } });
        if (existingUserByEmail) {
            return res.status(409).json({ message: 'El email proporcionado ya está registrado.' });
        }

        // Validación de campos de licencia si el rol es 'conductor'
        if (rol === 'conductor') {
            if (!fec_emi_lic || !fec_ven_lic || !tipo_lic) {
                return res.status(400).json({ message: 'Para el rol de conductor, la fecha de emisión, fecha de vencimiento y tipo de licencia son requeridos.' });
            }
            // Validar que la fecha de emisión no sea posterior a la de vencimiento
            if (new Date(fec_emi_lic) > new Date(fec_ven_lic)) {
                return res.status(400).json({ message: 'La fecha de emisión de la licencia no puede ser posterior a la fecha de vencimiento.' });
            }
            // Opcional: Validar que la fecha de emisión no sea futura
            if (new Date(fec_emi_lic) > new Date()) {
                return res.status(400).json({ message: 'La fecha de emisión de la licencia no puede ser una fecha futura.' });
            }
        }

        const hashedPassword = await bcrypt.hash(clave, 10);

        const nuevoUsuario = await Usuario.create({
            priNomUsu: pri_nom_usu,
            segNomUsu: seg_nom_usu || null, // Asegurar que segNomUsu pueda ser null
            priApeUsu: pri_ape_usu,
            segApeUsu: seg_ape_usu || null, // Asegurar que segApeUsu pueda ser null
            rutUsu: rut_usu,
            email: email,
            celular: celular || null, // Allow null
            rol: rol,
            clave: hashedPassword,
            fecEmiLic: fec_emi_lic || null,
            fecVenLic: fec_ven_lic || null,
            tipoLic: tipo_lic || null,
            archivoUrlLic: archivo_url_lic || null
        });

        const usuarioParaDevolver = { ...nuevoUsuario.toJSON() };
        delete usuarioParaDevolver.clave; // Nunca devolver el hash de la contraseña

        res.status(201).json(usuarioParaDevolver);

    } catch (error) {
        console.error('Error al crear usuario:', error);
        // Manejo de errores de validación de Sequelize y unicidad
        if (error.name === 'SequelizeUniqueConstraintError') {
            const field = error.errors[0]?.path || 'desconocido';
            return res.status(409).json({ message: `El ${field} proporcionado ya está registrado.` });
        }
        
        if (error.name === 'SequelizeValidationError') {
            const messages = error.errors.map(e => e.message).join(', ');
            return res.status(400).json({ message: `Datos inválidos: ${messages}` });
        }
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

exports.checkRutExistence = async (req, res) => {
    try {
        const { rut, id } = req.query;

        console.log('[BACKEND LOG - checkRutExistence] RUT recibido:', rut);
        console.log('[BACKEND LOG - checkRutExistence] ID de usuario (para edición):', id);

        if (!rut) {
            console.log('[BACKEND LOG - checkRutExistence] Error: RUT no proporcionado.');
            return res.status(400).json({ message: 'El parámetro RUT es requerido.' });
        }

        // CAMBIO CLAVE: Ya NO limpiamos el RUT aquí. Buscamos el RUT tal cual se recibe.
        const rutForQuery = rut; // Usamos el RUT recibido directamente
        console.log('[BACKEND LOG - checkRutExistence] RUT para consulta (directo):', rutForQuery);

        let whereClause = { rutUsu: rutForQuery };

        if (id) {
            whereClause.idUsu = { [Op.ne]: id };
            console.log('[BACKEND LOG - checkRutExistence] Excluyendo usuario con ID:', id);
        }

        console.log('[BACKEND LOG - checkRutExistence] Cláusula WHERE:', whereClause);

        const existingUser = await Usuario.findOne({ where: whereClause });

        console.log('[BACKEND LOG - checkRutExistence] Resultado de Usuario.findOne:', existingUser ? existingUser.toJSON() : 'No encontrado');

        const exists = !!existingUser;
        console.log('[BACKEND LOG - checkRutExistence] Resultado final (exists):', exists);
        res.status(200).json({ exists: exists });

    } catch (error) {
        console.error('[BACKEND LOG - checkRutExistence] Error en el controlador:', error);
        res.status(500).json({ message: 'Error interno del servidor al verificar RUT.' });
    }
};

exports.checkEmailExistence = async (req, res) => {
    try {
        const { email, id } = req.query; // 'id' es opcional para excluir al propio usuario en edición

        console.log('[BACKEND LOG - checkEmailExistence] Email recibido:', email);
        console.log('[BACKEND LOG - checkEmailExistence] ID de usuario (para edición):', id);

        if (!email) {
            return res.status(400).json({ message: 'El parámetro Email es requerido.' });
        }

        let whereClause = { email: email };

        // Si se proporciona un ID, excluir ese usuario de la búsqueda (para ediciones)
        if (id) {
            whereClause.idUsu = { [Op.ne]: id };
            console.log('[BACKEND LOG - checkEmailExistence] Excluyendo usuario con ID:', id);
        }

        console.log('[BACKEND LOG - checkEmailExistence] Cláusula WHERE:', whereClause);

        const existingUser = await Usuario.findOne({ where: whereClause });

        console.log('[BACKEND LOG - checkEmailExistence] Resultado de Usuario.findOne:', existingUser ? existingUser.toJSON() : 'No encontrado');

        const exists = !!existingUser;
        console.log('[BACKEND LOG - checkEmailExistence] Resultado final (exists):', exists);
        res.status(200).json({ exists: exists });

    } catch (error) {
        console.error('[BACKEND LOG - checkEmailExistence] Error en el controlador:', error);
        res.status(500).json({ message: 'Error interno del servidor al verificar Email.' });
    }
};