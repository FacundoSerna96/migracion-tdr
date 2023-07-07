const express = require('express');
const AlfrescoApi = require('alfresco-js-api-node');
const writeToLog = require('./log')

require('dotenv').config();
const app = express();
const port = process.env.PORT || 3000;

// Middleware para procesar los cuerpos de las solicitudes en formato JSON
app.use(express.json());

//Conexion a Alfresco
const api = new AlfrescoApi({
    hostEcm: process.env.HOST, // URL del servidor de Alfresco
    provider: process.env.PROVIDER
});

api.login(process.env.USER, process.env.PASS).then((data) => {
    console.log("Conectado con alfresco!");
}, (err) => {
    console.log(err);
})

//Busqueda de uuid por recursion
var listaUUID = [];
const hijosRecursivos = async (uuid, token) => {
    
    const children = await api.nodes.getNodeChildren(uuid, { 
        include: ['properties'],
        maxItems: 100000,
        skipCount: 0
    }) 
    
    children.list.entries.forEach(element => {
        if(!element.entry.isFile){
            hijosRecursivos(element.entry.id,res)
        }else{
            api.core.nodesApi.getNode(element.entry.id).then(async (file) => {
                writeToLog(`Se obtiene el uuid: ${element.entry.id}`);
                console.log("Se obtiene el uuid: ", element.entry.id)

                //declara como archivo cada uuid de la lista
                let url = process.env.API

                let body = 
                {
                    "actionDefinitionId": "create-record",
                    "targetId": `${uuid}`,
                    "params": {}
                }

                let header = {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization" : token
                }

                try {
                    const resJson = await fetch(url, {
                        method: 'POST',
                        headers: header,
                        body
                    })
                    console.log("resJson: ", resJson)
                    writeToLog(`Declarado como archivo el documento con uuid: ${uuid}`)
                    console.log(`Declarado como archivo el documento con uuid: ${uuid}`)
                } catch (error) {
                    console.log("error: ", error)
                    return
                }

                

                return
            }, (error) => {
                console.log("Error al obtener el uuid: " + error);
            });
            
        }
    });

}

// Declara los archivos por uuid del padre
app.post('/declararArchivo', async (req, res) => {
    const { uuid_path, token } = req.body;

    try {
        //obtiene la lista de uuid 
        //en base al uuid padre del path
        const res = await hijosRecursivos(uuid_path, token);

        res.status(201).json({
            status: 'ok',
            msg: `Total documentos afectados: ${listaUUID.length}`
        });

    } catch (error) {
        res.status(400).json({
            "msg": "error al obtener listas de uuid",
            "error:" : error
        })
    }
  });


// Ruta de ejemplo
app.get('/', (req, res) => {
  res.send('¡Hola, mundo!');
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor Express escuchando en el puerto ${port}`);
  });