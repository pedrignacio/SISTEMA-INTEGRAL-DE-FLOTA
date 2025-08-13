// backend/services/maintenanceScheduler.js

const { VehiculoPlanificacion, Vehiculo, PlanificacionMantenimiento, OrdenTrabajo, sequelize } = require('../models');
const { Op } = require('sequelize');
const { add, format } = require('date-fns');

async function verificarYGenerarOts() {
  console.log(`[Scheduler] ${new Date().toISOString()} - Iniciando verificación de mantenimientos preventivos...`);

  try {
    const asociaciones = await VehiculoPlanificacion.findAll({
      include: [
        { model: Vehiculo, as: 'vehiculo' },
        { model: PlanificacionMantenimiento, as: 'plan', where: { es_activo_plan: true } }
      ]
    });

    for (const asociacion of asociaciones) {
      const { vehiculo, plan, km_ult_plan, fec_ult_plan, km_prox_plan, fec_prox_plan } = asociacion;
      
      let requiereMantenimiento = false;

      // Verificar si requiere mantenimiento
      if (plan.tipo_frecuencia === 'km' && vehiculo.km_vehi >= km_prox_plan) {
        requiereMantenimiento = true;
      } else if (['dias', 'semanas', 'meses'].includes(plan.tipo_frecuencia) && new Date() >= new Date(fec_prox_plan)) {
        requiereMantenimiento = true;
      }

      if (requiereMantenimiento) {
        // Validación: ¿Ya existe una OT abierta para este plan y vehículo?
        const otExistente = await OrdenTrabajo.findOne({
          where: {
            vehiculo_id_vehi: vehiculo.id_vehi,
            vehiculo_planificacion_plan_id_plan: plan.id_plan,
            estado_ot: { [Op.notIn]: ['completada', 'cancelada', 'rechazado'] }
          }
        });

        if (!otExistente) {
          console.log(`[Scheduler] Vehículo ${vehiculo.patente} requiere mantenimiento "${plan.desc_plan}". Generando OT...`);
          
          const t = await sequelize.transaction();
          try {
            // Crear la nueva Orden de Trabajo
            await OrdenTrabajo.create({
              fec_ini_ot: new Date(),
              estado_ot: 'sin_iniciar',
              prioridad: 'media', // o la que definas por defecto
              km_ot: vehiculo.km_vehi,
              descripcion_ot: `Mantenimiento Preventivo Automático: ${plan.desc_plan}`,
              vehiculo_id_vehi: vehiculo.id_vehi,
              vehiculo_planificacion_vehiculo_id_vehi: vehiculo.id_vehi,
              vehiculo_planificacion_plan_id_plan: plan.id_plan,
            }, { transaction: t });
            
            // Actualizar la fecha y/o KM del próximo mantenimiento en la tabla de asociación
            let proximoKm = km_prox_plan;
            let proximaFecha = fec_prox_plan;

            if (plan.tipo_frecuencia === 'km') {
              proximoKm = vehiculo.km_vehi + plan.frecuencia;
            } else {
              const unidad = plan.tipo_frecuencia === 'dias' ? 'days' : plan.tipo_frecuencia;
              proximaFecha = format(add(new Date(), { [unidad]: plan.frecuencia }), 'yyyy-MM-dd');
            }

            await asociacion.update({
              fec_ult_plan: new Date(),
              km_ult_plan: vehiculo.km_vehi,
              fec_prox_plan: proximaFecha,
              km_prox_plan: proximoKm
            }, { transaction: t });

            await t.commit();
            console.log(`[Scheduler] OT para ${vehiculo.patente} creada y planificación actualizada.`);

          } catch (error) {
            await t.rollback();
            console.error(`[Scheduler] Error al crear OT para vehículo ${vehiculo.patente}:`, error);
          }
        }
      }
    }
  } catch (error) {
    console.error('[Scheduler] Error general en la verificación de mantenimientos:', error);
  } finally {
    console.log(`[Scheduler] ${new Date().toISOString()} - Verificación de mantenimientos finalizada.`);
  }
}

module.exports = { verificarYGenerarOts };