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
const hijosRecursivos = async (uuid, token, categoria) => {
    
  const children = await api.nodes.getNodeChildren(uuid, { 
      include: ['properties'],
      maxItems: 100000,
      skipCount: 0
  }) 
  
  //recorre todos los hijos
  children.list.entries.forEach(element => {
    //verifica si es archivo o carpeta
    if(!element.entry.isFile){ 
        hijosRecursivos(element.entry.id,token, categoria)
    }else{
      api.core.nodesApi.getNode(element.entry.id).then(async (file) => {

        ///////////////////////////////////////
        //SE DECLARA COMO ARCHIVO
        var myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");
        myHeaders.append("Accept", "application/json");
        myHeaders.append("Authorization", token);
        myHeaders.append("Cookie", "alf_affinity_route=8b853172f90123fcfc08f15bdc8677b4034e07db");
        
        var raw = JSON.stringify({
          "actionDefinitionId": "create-record",
          "targetId": element.entry.id,
          "params": {}
        });
        
        var requestOptions = {
          method: 'POST',
          headers: myHeaders,
          body: raw,
          redirect: 'follow'
        };
        
        await fetch(process.env.API, requestOptions)
        .then(response => response.text())
        .then(result => {
          console.clear();
          writeToLog(`Se declara como archivo el doc con uuid: ${element.entry.id}`);
          console.log("Se declara como archivo el doc con uuid: ", element.entry.id)
        })
        .catch(error => console.log('error', error));

        /////////////////////////////////////////////////////////
        //SE AGREGA METADATA OBLIGATORIA
        var raw = JSON.stringify({
            "properties": {
                "dod:originator": "Administrador",
                "dod:publicationDate": "2023-03-31T00:00:00.000+0000",
                "dod:originatingOrganization": "Administrador"
              }
          });

        var requestOptions = {
        method: 'PUT',
        headers: myHeaders,
        body: raw
        };

        await fetch(`https://testdms.tigo.com.co/alfresco/api/-default-/public/alfresco/versions/1/nodes/${element.entry.id}`, requestOptions)
        .then(result => {
          console.clear();
          writeToLog(`Se modifican los metadatos del doc con uuid: ${element.entry.id}`);
          console.log("Se modifican los metadatos del doc con uuid: ", element.entry.id)
        })
        .catch(error => {
          console.log('error', error)
          writeToLog(`error: ${error} en uuid: ${element.entry.id}`)
        });

        ///////////////////////////////////
        //SE MUEVE EL ARCHIVO A LA CATEGORIA
        await api.core.nodesApi.moveNode(element.entry.id,{
          targetParentId: categoria
        }).then((res) => {
         // console.log("contenido del resultado de mover: ", res)
          writeToLog(`Se mueve el archivo ${element.entry.id} a la categoria : ${categoria}`);
          console.log(`Se mueve el archivo ${element.entry.id} a la categoria : ${categoria}`)
        }).catch((error) =>{
          console.log('error al mover', error)
          writeToLog(`error al movers: ${error} en uuid: ${element.entry.id}`)
        })

        
        return
      }, (error) => {
          console.log("Error al obtener el uuid: " + error);
      });
    }
  });
}

const declararCompletoRecursivo = async (uuid, token) => {

  const children = await api.nodes.getNodeChildren(uuid, { 
    include: ['properties'],
    maxItems: 100000,
    skipCount: 0
  })

  var myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");
  myHeaders.append("Authorization", token);
  myHeaders.append("Cookie", "alf_affinity_route=8b853172f90123fcfc08f15bdc8677b4034e07db");


  children.list.entries.forEach(async element => {
    if(!element.entry.isFile){ 
      declararCompletoRecursivo(element.entry.id,token)
    }else{
      /////////////////////////////////////////////////////////
      //DECLARAR EL ARCHIVO COMO COMPLETO

      var raw = JSON.stringify({
        "name": "declareRecord",
        "nodeRef": `workspace://SpacesStore/${element.entry.id}`
      });

      var requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow'
      };

      await fetch("https://testdms.tigo.com.co/alfresco/s/api/rma/actions/ExecutionQueue", requestOptions)
      .then((res) => {
        writeToLog(`Se completa el archivo ${element.entry.id}`);
        console.log(`Se completa el archivo  ${element.entry.id}`)
      }).catch((error) => {
        console.log('error al completar el archivo', error)
        writeToLog(`error al completar el archivo: ${error} en uuid: ${element.entry.id}`)
      })
      /////////////////////////////////////////////////////////

      return;
    }
  })
}

// Declara los archivos por uuid del padre
app.post('/declararArchivo', async (req, res) => {
    const { uuid_path, token, categoria } = req.body;
    try {
        //obtiene la lista de uuid 
        //en base al uuid padre del path
        const res = await hijosRecursivos(uuid_path, token, categoria);

        res.status(201).json({
            status: 'ok',
            msg: `Total documentos afectados: ${listaUUID.length}`
        });

    } catch (error) {
        res.status(200).json({
            "msg": "ok",
        })
    }
});

app.post('/declararCompleto', async (req,res) =>{

  //obtiene del body el uuid de la carpeta padre
  //luego declara como completo todos los archivos hijos
  const {uuid_path, token} = req.body;

  try {
    await declararCompletoRecursivo(uuid_path, token)
    return res.status(200).json({
      msg: 'ok'
    })
  } catch (error) {
    console.log(error)
    return res.status(400).json({
      msg: 'error',
      error
    })
  }

})

app.post('/pruebaBulkImport', async (req,res) => {
  
})

// Ruta de ejemplo
app.get('/', (req, res) => {
  res.send('¡Hola, mundo!');
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor Express escuchando en el puerto ${port}`);
  });