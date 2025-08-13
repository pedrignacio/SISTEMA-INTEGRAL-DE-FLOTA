const {
  Vehiculo,
  OrdenTrabajo,
  sequelize,
  Siniestro,
  RegistroCombustible,
  DetalleOt,
  AsignacionRecorrido,
  PlanificacionMantenimiento,
  Usuario,
  VehiculoPlanificacion, // Importación que faltaba antes
} = require('../models');
const { Op } = require('sequelize');
const { differenceInDays } = require('date-fns'); // Importación que faltaba antes

/**
 * Función auxiliar para encontrar el próximo mantenimiento programado.
 */
async function getProximoMantenimientoInfo() {
  try {
    const proximaPlanificacion = await VehiculoPlanificacion.findOne({
      where: {
        fec_prox_plan: {
          [Op.gte]: new Date(),
        },
      },
      order: [['fec_prox_plan', 'ASC']],
      include: [
        { model: Vehiculo, as: 'vehiculo', attributes: ['patente'] },
        {
          model: PlanificacionMantenimiento,
          as: 'planificacion',
          attributes: ['desc_plan'],
        },
      ],
    });

    if (!proximaPlanificacion) {
      return {
        dias_restantes: null,
        descripcion: 'No hay mantenimientos programados.',
      };
    }

    // ===== INICIO DE LA CORRECIÓN DEFINITIVA =====
    // EXPLICACIÓN: Usamos el método .get() de Sequelize. Esta es la forma
    // 100% segura de obtener los datos sin importar si el nombre es camelCase o snake_case.
    const fechaProxima = proximaPlanificacion.get('fecProxPlan');
    const descripcionPlan = proximaPlanificacion
      .get('planificacion')
      ?.get('desc_plan');
    const patenteVehiculo = proximaPlanificacion
      .get('vehiculo')
      ?.get('patente');

    if (!fechaProxima || !descripcionPlan || !patenteVehiculo) {
      console.error(
        'Dato inconsistente encontrado:',
        proximaPlanificacion.toJSON()
      );
      return {
        dias_restantes: null,
        descripcion: 'Dato de planificación inconsistente.',
      };
    }

    const diasRestantes = differenceInDays(new Date(fechaProxima), new Date());

    return {
      dias_restantes: diasRestantes,
      descripcion: `${descripcionPlan} para ${patenteVehiculo}`,
    };
    // ===== FIN DE LA CORRECCIÓN DEFINITIVA =====
  } catch (error) {
    console.error('Error al calcular el próximo mantenimiento:', error);
    return { dias_restantes: null, descripcion: 'Error al calcular' };
  }
}

exports.getDashboardKpis = async (req, res) => {
  try {
    console.log('\n--- [START] Calculando KPIs para el Dashboard ---');
    const treintaDiasAtras = new Date();
    treintaDiasAtras.setDate(treintaDiasAtras.getDate() - 30);

    const totalVehiculos = await Vehiculo.count();
    const vehiculosPorEstadoRaw = await Vehiculo.findAll({
      attributes: [
        'estado_vehi',
        [sequelize.fn('COUNT', sequelize.col('estado_vehi')), 'count'],
      ],
      group: ['estado_vehi'],
      raw: true,
    });
    const estadoVehiculos = vehiculosPorEstadoRaw.reduce((acc, item) => {
      acc[item.estado_vehi] = parseInt(item.count, 10);
      return acc;
    }, {});

    const siniestrosMes = await Siniestro.count({
      where: { fec_sini: { [Op.gte]: treintaDiasAtras } },
    });

    const totalKmRecorridosResult = await AsignacionRecorrido.findOne({
      attributes: [
        [sequelize.literal('SUM(km_fin_recor - km_ini_recor)'), 'totalKm'],
      ],
      where: {
        fec_fin_recor: { [Op.gte]: treintaDiasAtras },
        estado_asig: 'completado',
      },
      raw: true,
    });
    const totalKmRecorridos = totalKmRecorridosResult?.totalKm || 0;

    const totalLitrosConsumidos = await RegistroCombustible.sum('litros', {
      where: { fec_comb: { [Op.gte]: treintaDiasAtras } },
    });

    // Cálculo de eficiencia basado en recorridos y consumo de combustible
    const eficienciaCombustiblePeriodo =
      totalLitrosConsumidos > 0 ? totalKmRecorridos / totalLitrosConsumidos : 0;

    // Cálculo de eficiencia promedio de todos los vehículos con eficiencia asignada
    const vehiculosConEficiencia = await Vehiculo.findAll({
      attributes: ['efi_comb'],
      where: {
        efi_comb: {
          [Op.not]: null,
          [Op.gt]: 0,
        },
      },
      raw: true,
    });

    // Calcular el promedio solo si hay vehículos con eficiencia asignada
    let eficienciaPromedio = 0;
    if (vehiculosConEficiencia.length > 0) {
      const sumaEficiencias = vehiculosConEficiencia.reduce(
        (sum, vehiculo) => sum + parseFloat(vehiculo.efi_comb),
        0
      );
      eficienciaPromedio = sumaEficiencias / vehiculosConEficiencia.length;
    }

    const recorridosEnCurso = await AsignacionRecorrido.count({
      where: { estado_asig: 'en_progreso' },
    });

    const alertasMantenimientoPendiente = await OrdenTrabajo.count({
      where: {
        estado_ot: { [Op.notIn]: ['completada', 'cancelada', 'rechazado'] },
      },
    });

    const alertasSiniestrosPendientes = await Siniestro.count({
      where: { estado_sin: { [Op.in]: ['reportado', 'en_revision'] } },
    });

    const proximoMantenimiento = await getProximoMantenimientoInfo();

    const kpis = {
      totalVehiculos,
      vehiculosOperativos: estadoVehiculos.activo || 0,
      vehiculosEnTaller:
        (estadoVehiculos.mantenimiento || 0) + (estadoVehiculos.taller || 0),
      siniestrosMes,
      eficienciaCombustiblePromedio: parseFloat(eficienciaPromedio.toFixed(2)),
      eficienciaCombustiblePeriodo: parseFloat(
        eficienciaCombustiblePeriodo.toFixed(2)
      ),
      vehiculosConEficiencia: vehiculosConEficiencia.length,
      recorridosEnCurso,
      alertasMantenimientoPendiente,
      alertasSiniestrosPendientes,
      proximoMantenimiento,
    };

    console.log('--- [FINAL] KPIs a enviar al frontend ---', kpis);
    res.status(200).json(kpis);
  } catch (error) {
    console.error('Error al obtener KPIs del dashboard:', error);
    res
      .status(500)
      .json({ message: 'Error interno del servidor', error: error.message });
  }
};

exports.getVehiculosPorTipo = async (req, res) => {
  try {
    const stats = await Vehiculo.findAll({
      attributes: [
        'tipo_vehi',
        [sequelize.fn('COUNT', sequelize.col('tipo_vehi')), 'count'],
      ],
      group: ['tipo_vehi'],
      raw: true,
    });
    const chartData = {
      labels: stats.map(item => item.tipo_vehi || 'Desconocido'),
      data: stats.map(item => item.count),
    };
    res.status(200).json(chartData);
  } catch (error) {
    console.error(
      'Error al obtener estadísticas de vehículos por tipo:',
      error
    );
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

exports.getMantenimientosPorEstado = async (req, res) => {
  try {
    const stats = await OrdenTrabajo.findAll({
      attributes: [
        'estado_ot',
        [sequelize.fn('COUNT', sequelize.col('estado_ot')), 'count'],
      ],
      group: ['estado_ot'],
      raw: true,
    });
    const chartData = {
      labels: stats.map(item => {
        const estado = item.estado_ot;
        return estado.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      }),
      data: stats.map(item => item.count),
    };
    res.status(200).json(chartData);
  } catch (error) {
    console.error('Error al obtener estadísticas de mantenimientos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};
