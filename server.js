const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mysql = require('mysql2/promise');
const path = require('path');

// Configuración de la conexión a MySQL
const dbConfig = {
  host: 'beztemoivhfz3gme6cg2-mysql.services.clever-cloud.com',
  user: 'ueimrvxlppm556x2',
  password: 'g4RxFIaDLiTjAdDY1DZZ',
  database: 'beztemoivhfz3gme6cg2',
  port: 3306
};

// Crear un pool de conexiones
const pool = mysql.createPool(dbConfig);

// Función para obtener el último reporte
async function getLastReport() {
  try {
    const [rows] = await pool.query('SELECT numero, zona, hora, observaciones, imagen, ataco FROM reporte ORDER BY numero DESC LIMIT 1');
    return rows[0];
  } catch (error) {
    console.error('Error al obtener el último reporte:', error);
    return null;
  }
}

// Configuración del servidor Express y Socket.IO
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware para servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Ruta para la página principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Lógica para monitorear la base de datos
async function monitorDatabase() {
  let lastKnownNumber = 0;
  console.log('Iniciando monitoreo. Último número conocido:', lastKnownNumber);

  setInterval(async () => {
    try {
      const lastReport = await getLastReport();
      if (lastReport && lastReport.numero > lastKnownNumber) {
        console.log('¡ALERTA! Nuevo reporte detectado:', lastReport.numero);
        
        // Enviar notificación a los clientes conectados
        io.emit('new-report', {
          observaciones: lastReport.observaciones,
          zona: lastReport.zona,
          hora: lastReport.hora, // Se asume que esto es solo hora en formato varchar
          ataco: lastReport.ataco
        });

        lastKnownNumber = lastReport.numero;
      }
    } catch (error) {
      console.error('Error al monitorear la base de datos:', error);
    }
  }, 5000); // Revisa cada 5 segundos
}

// Iniciar el monitoreo
monitorDatabase();

// Manejar conexiones de Socket.IO
io.on('connection', (socket) => {
  console.log('Nuevo cliente conectado');
  socket.on('disconnect', () => {
    console.log('Cliente desconectado');
  });
});

// Iniciar el servidor
const PORT = 5500;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
