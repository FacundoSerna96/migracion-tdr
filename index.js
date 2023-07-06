const express = require('express');
const app = express();
const port = 3000;

// Middleware para procesar los cuerpos de las solicitudes en formato JSON
app.use(express.json());

// Ruta para manejar una solicitud POST
app.post('/declararArchivo', (req, res) => {
    const { path } = req.body;
    
    // Aquí puedes realizar operaciones con los datos recibidos
  
    res.status(201).json({ mensaje: 'ok' });
  });

// Ruta de ejemplo
app.get('/', (req, res) => {
  res.send('¡Hola, mundo!');
});


// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor Express escuchando en el puerto ${port}`);
  });