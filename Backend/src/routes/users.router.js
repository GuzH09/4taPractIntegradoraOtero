import { Router } from 'express'
import passport from 'passport'
import UserController from '../controllers/UserController.js'
// import CurrentUserDTO from '../DTOs/currentuser.dto.js'
import { roleauth } from '../middlewares/role-authorization.js'
import { uploader } from '../utils/multerUtil.js'
import fs from 'fs'
import __dirname from '../utils/constantsUtil.js'

const usersRouter = Router()
const SessionService = new UserController()

// GET User By ID
usersRouter.get('/:uid', passport.authenticate('jwt', { session: false }), roleauth(['admin']), async (req, res) => {
  const result = await SessionService.getUser(req.params.uid)
  if (result.error) {
    req.logger.warning(result)
    return res.status(400).send(result)
  } else {
    req.logger.info({ status: 'success', payload: result })
    return res.status(200).send({ status: 'success', payload: result })
  }
})

// POST Upgrade User To Premium or viceversa
// Solo si ya se han cargado 3 documentos:
usersRouter.post('/premium/:uid', passport.authenticate('jwt', { session: false }), roleauth(['admin']), async (req, res) => {
  const user = await SessionService.getUser(req.params.uid)
  if (user.error) {
    req.logger.warning(user)
    return res.status(400).send(user)
  } else {
    req.logger.info({ user })
  }

  let result = ''
  if (user.role === 'premium') {
    result = await SessionService.updateUser(req.params.uid, 'user')
  } else {
    // Check if there are at least 3 files in the documents directory
    try {
      const files = await fs.promises.readdir(`${__dirname}/../../public/documents/${user._id.toString()}`)
      if (files.length >= 3) {
        // Update role to premium if there are at least 3 files
        result = await SessionService.updateUser(req.params.uid, 'premium')
      } else {
        // Return an error if there are not enough files
        result = { error: 'Not enough documents to update role to premium.' }
      }
    } catch (error) {
      result = { error: 'Not enough documents to update role to premium.' }
    }
  }

  if (result.error) {
    req.logger.warning(result)
    return res.status(400).send(result)
  } else {
    req.logger.info({ result })
    return res.status(200).send(result)
  }
})

// POST Upload documents files
usersRouter.post('/:uid/documents', passport.authenticate('jwt', { session: false }), async (req, res, next) => {
  // Conseguir el usuario
  // Validar que el usuario exista y
  // ¿No deberia validar que el usuario loggeado es el usuario que se está pasando como parametro?
  const user = await SessionService.getUser(req.params.uid)
  if (user.error) {
    req.logger.warning(user)
    return res.status(400).send(user)
  } else {
    req.logger.info({ user })
    req.userFound = user // Pasar el usuario encontrado al siguiente middleware
    // Crea la carpeta para los archivos del usuario especifico si es que no existe
    try {
      await fs.promises.mkdir(`${__dirname}/../../public/documents/${user._id.toString()}`, { recursive: true })
      await fs.promises.mkdir(`${__dirname}/../../public/img/profiles/${user._id.toString()}`, { recursive: true })
    } catch (error) {
      req.logger.warning({ error: `Error creating directory: ${error.message}` })
    }
  }
  next()
}, async (req, res, next) => {
  // Subir los archivos con el multer
  uploader.fields([
    { name: 'profilePicture', maxCount: 1 },
    { name: 'document', maxCount: 3 }
  ])(req, res, (err) => {
    if (err) {
      req.logger.warning({ error: 'Error uploading files.' })
      return res.status(400).send({ error: 'Error uploading files.' })
    }
    next()
  })
}, async (req, res) => {
  try {
    // Actualizar al usuario con las referencias a los distintos archivos
    const user = req.userFound // Usar el usuario pasado desde el primer middleware

    const { profilePicture, document } = req.files
    if (profilePicture) {
      // Actualizar ProfilePicture
      user.profilePicture = profilePicture[0].path
    }
    if (document) {
      // Actualizar Documentos
      // ¿Que pasa si se suben documentos que ya existen?
      user.documents = document.map(file => file.path)
    }

    req.logger.info({ message: 'Files uploaded successfully', user })
    res.status(200).send({ message: 'Files uploaded successfully', user })
  } catch (error) {
    req.logger.warning({ error: error.message })
    return res.status(400).send({ message: 'Error uploading files', error: error.message })
  }
})

export default usersRouter
