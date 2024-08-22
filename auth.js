const jose = require('node-jose')
const axios = require('axios')

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
    const decodedHeader = jwt.decode(token, { complete: true }).header // Verifica el token con Firebase Admin SDK

    if (decodedHeader.alg !== 'RS256') {
      throw new Error('El algoritmo de firma no es RS256')
    }

    const kid = decodedHeader.kid
    const publicKey = publicKeys[kid]

    if (!publicKey) {
      throw new Error('Clave pública no encontrada')
    }

    const key = await jose.JWK.asKey(publicKey, 'pem')

    // Verifica el token usando la clave pública
    const decodedToken = jwt.verify(token, key.toPEM(), {
      algorithms: ['RS256'],
      audience: FIREBASE_PROJECT_ID,
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
    })

    return decodedToken
    next()
  } catch (error) {
    return res.status(403).json({ message: 'Token inválido o expirado', error })
  }
}

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1] // Suponiendo que el token está en formato "Bearer <token>"

  if (!token) {
    return res.status(401).json({ message: 'Token no proporcionado' })
  }

  try {
    const decodedToken = await verifyToken(token)
    req.user = decodedToken // Puedes agregar la información del usuario a la solicitud
    next()
  } catch (error) {
    res.status(403).json({ message: `Token inválido: ${error.message}` })
  }
}

module.exports = authenticateToken
