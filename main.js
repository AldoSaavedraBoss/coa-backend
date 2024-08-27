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
  addDoc
} = require('firebase/firestore')
// const { initializeFireabseApp, handleLogin, registerUser, getGardensByUserId } = require('./firebase')
const authenticateToken = require('./auth')

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

app.get('/verify-token', authenticateToken)

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
    res.status(404).json({ error: error })
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
    res.status(404).json({ error: error.message })
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
    res.status(404).json({ error: error.message })
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
  console.log(clientes)
  res.status(200).json(clientes)
  } catch (error) {
    res.status(404).json({error: error})
  }
})

app.post('/tech/reportes', async (req, res) => {
  try {
    const newReport = req.body
    if(!newReport.agricultor_id || !newReport.huerto_id || !newReport.etapa_fenologica){
      res.status(400).json({error: 'Faltan datos'})
    }

    const docRef =  await addDoc(collection(firestoreDB, 'reportes'), {
      agricultor_id: newReport.agricultor_id,
      enfermedades: newReport.enfermedades,
      estado_general: newReport.estado_general,
      etapa_fenologica: newReport.etapa_fenologica,
      fecha: newReport.fecha,
      huerto_id: newReport.huerto_id,
      observaciones: newReport.observaciones,
      plagas: newReport.plagas,
      recomendaciones: newReport.recomendaciones,
      nombre: newReport.nombre,
      nombre_huerto: newReport.nombre_huerto
  })

  res.status(201).json({id: docRef.id, data: newReport})
  } catch (error) {
    console.error('Error al crear reporte', error)
    res.status(500).json({error: 'Error al crear reporte'})
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
      ...report.data()
    }))

    res.status(200).json(reports)
  } catch (error) {
    res.status(404).json({error: error})
  }
})

app.listen(app.get('port'))
