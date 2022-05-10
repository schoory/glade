
const { Router } = require('express')
const router = Router()
const uuid = require('uuid')
const path = require('path')
const config = require('config')
const fs = require('fs')
const auth = require('../middleware/auth.middleware')

const client = require('../postgre')

const multer = require('multer')

// параметры хранилища
const filesStorage = multer.diskStorage({
  // место сохранения
  destination: (req, file, callback) => {
    // если сохраняли аватар пользователя
    if (file.fieldname === 'avatar') {
      callback(null, config.get('avatarPath'))
    }
    // если сохраняли аудиосообщение
    if (file.fieldname === 'audioMessage') {
      fs.mkdir(config.get('channelsPath') + req.body.channelId + '\\' + config.get('audioMessagesPath'), { recursive: true }, (err) => {
        callback(null, config.get('channelsPath') + req.body.channelId + '\\' + config.get('audioMessagesPath'))
      })
    }
    // если сохраняли файл
    if (file.fieldname === 'messageFile') {
      fs.mkdir(config.get('channelsPath') + req.body.channelId + '\\' + config.get('channelFilesPath'), { recursive: true }, (err) => {
        callback(null, config.get('channelsPath') + req.body.channelId + '\\' + config.get('channelFilesPath'))
      })
    }
  },
  // генерация названия файла
  filename: (req, file, callback) => {
    if (file.fieldname === 'avatar') {
      callback(null, uuid.v4() + path.extname(file.originalname))
    }
    if (file.fieldname === 'audioMessage') {
      callback(null, uuid.v4() + '.webm')
    }
    if (file.fieldname === 'messageFile') {
      callback(null, uuid.v4() + path.extname(file.originalname))
    }
  }
})

// фильтр допустимых расширений
const filesFilter = (req, file, callback) => {
  if (file.fieldname === 'avatar') {
    if (file.mimetype === 'image/png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg') {
      callback(null, true)
    }
  }
  if (file.fieldname === 'audioMessage') {
    if (file.mimetype === 'audio/webm') {
      callback(null, true)
    }
  }
  if (file.fieldname === 'messageFile') {
    callback(null, true)
  }
}

const upload = multer({ 
  storage: filesStorage,
  limits: {
    fileSize: '10mb'
  },
  fileFilter: filesFilter
})

// * загрузка аватара профиля
router.post(
  '/uploadavatar',
  upload.single('avatar'),
  async (req, res) => {
    try {
      const { userId } = req.body
      const file = req.file
  
      // получение предыдущего аватара
      const avatarQuery = await client.query(
        `SELECT avatar FROM users WHERE users.id=${userId}`
      )
      const avatar = avatarQuery.rows[0].avatar
  
      // удаление предыдущего аватара
      fs.unlink(config.get('avatarPath') + avatar, () => {})
  
      // сохранение нового аватара в базу
      await client.query(
        `UPDATE users SET avatar='${file.filename}' WHERE users.id=${userId}`
      )
  
      return res.status(200).json({ msg: 'Фотография успешно изменена' })
    } catch(e) {
      return res.status(500).json({ error: true, msg: 'Ошибка сервера' })
    }
  }
)

// * загрузка аватара профиля
router.post(
  '/uploadaudiomessage',
  upload.single('audioMessage'),
  async (req, res) => {
    try {
      const { userId, channelId, duration, reply } = req.body
      const file = req.file

      let replyMessage = null
      if (reply !== 'null') {
        replyMessage = (await client.query(`SELECT id FROM messages WHERE channel_id = ${channelId} AND index = ${reply}`)).rows[0].id
      }
      
      const prevIndex = (await client.query(`SELECT index FROM messages WHERE channel_id = ${channelId} ORDER BY index DESC LIMIT 1`)).rows[0]
      // создание сообщения
      await client.query(
      `
        INSERT INTO messages (id, text, reply_to, attachments, index, channel_id, deleted, delivered, readed, user_id, creation_date, edited)
        VALUES (${new Date().getTime()}, '', ${replyMessage ? replyMessage : 'NULL'}, '{ "audio": { "name": "${file.filename}", "duration": "${duration}" } }', ${prevIndex ? Number(prevIndex.index) + 1 : '1'}, ${channelId}, false, true, false, ${userId}, '${new Date().toLocaleString()}', false)
      `
      )
  
      const indexes = (await client.query(`SELECT MAX(index) AS max_index, MIN(index) AS min_index FROM messages WHERE channel_id = ${channelId}`)).rows[0]
      return res.status(200).json({ lastIndex: indexes.max_index, firstIndex: indexes.min_index })
    } catch(e) {
      console.log('e', e)
      return res.status(500).json({ error: true, msg: 'Ошибка сервера' })
    }
  }
)

// * создание сообщения с файлом
router.post(
  '/uploadmessagewithfile',
  [upload.single('messageFile'), auth],
  async (req, res) => {
    try {
      const { userId, channelId, message, messageReplyId, fileName, fileSize } = req.body
      const file = req.file
  
      // создание сообщения
      const prevIndex = (await client.query(`SELECT index FROM messages WHERE channel_id = ${channelId} ORDER BY index DESC LIMIT 1`)).rows[0]
      await client.query(
        `
        INSERT INTO messages (id, text, reply_to, attachments, index, channel_id, deleted, delivered, readed, user_id, creation_date, edited)
        VALUES (${new Date().getTime()}, '${message}', ${messageReplyId ? messageReplyId : 'NULL'}, '{ "file": { "name": "${file.filename}", "original_name": "${fileName}", "size": "${fileSize}", "mimetype": "${file.mimetype}" } }', ${prevIndex ? Number(prevIndex.index) + 1 : '1'}, ${channelId}, false, true, false, ${userId}, '${new Date().toLocaleString()}', false)
        `
      ) 
      
      const indexes = (await client.query(`SELECT MAX(index) AS max_index, MIN(index) AS min_index FROM messages WHERE channel_id = ${channelId}`)).rows[0]
      return res.status(200).json({ lastIndex: indexes.max_index, firstIndex: indexes.min_index })
    } catch(e) {
      console.log('e', e)
      return res.status(500).json({ error: true, msg: 'Ошибка сервера' })
    }
  }
)

// * создание сообщения с файлом
router.post(
  '/downloadfile',
  auth,
  async (req, res) => {
    try {
      const { channelId, fileName } = req.body
      
      // получение файла для скачивания
      const filePath = (__dirname + '/' + config.get('channelsPath') + channelId + '/' + config.get('channelFilesPath') + fileName).replace('\\routes', '').replace(/\\/g, '/')
      fs.stat(filePath, function(err, stat) {
        if(err == null) {
          return res.download(filePath)
        } else if(err.code === 'ENOENT') {
          return res.status(400).json({ error: true, msg: 'Файл не найден' })
        } else {
          return res.status(500).json({ error: true, msg: 'Ошибка сервера' })
        }
    });

    } catch(e) {
      console.log('e', e)
      return res.status(500).json({ error: true, msg: 'Ошибка сервера' })
    }
  }
)

module.exports = router