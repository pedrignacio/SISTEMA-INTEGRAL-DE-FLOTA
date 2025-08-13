// backend/server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const path = require('path');
const db = require('./models');
// ... otras importaciones de rutas
const planificacionMantenimientoRoutes = require('./routes/planificacionMantenimiento.routes');
const ordenTrabajoRoutes = require('./routes/ordenTrabajo.routes.js'); // <--- 1. IMPORTAR NUEVAS RUTAS
// Rutas refactorizadas
const planificacionRoutesRefactored = require('./routes/planificacion.routes.refactored');
const ordenTrabajoRoutesRefactored = require('./routes/ordenTrabajo.routes.refactored');
// Rutas API
const vehiculoRoutes = require('./routes/vehiculos.js');
const statsRoutes = require('./routes/stats.routes.js');
const siniestroRoutes = require('./routes/siniestros');
const combustibleRoutes = require('./routes/combustibles');
const vehicleRoutes = require('./routes/vehiculos');
const authRoutes = require('./routes/auth');
const routeRoutes = require('./routes/rutas');
const asignacionRecorridoRoutes = require('./routes/asignacionesRecorrido');
const usuarioRoutes = require('./routes/usuario.routes.js');
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin: '*' }));
app.use(express.json());

app.use((req, res, next) => {
  req.io = io;
  next();
});

async function testDbConnectionAndSync() {
  try {
    await db.sequelize.authenticate();
    console.log(
      '✅ Conexión a la Base de Datos (Sequelize) establecida correctamente.'
    );
  } catch (error) {
    console.error(
      '❌ Error al conectar o sincronizar con la Base de Datos:',
      error
    );
  }
}
testDbConnectionAndSync();

app.get('/', (req, res) => {
  res.send('¡API de Gestión de Flota v1.0 funcionando!');
});

// --- REGISTRO DE RUTAS API ---

app.use('/api/stats', statsRoutes);
app.use('/api/siniestros', siniestroRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/combustibles', combustibleRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/vehiculos', vehiculoRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/rutas', routeRoutes);
app.use('/api/asignaciones-recorrido', asignacionRecorridoRoutes);
app.use('/api/planificaciones', planificacionMantenimientoRoutes);
app.use('/api/ordenes-trabajo', ordenTrabajoRoutes); // <--- 2. REGISTRAR NUEVAS RUTAS
// Rutas refactorizadas con generación automática de OTs
app.use('/api/planificaciones-v2', planificacionRoutesRefactored);
app.use('/api/ordenes-trabajo-v2', ordenTrabajoRoutesRefactored);
app.use('/api/usuarios', usuarioRoutes);
// Lógica de Socket.IO
io.on('connection', socket => {
  console.log(`🔌 Cliente conectado a Socket.IO: ${socket.id}`);

  socket.on('disconnect', reason => {
    console.log(
      `🔌 Cliente desconectado de Socket.IO: ${socket.id}. Razón: ${reason}`
    );
    if (socket.simulationIntervalId) {
      clearInterval(socket.simulationIntervalId);
      console.log(
        `[Simulación] Intervalo de simulación detenido para socket ${socket.id} debido a desconexión.`
      );
      delete socket.simulationIntervalId;
    }
  });

  // (Opcional) Suscripción a un room específico de asignación
  socket.on('subscribeToAsignacion', data => {
    const asignacionId = data?.asignacionId;
    if (asignacionId) {
      const roomName = `asignacion_${asignacionId}`;
      socket.join(roomName);
      console.log(`[Socket] Cliente ${socket.id} se unió al room ${roomName}`);
    } else {
      console.warn(
        `[Socket] Intento de suscripción sin asignacionId por cliente ${socket.id}`
      );
    }
  });

  // (Opcional) Desuscripción de un room específico de asignación
  socket.on('unsubscribeFromAsignacion', data => {
    const asignacionId = data?.asignacionId;
    if (asignacionId) {
      const roomName = `asignacion_${asignacionId}`;
      socket.leave(roomName);
      console.log(`[Socket] Cliente ${socket.id} abandonó el room ${roomName}`);
    }
  });

  socket.on('startSimulation', async data => {
    const routeId = data?.routeId;
    const vehicleNumericId = data?.vehicleId;
    const asignacionIdSimulacion = data?.asignacionId;

    console.log(
      `[Socket] Recibida petición 'startSimulation': Ruta ID=${routeId}, Vehículo ID=${vehicleNumericId}, Asignación ID=${asignacionIdSimulacion}`
    );

    if (!routeId || vehicleNumericId === undefined) {
      console.error(
        '[Simulación] Error: No se proporcionó routeId o vehicleId.'
      );
      socket.emit('simulationError', {
        message:
          'Falta ID de la ruta o ID del vehículo para iniciar la simulación.',
      });
      return;
    }

    if (socket.simulationIntervalId) {
      clearInterval(socket.simulationIntervalId);
      console.log(
        `[Simulación] Limpiando intervalo de simulación anterior para socket ${socket.id}`
      );
      delete socket.simulationIntervalId;
    }

    let puntosSimulacionArray = null;
    let nombreDeLaRuta = `Ruta ${routeId}`;

    try {
      const rutaEncontrada = await db.Ruta.findByPk(routeId);

      if (!rutaEncontrada || !rutaEncontrada.puntosRuta) {
        console.error(
          `[Simulación] Ruta ID ${routeId} no encontrada o no tiene 'puntosRuta'.`
        );
        socket.emit('simulationError', {
          message: `Ruta ${routeId} no encontrada o datos de puntos ausentes.`,
        });
        return;
      }
      nombreDeLaRuta = rutaEncontrada.nombreRuta || nombreDeLaRuta;

      try {
        puntosSimulacionArray =
          typeof rutaEncontrada.puntosRuta === 'string'
            ? JSON.parse(rutaEncontrada.puntosRuta)
            : rutaEncontrada.puntosRuta;

        if (
          !Array.isArray(puntosSimulacionArray) ||
          puntosSimulacionArray.length === 0 ||
          !puntosSimulacionArray.every(
            p =>
              Array.isArray(p) &&
              p.length === 2 &&
              typeof p[0] === 'number' &&
              typeof p[1] === 'number'
          )
        ) {
          throw new Error(
            'Los puntos de la ruta (puntosRuta) no son un array válido de coordenadas [[lat,lng],...] o están vacíos.'
          );
        }
      } catch (parseError) {
        console.error(
          `[Simulación] Error al parsear/validar puntos de ruta ID ${routeId}:`,
          parseError,
          'Valor:',
          rutaEncontrada.puntosRuta
        );
        socket.emit('simulationError', {
          message: `Error en el formato de los puntos para la ruta ${routeId}.`,
        });
        return;
      }

      let puntoActualIndex = 0;
      const intervaloDeSimulacionMs = 2000;

      console.log(
        `[Simulación] Iniciando para Ruta "${nombreDeLaRuta}" (ID ${routeId}), Vehículo ID=${vehicleNumericId}, Asignación ID=${asignacionIdSimulacion}, con ${puntosSimulacionArray.length} puntos.`
      );
      socket.emit('simulationStarted', {
        routeId,
        vehicleId: vehicleNumericId,
        asignacionId: asignacionIdSimulacion,
        routeName: nombreDeLaRuta,
      });

      socket.simulationIntervalId = setInterval(async () => {
        if (puntoActualIndex >= puntosSimulacionArray.length) {
          console.log(
            `[Simulación] Fin para Ruta "${nombreDeLaRuta}", Vehículo ID=${vehicleNumericId}, Asignación ID=${asignacionIdSimulacion}`
          );
          if (socket.simulationIntervalId)
            clearInterval(socket.simulationIntervalId);
          delete socket.simulationIntervalId;

          const endData = {
            routeId,
            vehicleId: vehicleNumericId,
            asignacionId: asignacionIdSimulacion,
            routeName: nombreDeLaRuta,
          };
          if (asignacionIdSimulacion) {
            io.to(`asignacion_${asignacionIdSimulacion}`).emit(
              'simulationEnded',
              endData
            );
          } else {
            io.emit('simulationEnded', endData);
          }
          return;
        }

        const [latitudActual, longitudActual] =
          puntosSimulacionArray[puntoActualIndex];
        const datosActualizacionVehiculo = {
          idVehi: vehicleNumericId,
          latitud: latitudActual,
          longitud: longitudActual,
          asignacionId: asignacionIdSimulacion,
        };

        console.log(
          `[Simulación] Ruta "${nombreDeLaRuta}" [${puntoActualIndex + 1}/${
            puntosSimulacionArray.length
          }]: Vehículo ID=${vehicleNumericId} -> [Lat: ${latitudActual}, Lon: ${longitudActual}], Asignación ID=${asignacionIdSimulacion}`
        );

        if (asignacionIdSimulacion) {
          io.to(`asignacion_${asignacionIdSimulacion}`).emit(
            'vehicleUpdated',
            datosActualizacionVehiculo
          );
        } else {
          io.emit('vehicleUpdated', datosActualizacionVehiculo);
        }
        puntoActualIndex++;
      }, intervaloDeSimulacionMs);
    } catch (error) {
      console.error(
        `[Simulación] Error general procesando simulación para ruta ID ${routeId}:`,
        error
      );
      socket.emit('simulationError', {
        message: `Error interno al procesar simulación para ruta ${routeId}.`,
      });
      if (socket.simulationIntervalId) {
        clearInterval(socket.simulationIntervalId);
        delete socket.simulationIntervalId;
      }
    }
  });

  socket.on('stopSimulation', data => {
    const vehicleId = data?.vehicleId;
    console.log(
      `[Socket] Recibida petición 'stopSimulation' para vehículo ${vehicleId} (o simulación de este socket)`
    );
    if (socket.simulationIntervalId) {
      clearInterval(socket.simulationIntervalId);
      delete socket.simulationIntervalId;
      socket.emit('simulationStopped', {
        message: 'Simulación detenida por el cliente.',
        vehicleId,
      });
      console.log(`[Simulación] Detenida para socket ${socket.id}`);
    } else {
      socket.emit('simulationError', {
        message: 'No hay simulación activa en este socket para detener.',
      });
    }
  });
});
const cron = require('node-cron');
const { verificarYGenerarOts } = require('./services/maintenanceScheduler');

// EXPLICACIÓN: Se configura una tarea para que se ejecute todos los días a las 03:00 AM.
// Puedes cambiar el '0 3 * * *' para ajustar la frecuencia.
console.log('🕒 Programando la tarea de verificación de mantenimientos...');
cron.schedule('0 3 * * *', () => {
  console.log('⏰ Ejecutando tarea programada: Verificación de Mantenimientos.');
  verificarYGenerarOts();
}, {
  scheduled: true,
  timezone: "America/Santiago" // Ajusta a tu zona horaria
});
const PORT = process.env.PORT || 8101;
server.listen(PORT, () => {
  console.log(
    `🚀 Servidor Express con Socket.IO corriendo en http://localhost:${PORT}`
  );
});
