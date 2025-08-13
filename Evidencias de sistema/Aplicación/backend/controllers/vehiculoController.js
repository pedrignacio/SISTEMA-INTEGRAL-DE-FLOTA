// Fichero: backend/controllers/vehiculoController.js

const {
  OrdenTrabajo,
  Siniestro,
  RegistroCombustible,
  DetalleOt,
  Usuario,
  PlanificacionMantenimiento,
  AsignacionRecorrido,
} = require('../models');
exports.getAsignacionesActivas = async (req, res) => {
  try {
    const vehiculoId = parseInt(req.params.id, 10);
    if (isNaN(vehiculoId)) {
      return res
        .status(400)
        .json({ message: 'El ID del vehículo es inválido.' });
    }

    const asignaciones = await AsignacionRecorrido.findAll({
      where: {
        vehiculo_id_vehi: vehiculoId,
        estadoAsig: {
          [require('sequelize').Op.notIn]: ['completado', 'cancelado'],
        },
      },
      order: [['fec_ini_recor', 'ASC']],
    });

    res.status(200).json(asignaciones);
  } catch (error) {
    console.error(
      'Error al obtener las asignaciones activas del vehículo:',
      error
    );
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};
exports.getHistorialByVehiculoId = async (req, res) => {
  try {
    const vehiculoId = req.params.id;

    // --- Consultas a la BD (Estas ya son correctas) ---
    const mantenimientos = await OrdenTrabajo.findAll({
      where: { vehiculoIdVehi: vehiculoId },
      include: [
        { model: DetalleOt, as: 'detalles' },
        {
          model: Usuario,
          as: 'solicitante',
          attributes: ['pri_nom_usu', 'pri_ape_usu'],
        },
        {
          model: Usuario,
          as: 'encargado',
          attributes: ['pri_nom_usu', 'pri_ape_usu'],
        },
      ],
    });

    const siniestros = await Siniestro.findAll({
      where: { vehiculoId: vehiculoId },
    });

    const combustibles = await RegistroCombustible.findAll({
      where: { vehiculoId: vehiculoId },
      include: [
        {
          model: Usuario,
          // *** CAMBIO CRÍTICO AQUÍ: Usar el alias correcto 'usuario' ***
          as: 'usuario', // <<-- ¡AHORA ES 'usuario'!
          attributes: ['pri_nom_usu', 'pri_ape_usu'],
        },
      ],
    });

    // --- Mapeo y enriquecimiento de datos ---

    const historialMantenimiento = await Promise.all(
      mantenimientos.map(async ot => {
        const otData = ot.dataValues;
        let nombrePlan = 'Mantenimiento Correctivo';
        let tecnicoAsignado = 'Técnico no asignado';
        let encargadoNombre = 'Sin encargado asignado';
        let solicitanteNombre = 'Sin solicitante';

        if (otData.planificacionMantenimientoIdPlan) {
          const plan = await PlanificacionMantenimiento.findByPk(
            otData.planificacionMantenimientoIdPlan
          );
          if (plan) nombrePlan = plan.nombre_plan;
        }

        // Obtener el nombre del técnico del primer detalle si existe
        if (
          otData.detalles &&
          otData.detalles.length > 0 &&
          otData.detalles[0].usuarioIdUsuTecnico
        ) {
          const tecnico = await Usuario.findByPk(
            otData.detalles[0].usuarioIdUsuTecnico
          );
          if (tecnico)
            tecnicoAsignado = `${tecnico.pri_nom_usu} ${tecnico.pri_ape_usu}`;
        }

        // Obtener el nombre del encargado directamente de la relación
        if (otData.encargado) {
          encargadoNombre = `${otData.encargado.pri_nom_usu} ${otData.encargado.pri_ape_usu}`;
        }

        // Obtener el nombre del solicitante directamente de la relación
        if (otData.solicitante) {
          solicitanteNombre = `${otData.solicitante.pri_nom_usu} ${otData.solicitante.pri_ape_usu}`;
        }

        const costoTotal = (otData.detalles || []).reduce((acc, detalle) => {
          return (
            acc +
            (Number(detalle.costo_repuestos) || 0) +
            (Number(detalle.costo_mo) || 0)
          );
        }, 0);

        return {
          tipo: 'Mantenimiento',
          fecha: otData.fec_cre_ot,
          titulo: nombrePlan,
          subtitulo: `Estado: ${otData.estado_ot || 'Sin estado'}`,
          costo: costoTotal,
          id: otData.id_ot,
          icon: 'build-outline',
          color: 'warning',
        };
      })
    );

    const historialSiniestro = siniestros.map(s => {
      const sData = s.dataValues;
      return {
        tipo: 'Siniestro',
        fecha: sData.fecha,
        titulo: `Siniestro: ${sData.tipo}`,
        subtitulo: `Estado: ${sData.estado}`,
        costo: null,
        id: sData.id,
        icon: 'alert-circle-outline',
        color: 'danger',
      };
    });

    const historialCombustible = combustibles.map(c => {
      // *** CAMBIO CRÍTICO AQUÍ: Accede al alias correcto 'usuario' ***
      const conductor = c.get('usuario'); // <<-- ¡AHORA ES 'usuario'!
      return {
        tipo: 'Combustible',
        fecha: c.get('fecha'),
        titulo: `Carga de ${c.get('litros')} Lts`,
        subtitulo: conductor
          ? `Registrado por: ${conductor.get('pri_nom_usu')} ${conductor.get(
              'pri_ape_usu'
            )}`
          : 'Registro manual',
        costo: c.get('monto'),
        id: c.get('id'),
        urlComprobante: c.get('urlComprobante'),
        icon: 'color-fill-outline',
        color: 'primary',
      };
    });

    const costoMantenimiento = historialMantenimiento.reduce(
      (acc, item) => acc + Number(item.costo || 0),
      0
    );
    const costoCombustible = historialCombustible.reduce(
      (acc, item) => acc + Number(item.costo || 0),
      0
    );
    let rendimientoPromedio = 0;
    if (combustibles.length > 1) {
      const combustiblesOrdenados = combustibles.sort(
        (a, b) =>
          new Date(a.get('fecha')).getTime() -
          new Date(b.get('fecha')).getTime()
      ); // Ordenar por fecha
      let kmTotalesValidos = 0;
      let litrosTotalesValidos = 0;
      for (let i = 1; i < combustiblesOrdenados.length; i++) {
        const kmAnterior = Number(
          combustiblesOrdenados[i - 1].get('kilometraje') || 0
        );
        const kmActual = Number(
          combustiblesOrdenados[i].get('kilometraje') || 0
        );
        const litrosActuales = Number(
          combustiblesOrdenados[i].get('litros') || 0
        );
        const kmTramo = kmActual - kmAnterior;
        if (kmTramo > 0 && litrosActuales > 0) {
          kmTotalesValidos += kmTramo;
          litrosTotalesValidos += litrosActuales;
        }
      }
      if (litrosTotalesValidos > 0) {
        rendimientoPromedio = kmTotalesValidos / litrosTotalesValidos;
      }
    }

    const kpis = {
      costoMantenimiento,
      costoCombustible,
      rendimientoPromedio: parseFloat(rendimientoPromedio.toFixed(2)),
    };

    const historialCompleto = [
      ...historialMantenimiento,
      ...historialSiniestro,
      ...historialCombustible,
    ];
    historialCompleto.sort(
      (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
    );
    historialCompleto.reverse();

    console.log('Objeto KPIs final enviado al frontend:', kpis);

    res.json({
      kpis,
      historial: historialCompleto,
    });
  } catch (error) {
    console.error('Error detallado en el controlador del historial:', error);
    res.status(500).send('Error en el servidor al obtener el historial.');
  }
};
