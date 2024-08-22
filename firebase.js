const { initializeApp } = require('firebase/app')
const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = require('firebase/auth')
const { getFirestore, getDoc, doc, collection, query, getDocs, setDoc, where } = require('firebase/firestore')
const firebaseConfig = require('./firebase.config')

let app
let firestoreDB

const initializeFireabseApp = () => {
  try {
    app = initializeApp(firebaseConfig)
    firestoreDB = getFirestore()
    return app
  } catch (error) {
    console.log('error al inicializar firebase', error)
  }
}

const getFirebaseApp = () => app

const registerUser = async (email, password, nombre, apellidos) => {
  
}

const handleLogin = async (email, password) => {
  
}

const getGardensByUserId = async (uid) => {
    
} 

module.exports = {
  initializeFireabseApp,
  getFirebaseApp,
  handleLogin,
  registerUser,
  getGardensByUserId
}
