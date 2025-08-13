// Importamos los modelos necesarios para las consultas con 'include'
const { Siniestro, Usuario, Vehiculo } = require('../models');
const multer = require('multer');
const path = require('path');
const fs = require('fs');


const uploadDir = path.join(__dirname, '..', 'uploads/siniestros');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {

    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage: storage });


exports.uploadFile = upload.single('fotoIncidente'); 


exports.createSiniestro = async (req, res) => {
  try {
    const { vehiculoId, conductorId, fecha, tipo, descripcion } = req.body;
    
    let archivoUrl = null;
    if (req.file) {
      // La ruta debe ser accesible públicamente por el frontend
      archivoUrl = `/uploads/siniestros/${req.file.filename}`;
    }

    const nuevoSiniestro = await Siniestro.create({
      vehiculoId,
      conductorId,
      reportaId: conductorId,
      fecha,
      tipo,
      descripcion,
      archivoUrl,
      estado: 'reportado' // Estado inicial por defecto
    });

    res.status(201).json(nuevoSiniestro);
  } catch (error) {
    console.error('Error al crear siniestro:', error);
    res.status(500).json({ message: 'Error interno del servidor', error: error.message });
  }
};



// 1. OBTENER TODOS LOS SINIESTROS
exports.getAllSiniestros = async (req, res) => {
    try {
        const siniestros = await Siniestro.findAll({
            include: [
                {
                    model: Usuario,
                   
                    as: 'conductor', 
                    attributes: ['id_usu', 'pri_nom_usu', 'pri_ape_usu']
                },
                {
                    model: Vehiculo,
                
                    as: 'vehiculo', 
                    attributes: ['id_vehi', 'patente', 'marca', 'modelo']
                }
            ],
             order: [['fecha', 'DESC']]
        });
        res.status(200).json(siniestros);
    } catch (error) {
        console.error('Error al obtener siniestros:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};


exports.getSiniestroById = async (req, res) => {
    try {
        const { id } = req.params;
        const siniestro = await Siniestro.findByPk(id, {
            include: [
                { 
                    model: Usuario, 
                    as: 'conductor',
                   
                    attributes: ['id_usu', 'pri_nom_usu', 'pri_ape_usu', 'email']
                },
                { 
                    model: Vehiculo, 
                    as: 'vehiculo',
                    attributes: ['id_vehi', 'patente', 'marca', 'modelo', 'anio']
                }
            ]
        });

        if (!siniestro) {
            return res.status(404).json({ message: 'Siniestro no encontrado' });
        }
        res.status(200).json(siniestro);
    } catch (error) {
        console.error(`Error al obtener siniestro ${req.params.id}:`, error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// 3. ACTUALIZAR EL ESTADO DE UN SINIESTRO
exports.updateSiniestroStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body; // El nuevo estado vendrá en el cuerpo de la petición

        if (!estado) {
            return res.status(400).json({ message: 'El nuevo estado es requerido.' });
        }

        const siniestro = await Siniestro.findByPk(id);

        if (!siniestro) {
            return res.status(404).json({ message: 'Siniestro no encontrado' });
        }

        siniestro.estado = estado; // Actualizamos el campo 'estado' (camelCase)
        await siniestro.save();

        res.status(200).json({ message: 'Estado del siniestro actualizado con éxito.', siniestro });

    } catch (error) {
        console.error(`Error al actualizar estado del siniestro ${req.params.id}:`, error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};
exports.updateSiniestro = async (req, res) => {
    // LOG: Confirma que la función updateSiniestro se está ejecutando
    console.log(`[SiniestroController - updateSiniestro] Iniciando actualización para ID: ${req.params.id}`);
    console.log('[SiniestroController - updateSiniestro] Body recibido:', req.body);

    try {
        const { id } = req.params;
        const { descripcion, estado, ...otherUpdates } = req.body; // Puedes extraer otros campos si los quieres manejar aquí

        const siniestro = await Siniestro.findByPk(id);
        if (!siniestro) {
            console.log(`[SiniestroController - updateSiniestro] Siniestro con ID ${id} no encontrado.`);
            return res.status(404).json({ message: 'Siniestro no encontrado.' });
        }

        // Crear un objeto con los campos que realmente queremos actualizar
        const dataToUpdate = {};
        if (descripcion !== undefined) {
            dataToUpdate.descripcion = descripcion;
        }
        if (estado !== undefined) { // Puedes actualizar el estado aquí también si quieres un PUT genérico
            dataToUpdate.estado = estado;
        }
        // Puedes añadir otros campos si el frontend los enviara
        Object.assign(dataToUpdate, otherUpdates); // Asegura que otros campos enviados también se actualicen

        // Si no hay datos para actualizar, no hacemos nada
        if (Object.keys(dataToUpdate).length === 0) {
            console.log('[SiniestroController - updateSiniestro] No hay datos para actualizar.');
            return res.status(400).json({ message: 'No hay datos para actualizar.' });
        }

        console.log('[SiniestroController - updateSiniestro] Datos a actualizar:', dataToUpdate);
        await siniestro.update(dataToUpdate);
        console.log('[SiniestroController - updateSiniestro] Siniestro actualizado exitosamente.');
        res.status(200).json(siniestro);

    } catch (error) {
        console.error('[SiniestroController - updateSiniestro] Error durante la actualización:', error);
        if (error.name === 'SequelizeValidationError') {
            const errors = error.errors.map(e => e.message);
            return res.status(400).json({ message: 'Datos inválidos', errors });
        }
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};