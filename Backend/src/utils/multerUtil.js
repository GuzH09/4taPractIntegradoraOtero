import multer from 'multer'

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // req.fileDestination
    let uploadPath = 'public'
    let userDestination = ''

    if (file.mimetype.startsWith('image/')) {
      if (file.fieldname === 'profilePicture') {
        userDestination = req.userFound._id.toString()
        uploadPath = uploadPath + '/img/profiles/' + userDestination
      } else if (file.fieldname === 'thumbnails') {
        uploadPath = uploadPath + '/img/products'
      }
    } else if (file.fieldname === 'document') {
      userDestination = req.userFound._id.toString()
      uploadPath = uploadPath + '/documents/' + userDestination
    }

    cb(null, uploadPath)
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  }
})

export const uploader = multer({ storage })
