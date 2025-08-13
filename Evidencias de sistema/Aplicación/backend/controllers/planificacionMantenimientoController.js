// backend/controllers/planificacionMantenimientoController.js
const { PlanificacionMantenimiento, TareaPlanificacion, Vehiculo, VehiculoPlanificacion, sequelize } = require('../models');

// Crear una nueva Planificación de Mantenimiento
exports.crearPlanificacion = async (req, res) => {
    const transaction = await sequelize.transaction();
    console.log('CUERPO DE LA SOLICITUD RECIBIDO:', req.body);

    try {
        const {
            descPlan,
            frecuencia,
            tipoFrecuencia,
            fechaActivacion, 
            esActivoPlan,
            esPreventivo,
            tareas,
            vehiculosIds
        } = req.body;

       
        if (!descPlan || !tareas || !Array.isArray(tareas) || tareas.length === 0) {
            return res.status(400).json({ msg: 'La descripción y al menos una tarea son obligatorias.' });
        }
        if (typeof esPreventivo === 'undefined' || esPreventivo === null) {
            return res.status(400).json({ msg: 'El campo "esPreventivo" es obligatorio y no puede ser nulo.' });
        }
        if (typeof esActivoPlan === 'undefined' || esActivoPlan === null) {
            return res.status(400).json({ msg: 'El campo "esActivoPlan" es obligatorio y no puede ser nulo.' });
        }
        if (!vehiculosIds || !Array.isArray(vehiculosIds) || vehiculosIds.length === 0) {
            return res.status(400).json({ msg: 'Se debe asignar al menos un vehículo.' });
        }
        
        const datosParaPlanificacion = {
            descPlan,
            frecuencia,
            tipoFrecuencia,
            fechaActivacion, 
            esActivoPlan,
            esPreventivo  
        };

        console.log('Valores a crear en PlanificacionMantenimiento:', datosParaPlanificacion);

        const nuevaPlanificacion = await PlanificacionMantenimiento.create(datosParaPlanificacion, { transaction });
        
        const tareasCreadasPromises = tareas.map(tarea => {
            if (!tarea.nomTareaPlan) {
                throw new Error('El nombre de la tarea (nomTareaPlan) es obligatorio para todas las tareas.');
            }
            return TareaPlanificacion.create({
                nomTareaPlan: tarea.nomTareaPlan,
                descTareaPlan: tarea.descTareaPlan,
                planificacionMantenimientoIdPlan: nuevaPlanificacion.idPlan 
            }, { transaction });
        });
        await Promise.all(tareasCreadasPromises); 

        if (vehiculosIds && vehiculosIds.length > 0) {
            await nuevaPlanificacion.addVehiculosEnPlan(vehiculosIds, {
                transaction,
            });
        }

        await transaction.commit();

        const planificacionCompleta = await PlanificacionMantenimiento.findByPk(nuevaPlanificacion.idPlan, {
            include: [
                { model: TareaPlanificacion, as: 'tareas' }, 
                { model: Vehiculo, as: 'vehiculosEnPlan', attributes: ['idVehi', 'patente', 'marca', 'modelo'] }
            ]
        });

        res.status(201).json({ msg: 'Planificación creada exitosamente', planificacion: planificacionCompleta });

    } catch (error) {
        if (transaction && transaction.finished !== 'commit' && transaction.finished !== 'rollback') {
            await transaction.rollback();
        }
        console.error('Error al crear planificación:', error);
        res.status(500).json({ msg: 'Error interno del servidor al crear la planificación.', error: error.message });
    }
};

exports.listarPlanificaciones = async (req, res) => {
    try {
        const planificaciones = await PlanificacionMantenimiento.findAll({
            include: [
                {
                    model: TareaPlanificacion,
                    as: 'tareas' 
                },
                {
                    model: Vehiculo,
                    as: 'vehiculosEnPlan', 
                    attributes: ['idVehi', 'patente', 'marca', 'modelo'],
                    through: { attributes: [] } 
                }
            ],
            
            order: [['idPlan', 'DESC']]
        });
        res.status(200).json(planificaciones);
    } catch (error) {        console.error('Error al listar planificaciones:', error);
        res.status(500).json({ msg: 'Error interno del servidor al listar las planificaciones.', error: error.message });
    }
};


exports.obtenerPlanificacionPorId = async (req, res) => {
    try {
        const { id } = req.params;
        
        const planificacion = await PlanificacionMantenimiento.findByPk(id, {
            include: [
                {
                    model: TareaPlanificacion,
                    as: 'tareas'
                },
                {
                    model: Vehiculo,
                    as: 'vehiculosEnPlan',
                    attributes: ['idVehi', 'patente', 'marca', 'modelo'],
                    through: { attributes: [] }
                }
            ]
        });

        if (!planificacion) {
            return res.status(404).json({ msg: 'Planificación no encontrada.' });
        }

        res.status(200).json(planificacion);
    } catch (error) {
        console.error('Error al obtener planificación por ID:', error);
        res.status(500).json({ msg: 'Error interno del servidor al obtener la planificación.', error: error.message });
    }
};


exports.actualizarPlanificacion = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const { id } = req.params;
        const {
            descPlan,
            frecuencia,
            tipoFrecuencia,
            fechaActivacion, 
            esActivoPlan,
            esPreventivo,
            tareas,
            vehiculosIds
        } = req.body;

        const planificacion = await PlanificacionMantenimiento.findByPk(id);
        if (!planificacion) {
            await transaction.rollback();
            return res.status(404).json({ msg: 'Planificación no encontrada.' });
        }

        if (!descPlan || !tareas || !Array.isArray(tareas) || tareas.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ msg: 'La descripción y al menos una tarea son obligatorias.' });
        }

        await planificacion.update({
            descPlan,
            frecuencia,
            tipoFrecuencia,
            fechaActivacion, 
            esActivoPlan,
            esPreventivo
        }, { transaction });

        await TareaPlanificacion.destroy({
            where: { planificacionMantenimientoIdPlan: id },
            transaction
        });

        const nuevasTareas = tareas.map(tarea => ({
            nomTareaPlan: tarea.nomTareaPlan,
            descTareaPlan: tarea.descTareaPlan,
            planificacionMantenimientoIdPlan: id
        }));
        await TareaPlanificacion.bulkCreate(nuevasTareas, { transaction });

        if (vehiculosIds && Array.isArray(vehiculosIds)) {
            await planificacion.setVehiculosEnPlan(vehiculosIds, { transaction });
        }

        await transaction.commit();

        const planificacionActualizada = await PlanificacionMantenimiento.findByPk(id, {
            include: [
                { model: TareaPlanificacion, as: 'tareas' },
                { model: Vehiculo, as: 'vehiculosEnPlan', attributes: ['idVehi', 'patente', 'marca', 'modelo'] }
            ]
        });

        res.status(200).json({ 
            msg: 'Planificación actualizada exitosamente', 
            planificacion: planificacionActualizada 
        });

    } catch (error) {
        if (transaction && transaction.finished !== 'commit' && transaction.finished !== 'rollback') {
            await transaction.rollback();
        }
        console.error('Error al actualizar planificación:', error);
        res.status(500).json({ msg: 'Error interno del servidor al actualizar la planificación.', error: error.message });
    }
};


exports.eliminarPlanificacion = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const { id } = req.params;
        
        const planificacion = await PlanificacionMantenimiento.findByPk(id);
        if (!planificacion) {
            return res.status(404).json({ msg: 'Planificación no encontrada.' });
        }

        // Eliminar tareas asociadas
        await TareaPlanificacion.destroy({
            where: { planificacionMantenimientoIdPlan: id },
            transaction
        });

        // Eliminar asociaciones con vehículos
        await planificacion.setVehiculosEnPlan([], { transaction });

        // Eliminar la planificación
        await planificacion.destroy({ transaction });

        await transaction.commit();

        res.status(200).json({ message: 'Planificación eliminada correctamente.' });

    } catch (error) {
        if (transaction && transaction.finished !== 'commit' && transaction.finished !== 'rollback') {
            try {
                await transaction.rollback();
            } catch (rollbackError) {
                console.error('Error al intentar hacer rollback:', rollbackError);
            }
        }
        
        console.error('Error al eliminar planificación:', error);
        res.status(500).json({ msg: 'Error interno del servidor al eliminar la planificación.', error: error.message });
    }
};