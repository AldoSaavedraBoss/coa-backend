const jose = require('node-jose')
const axios = require('axios')
const firebaseConfig = require('./firebase.config')

const CERT_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'

async function getPublicKeys() {
  try {
    const response = await axios.get(CERT_URL)
    return response.data
  } catch (error) {
    throw new Error('Error al obtener las claves públicas')
  }
}

const verifyToken = async token => {
  try {
    const publicKeys = await getPublicKeys()

    const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64').toString())
    const key = publicKeys[header.kid]

    if(!key) throw new Error('Token invalido')

    const keyStore = jose.JWK.createKeyStore()
    const jwk = await keyStore.add(key, 'pem')

    const result = await jose.JWS.createVerify(jwk).verify(token)

    const claims = JSON.parse(result.payload.toString())

    const projectId = firebaseConfig.projectId
    if(claims.iss !== `https://securetoken.google.com/${projectId}` || claims.aud !== projectId) throw new Error('Token no valido')

    const now = Math.floor(new Date().getTime() / 1000)
    if(claims.exp < now) throw new Error('Token expirado');
    
    return claims

  } catch (error) {
    console.error('Error al verificar el token', error)
    return null
  }
}

const verifyTokenMiddleware  = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]

  if(!token) return res.status(401).json({message: 'Token no proporcionado'})

  const decodedToken = await verifyToken(token)

  if(!decodedToken) res.status(403).json({message: 'Token no valido'})

  req.user = decodedToken
  next()
}

module.exports = verifyTokenMiddleware
