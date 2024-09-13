const firebaseConfig = require('./firebase.config')
const { initializeApp } = require('firebase/app')
const {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} = require('firebase/auth')
const {
  getFirestore,
  getDoc,
  doc,
  collection,
  query,
  getDocs,
  setDoc,
  where,
  addDoc,
  updateDoc,
} = require('firebase/firestore')
// const { initializeFireabseApp, handleLogin, registerUser, getGardensByUserId } = require('./firebase')
const verifyTokenMiddleware = require('./auth')
const { weeksLeapYearStartToEnd, weeksNonLeapYearStartToEnd } = require('./calendar')

const cors = require('cors')
const morgan = require('morgan')

const express = require('express')

let appFirebase
let firestoreDB

const app = express()
const initializeFirebaseApp = () => {
  try {
    appFirebase = initializeApp(firebaseConfig)
    firestoreDB = getFirestore()
    return appFirebase
  } catch (error) {
    console.log('error al inicializar firebase', error)
  }
}

initializeFirebaseApp()

app.use(morgan('dev'))
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

app.set('port', process.env.PORT || 3000)

app.get('/verify-token', verifyTokenMiddleware, (req, res) => {
  res.status(200).json({ message: 'Accesos concedido' })
})

app.get('/ping', (req, res) => {
  res.json({ ping: `${app.get('port')}` })
})

app.post('/register', async (req, res) => {
  const { email, password, nombre, apellidos } = req.body
  try {
    const auth = getAuth()
    // 1. Crear el usuario en Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCredential.user

    // 2. Crear el documento en Firestore usando el UID del usuario
    const userDocRef = doc(firestoreDB, 'usuarios', user.uid)
    await setDoc(userDocRef, {
      nombre,
      apellidos,
      email,
      creacion: new Date(),
      rol: 'cliente', // O 'tecnico', dependiendo del tipo de usuario,
      tecnico_id: 'CYFL84LRGPQrS9BZc5yW9zbK1812',
    })
    res.status(201).json({ uid: user.uid })
  } catch (error) {
    console.log('error al registrar', error)
    res.status(400).json({ error: error.message })
  }
})

app.post('/login', async (req, res) => {
  const { email, password } = req.body
  try {
    const auth = getAuth()
    const sign_in = await signInWithEmailAndPassword(auth, email, password)
    user = sign_in.user

    const token = await user.getIdToken()
    const refreshToken = user.refreshToken
    const uid = user.uid

    const userDocRef = doc(firestoreDB, 'usuarios', uid)
    const userDoc = await getDoc(userDocRef)
    let data = {}

    if (userDoc.exists()) {
      data = userDoc.data()
    }

    const obj = {
      token,
      refreshToken,
      uid,
      data: {
        ...data,
      },
    }
    res.status(200).json(obj)
  } catch (error) {
    console.error('error al iniciar sesion', error)
    res.status(404).json({ message: 'Error al iniciar sesión', error })
  }
})

app.get('/gardens/:id', async (req, res) => {
  const uid = req.params.id
  console.log('id del agricultor', uid)
  const huertosRef = collection(firestoreDB, 'huertos')
  const q = query(huertosRef, where('cliente_id', '==', uid))

  try {
    const snapshot = await getDocs(q)
    const gardens = []

    snapshot.forEach(doc => {
      gardens.push({ id: doc.id, ...doc.data() })
    })
    console.log('huertos', gardens)
    res.status(200).json(gardens)
  } catch (error) {
    console.log('error al traer los huertos', error)
    res.status(404).json({ message: 'Huerto no encontrado' }).json({ error: error.message })
  }
})

app.get('/garden/:id')

app.get('/client/:id', async (req, res) => {
  const uid = req.params.id
  console.log('id del cliente', uid)
  const clientRef = doc(firestoreDB, 'usuarios', uid)
  // const q = query(huertosRef, where('id', '==', uid))

  try {
    // const snapshot = await getDocs(q)
    // const gardens = []

    // snapshot.forEach(doc => {
    //   gardens.push({ id: doc.id, ...doc.data() })
    // })
    // console.log('huertos', gardens)
    // res.status(200).json(gardens)
    const userDoc = await getDoc(clientRef)
    let data = {}

    if (userDoc.exists()) {
      data = userDoc.data()
    }

    const obj = {
      uid,
      ...data,
    }
    res.status(200).json(obj)
  } catch (error) {
    console.log('error al traer al cliente', error)
    res.status(404).json({ message: 'Huerto no encontrado' }).json({ error: error.message })
  }
})

/* ----- TECNICO ----- */
// app.post('/register/tech', async (req, res) => {
//   // const { email, password, nombre, apellidos } = req.body
//   try {
//     const auth = getAuth()
//     // 1. Crear el usuario en Firebase Authentication
//     const userCredential = await createUserWithEmailAndPassword(auth, 'sistema.coa@gmail.com', 'admin12')
//     const user = userCredential.user

//     // 2. Crear el documento en Firestore usando el UID del usuario
//     const userDocRef = doc(firestoreDB, 'usuarios', user.uid)
//     await setDoc(userDocRef, {
//       nombre: 'Gerardo',
//       apellidos: 'Cervantes',
//       email: 'sistema.coa@gmail.com',
//       creacion: new Date(),
//       rol: 'tecnico', // O 'tecnico', dependiendo del tipo de usuario
//     })
//     res.status(201).json({ uid: user.uid })
//   } catch (error) {
//     console.log('error al registrar', error)
//     res.status(400).json({ error: error.message })
//   }

// })

app.get('/tech/clients/:id', async (req, res) => {
  const id = req.params.id

  const usersRef = collection(firestoreDB, 'usuarios')
  const q = query(usersRef, where('tecnico_id', '==', id))

  try {
    const querySnapshot = await getDocs(q)

    // Extraer los datos de los usuarios
    const clientes = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }))

    clientes.sort((a, b) => {
      const nameA = a.nombre.toUpperCase()
      const nameB = b.nombre.toUpperCase()

      if(nameA > nameB ) return 1
      if(nameA < nameB ) return -1
      return 0
    })

    console.log(clientes)
    res.status(200).json(clientes)
  } catch (error) {
    res.status(404).json({ message: `Huerto no encontrado ${error}` })
  }
})

app.post('/tech/reportes', async (req, res) => {
  try {
    const form = req.body
    if (!form.agricultor_id || !form.huerto_id || !form.etapa_fenologica) {
      res.status(400).json({ error: 'Faltan datos' })
    }

    const docRef = await addDoc(collection(firestoreDB, 'reportes'), {
      agricultor_id: form.agricultor_id,
      enfermedades: form.enfermedades,
      estado_general: form.estado_general,
      etapa_fenologica: form.etapa_fenologica,
      fecha: form.fecha,
      huerto_id: form.huerto_id,
      observaciones: form.observaciones,
      plagas: form.plagas,
      recomendaciones: form.recomendaciones,
      nombre: form.nombre,
      nombre_huerto: form.nombre_huerto,
    })

    res.status(201).json({ id: docRef.id, data: form })
  } catch (error) {
    console.error('Error al crear reporte', error)
    res.status(500).json({ error: 'Error al crear reporte' })
  }
})

app.get('/tech/reportes/:id', async (req, res) => {
  //el id es del cliente al que quiere listar
  const id = req.params.id

  const reportsRef = collection(firestoreDB, 'reportes')
  const q = query(reportsRef, where('agricultor_id', '==', id))

  try {
    const querySnapshot = await getDocs(q)
    const reports = querySnapshot.docs.map(report => ({
      id: report.id,
      ...report.data(),
    }))

    res.status(200).json(reports)
  } catch (error) {
    res.status(404).json({ message: 'Huerto no encontrado' }).json({ error: error })
  }
})

//editar reporte
app.put('/tech/reportes/:id', async (req, res) => {
  // id del reporte
  const id = req.params.id
  const form = req.body
  const newObj = {
    agricultor_id: form.agricultor_id,
    enfermedades: form.enfermedades,
    estado_general: form.estado_general,
    etapa_fenologica: form.etapa_fenologica,
    fecha: form.fecha,
    huerto_id: form.huerto_id,
    observaciones: form.observaciones,
    plagas: form.plagas,
    recomendaciones: form.recomendaciones,
    nombre: form.nombre,
    nombre_huerto: form.nombre_huerto,
  }

  try {
    const reporteRef = doc(firestoreDB, 'reportes', id)

    await updateDoc(reporteRef, newObj)

    res.status(200).json({ message: 'Reporte actualizado exitosamente' })
  } catch (error) {
    console.error('Error al actualizar el reporte', error)
    res.status(500).json({ message: 'Error al actualizar el reporte', error })
  }
})

app.post('/tech/sugerencias', async (req, res) => {
  const { gardenId, newSuggestions } = req.body

  if (newSuggestions.length === 0) return res.status(400).json({ message: 'Falta sugerencia' })

  try {
    const gardenRef = doc(firestoreDB, 'huertos', gardenId)

    const snap = await getDoc(gardenRef)

    if (!snap.exists()) res.status(404).json({ message: 'Huerto no encontrado' })

    const data = snap.data()
    const currentSugegstions = data.recomendaciones || []

    const updateSuggestions = currentSugegstions.concat(newSuggestions)

    await updateDoc(gardenRef, { recomendaciones: updateSuggestions })

    res
      .status(200)
      .json({ message: 'Sugerencias añadidas correctamente', suggestions: updateSuggestions })
  } catch (error) {
    console.error('Error agregando sugerencias', error)
    res.status(500).json({ message: 'Error agregando sugerencias' })
  }
})

app.delete('/tech/sugerencias', async (req, res) => {
  const { gardenId, suggestion } = req.query
  console.log('entro', suggestion)
  if (!suggestion) res.status(400).json({ message: 'Falta sugerencia' })
  try {
    const gardenRef = doc(firestoreDB, 'huertos', gardenId)
    const snap = await getDoc(gardenRef)

    if (!snap.exists()) res.status(404).json({ message: 'Huerto no encontrado' })

    const data = snap.data()
    const currentSuggestions = data.recomendaciones || []

    const updatedSuggestions = currentSuggestions.filter(sugg => sugg !== suggestion)

    await updateDoc(gardenRef, { recomendaciones: updatedSuggestions })

    res
      .status(200)
      .json({ message: 'La sugerencia se elimino correctamente', suggestions: updatedSuggestions })
  } catch (error) {
    console.error('Error eliminando la recomendacion:', error)
    res.status(500).json({ message: 'Error eliminando la recomendacion' })
  }
})

app.post('/tech/caracteristicas', async (req, res) => {
  const { gardenId, key, value } = req.body

  try {
    const gardenRef = doc(firestoreDB, 'huertos', gardenId)

    const snap = await getDoc(gardenRef)

    if (!snap.exists()) res.status(404).json({ message: 'Huerto no encontrado' })

    const data = snap.data()
    const currentFeatures = data.caracteristicas || {}

    const updatedFeatures = {
      ...currentFeatures,
      [key]: value,
    }

    await updateDoc(gardenRef, { caracteristicas: updatedFeatures })

    res
      .status(200)
      .json({ message: 'Caracteristicas añadidas correctamente', caracteristicas: updatedFeatures })
  } catch (error) {
    console.error('Error agregando caracteristicas', error)
    res.status(500).json({ message: 'Error agregando caracteristicas' })
  }
})

app.delete('/tech/caracteristicas', async (req, res) => {
  const { gardenId, name } = req.body
  try {
    const gardenRef = doc(firestoreDB, 'huertos', gardenId)
    const snap = await getDoc(gardenRef)

    if (!snap.exists()) res.status(404).json({ message: 'Huerto no encontrado' })

    const data = snap.data()
    const currentFeatures = data.caracteristicas || []

    if (!currentFeatures.hasOwnProperty(name))
      res.status(404).json({ message: 'Caracteristica no encontrada' })

    delete currentFeatures[name]

    await updateDoc(gardenRef, { caracteristicas: currentFeatures })

    res.status(200).json({ message: 'La caracteristica se elimino correctamente' })
  } catch (error) {
    console.error('Error eliminando la caracteristica:', error)
    res.status(500).json({ message: 'Error eliminando la caracteristica' })
  }
})

app.put('/tech/caracteristicas', async (req, res) => {
  // id del reporte
  const { gardenId, newFeatures } = req.body

  try {
    const huertosRef = doc(firestoreDB, 'huertos', gardenId)

    await updateDoc(huertosRef, {
      caracteristicas: newFeatures,
    })

    res.status(200).json({
      message: 'Caracteristicas del huerto actualizadas exitosamente',
      features: newFeatures,
    })
  } catch (error) {
    console.error('Error al actualizar las características', error)
    res.status(500).json({ message: 'Error al actualizar las características', error })
  }
})

app.post('/tech/fertilizantes', async (req, res) => {
  const { gardenId, amount, date, formula, area } = req.body

  try {
    const gardenRef = doc(firestoreDB, 'huertos', gardenId)

    const snap = await getDoc(gardenRef)

    if (!snap.exists()) res.status(404).json({ message: 'Huerto no encontrado' })

    const data = snap.data()
    const currentFeatures = data.historial_fertilizante || []

    const updatedFertilizers = currentFeatures.concat([
      {
        cantidad: amount,
        fecha: date,
        formula,
        area,
      },
    ])

    await updateDoc(gardenRef, { historial_fertilizante: updatedFertilizers })

    res.status(200).json({
      message: 'Fertilizante añadido correctamente',
      historial_fertilizante: updatedFertilizers,
    })
  } catch (error) {
    console.error('Error agregando fertilizante', error)
    res.status(500).json({ message: 'Error agregando fertilizante' })
  }
})

app.get('/tech/calendario/:tecnico', async (req, res) => {
  try {
    const tecnicoId = req.params.tecnico
    const reportsRef = collection(firestoreDB, 'usuarios')
    const q = query(reportsRef, where('tecnico_id', '==', tecnicoId), where('rol', '==', 'cliente'))
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty)
      return res.status(404).json({ message: 'No se encontraron usuarios con este tecnico' })

    const clientsHistory = []

    querySnapshot.forEach(doc => {
      const clientData = doc.data()

      if (clientData.historial_estados_huertos) {
        clientsHistory.push({
          id: doc.id,
          name: `${clientData.nombre} ${clientData.apellido}`,
          historial_estados_huertos: clientData.historial_estados_huertos
        })
      }
    })
    
    clientsHistory.sort((a, b) => {
      const nameA = a.name.toUpperCase()
      const nameB = b.name.toUpperCase()
      
      if(nameA > nameB ) return 1
      if(nameA < nameB ) return -1
      return 0
    })
    
    console.log(clientsHistory[0].historial_estados_huertos[0].fecha)
    const response = createClientObjects(clientsHistory)
    return res.status(200).json(response)
  } catch (error) {
    console.error('Error al obtener el historial  de estados de los huertos', error)
    res.status(500).json({ error: 'Error al obtener datos de los huertos', error })
  }
})


const getWeekForDate = (date, weeks) => {
  const parsedDate = new Date(date);
  for (const week of weeks) {
    const start = new Date(week.start);
    const end = new Date(week.end);
    if (parsedDate >= start && parsedDate <= end) {
      return week;
    }
  }
  return null;
};

const createClientObjects = (data) => {
  return data.map(client => {
    // Crear un objeto vacío para los meses
    const meses = Object.keys(weeksLeapYearStartToEnd).map(month => {
      // Crear un array con las semanas del mes inicializadas a `null`
      const monthWeeks = Array(weeksLeapYearStartToEnd[month].length).fill(null);

      // Iterar por cada estado del historial del cliente
      client.historial_estados_huertos.forEach(entry => {
        // Iterar por las semanas del mes actual
        for (let i = 0; i < weeksLeapYearStartToEnd[month].length; i++) {
          const week = weeksLeapYearStartToEnd[month][i];
          const weekRange = getWeekForDate(entry.fecha, weeksLeapYearStartToEnd[month]);

          // Si la fecha corresponde a esta semana, guardar el estado y romper el ciclo
          if (weekRange && entry.fecha >= week.start && entry.fecha <= week.end) {
            monthWeeks[i] = {estado: entry.estado, atributos: entry.atributos};
            break; // Salir del ciclo una vez se haya asignado el estado
          }
        }
      });

      return monthWeeks;
    });

    return {
      name: client.name,
      meses
    };
  });
};

app.post('/tech/register/client', async (req, res) => {
  const request = req.body

  if (!request.name) return res.status(400).json({ message: 'Falta nombre' })
  if (!request.apellido) return res.status(400).json({ message: 'Falta apellido' })
  if (!request.email) return res.status(400).json({ message: 'Falta email' })
  if (!request.tecnicoId) return res.status(400).json({ message: 'Falta id del tecnico' })

  try {
    const userRef = await addDoc(collection(firestoreDB, 'usuarios'), {
      apellido: request.lastname,
      creacion: new Date(),
      email: request.email,
      nombre: request.name,
      rol: 'cliente',
      tecnico_id: request.tecnico_id,
    })

    res.status(200).json({ id: userRef.id, data: request })
  } catch (error) {
    console.error('Error al crear cliente', error)
    res.status(500).json({ message: 'Error al crear cliente', error })
  }
})

app.listen(app.get('port'))
