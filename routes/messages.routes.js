
const { Router } = require('express')
const router = Router()

const config = require('config')
const auth = require('../middleware/auth.middleware')

const client = require('../postgre')

const fs = require('fs')

// * получение сообщений
router.get(
  '/getmessages',
  auth,
  async (req, res) => {
    try {

      const userId = req.query.user
      const channelId = req.query.channel
      
      const startWith = req.query.startWith
      const limit = req.query.limit

      const user = (await client.query(`SELECT roles.name AS role, users.group_id AS group FROM users LEFT JOIN roles ON roles.id = users.role_id WHERE users.id = ${userId}`)).rows[0]

      let hasRights = false
      // проверка прав доступа
      if (user.role === 'administrator') {
        hasRights = true
      }
      if (user.group && !hasRights) {
        const group = (await client.query(`SELECT roles.name AS role FROM groups LEFT JOIN roles ON groups.role_id = roles.id WHERE groups.id = ${user.group}`)).rows[0]
        if (group.role === 'administrator') {
          hasRights = true
        }
      }

      // получение данных о канале
      const channel = (await client.query(
        `
        SELECT 
          channels.id, channels.visibility_id, visibility.name AS visibility, channels.channel_type_id, channel_types.name AS channel_type,
          channels.name, channels.group_ids, (SELECT array_agg(groups.name) FROM groups, channels WHERE channels.id = ${channelId} AND groups.id = ANY(channels.group_ids)) AS group_names
        FROM 
          channels 
        LEFT JOIN visibility ON channels.visibility_id = visibility.id
        LEFT JOIN channel_types ON channels.channel_type_id = channel_types.id
        WHERE 
          channels.id = ${channelId}
        `
      )).rows[0]

      if (!channel) {
        return res.status(400).json({ error: true, msg: 'Этот канал не найден' })
      }
      
      // если канал публичный
      if (channel.visibility === 'public') {
        hasRights = true
      }
      
      // если у группы пользователя есть доступ к каналу 
      if (user.group && channel.visibility !== 'public' && channel.group_ids && channel.group_ids.includes(user.group) && !hasRights) {
        hasRights = true
      }

      if (!hasRights) {
        return res.status(400).json({ error: true, msg: 'Пользователь не имеет прав для просмотра этого канала' })
      }

      let messages = []

      const messageQuery = (await client.query(
        `
        SELECT COUNT(id) AS total_count, MIN(index) AS min_index, MAX(index) AS max_index 
        FROM messages 
        WHERE channel_id = ${channelId}
        `
      )).rows[0]

      const totalCount = messageQuery.total_count
      const minIndex = messageQuery.min_index
      const maxIndex = messageQuery.max_index

      // получение сообщений в канале
      messages = (await client.query(
        `
        SELECT 
          messages.id, messages.text, messages.reply_to, messages.attachments, messages.index, messages.channel_id, messages.edited,
          messages.deleted, messages.delivered, messages.readed, messages.user_id, messages.creation_date
        FROM 
          messages
        WHERE 
          messages.channel_id = ${channelId}
        ORDER BY messages.index DESC
        LIMIT ${limit} ${startWith ? `OFFSET ${totalCount - startWith}` : ''}
        `
      )).rows

      return res.status(200).json({ messages: messages, total: totalCount, minIndex: minIndex, maxIndex: maxIndex })

    } catch(e) {
      console.log('e', e)
      return res.status(500).json({ error: true, msg: 'Ошибка сервера' })
    }
  }
)

// * получение новых сообщений
router.get(
  '/getunreadedmessages',
  auth,
  async (req, res) => {
    try {

      const channelId = req.query.channel
      const lastSeenIndex = req.query.lastSeenIndex

      const unreadedMessagesCount = (await client.query(`SELECT COUNT(index) AS counts FROM messages WHERE channel_id = ${channelId} AND index > ${lastSeenIndex}`)).rows[0]

      return res.status(200).json({ channel: channelId, count: unreadedMessagesCount.counts })

    } catch(e) {
      console.log('e', e)
      return res.status(500).json({ error: true, msg: 'Ошибка сервера' })
    }
  }
)

// * получение новых сообщений во всех каналах
router.post(
  '/getallunreadedmessages',
  auth,
  async (req, res) => {
    try {

      const channels = req.body.channels

      const messages = {}
      for (let i = 0; i < channels.length; i++) {
        const unreadedMessagesCount = (await client.query(
          `SELECT COUNT(index) AS counts FROM messages WHERE channel_id = ${channels[i].id} AND index > ${channels[i].lastSeenIndex}`
        )).rows[0]
        messages[channels[i].id] = unreadedMessagesCount.counts
      }

      return res.status(200).json({ ...messages })

    } catch(e) {
      console.log('e', e)
      return res.status(500).json({ error: true, msg: 'Ошибка сервера' })
    }
  }
)

// * новое сообщение
router.post(
  '/newmessage',
  auth,
  async (req, res) => {
    try {

      const { userId, channelId, message } = req.body

      const prevIndex = (await client.query(`SELECT index FROM messages WHERE channel_id = ${channelId} ORDER BY index DESC LIMIT 1`)).rows[0]
      // если передан параметр id измененяемого сообщения - изменение сообщения, иначе создание нового сообщения
      if (message.editId) {
        await client.query(
          `UPDATE messages SET text='${message.text}', edited=true WHERE id=${message.editId}`
        )
      } else {
        await client.query(
          `
          INSERT INTO messages (id, text, reply_to, attachments, index, channel_id, deleted, delivered, readed, user_id, creation_date, edited)
          VALUES (${new Date().getTime()}, '${message.text}', ${message.replyId ? message.replyId : 'NULL'}, NULL, ${prevIndex ? Number(prevIndex.index) + 1 : '1'}, ${channelId}, false, true, false, ${userId}, '${new Date().toLocaleString()}', false)
          `
        )
      }

      const indexes = (await client.query(`SELECT MAX(index) AS max_index, MIN(index) AS min_index FROM messages WHERE channel_id = ${channelId}`)).rows[0]
      return res.status(200).json({ lastIndex: indexes.max_index, firstIndex: indexes.min_index })

    } catch(e) {
      console.log('e', e)
      return res.status(500).json({ error: true, msg: 'Ошибка сервера' })
    }
  }
)

// * удаление сообщения
router.post(
  '/deletemessage',
  auth,
  async (req, res) => {
    try {

      const { userId, messageId } = req.body
      
      // получение прав пользователя
      const user = (await client.query(`SELECT users.group_id, roles.name AS role_name FROM roles LEFT JOIN users ON users.role_id = roles.id WHERE users.id = ${userId}`)).rows[0]
      if (!user) return res.status(400).json({ error: true, msg: 'Ошибка получения информации о пользователе' })
      const groupRole = user.group_id 
        ? (await client.query(`SELECT roles.name AS role_name FROM roles LEFT JOIN groups ON groups.role_id = roles.id WHERE groups.id = ${user.group_id}`)).rows[0]
        : null

      const message = (await client.query(`SELECT messages.user_id, messages.channel_id, messages.attachments FROM messages WHERE id = ${messageId}`)).rows[0]
      // если пользователь отправитель сообщение - удаление
      if (message && message.user_id === userId) {
        await client.query(`DELETE FROM messages WHERE id = ${messageId}`) // удаление сообщения
        if (message.attachments && message.attachments.audio) {
          // удаление аудиосообщения
          fs.unlink(config.get('channelsPath') + message.channel_id + '\\' + config.get('audioMessagesPath') + message.attachments.audio.name, () => {})
        }
        if (message.attachments && message.attachments.file) {
          // удаление файла
          fs.unlink(config.get('channelsPath') + message.channel_id + '\\' + config.get('channelFilesPath') + message.attachments.file.name, () => {})
        }
        const indexes = (await client.query(`SELECT MAX(index) AS max_index, MIN(index) AS min_index FROM messages WHERE channel_id = ${message.channel_id}`)).rows[0]
        return res.status(200).json({ lastIndex: indexes.max_index, firstIndex: indexes.min_index })
      }

      // если пользователь имеет права администратора, установка метки "Удалено" на сообщение
      if (user.role_name === 'administrator' || (groupRole && groupRole.role_name === 'administrator')) {
        await client.query(`UPDATE messages SET deleted=true WHERE id=${messageId}`)
        const indexes = (await client.query(`SELECT MAX(index) AS max_index, MIN(index) AS min_index FROM messages WHERE channel_id = ${message.channel_id}`)).rows[0]
        return res.status(200).json({ lastIndex: indexes.max_index, firstIndex: indexes.min_index })
      }

      // если пользователь не попал под предыдущие условия - ошибка
      return res.status(400).json({ error: true, msg: 'При удалении сообщения произошла ошибка' }) 

    } catch(e) {
      console.log('e', e)
      return res.status(500).json({ error: true, msg: 'Ошибка сервера' })
    }
  }
)

// * восстановление сообщения
router.post(
  '/restoremessage',
  auth,
  async (req, res) => {
    try {

      const { userId, messageId } = req.body
      
      // получение прав пользователя
      const user = (await client.query(`SELECT users.group_id, roles.name AS role_name FROM roles LEFT JOIN users ON users.role_id = roles.id WHERE users.id = ${userId}`)).rows[0]
      if (!user) return res.status(400).json({ error: true, msg: 'Ошибка получения информации о пользователе' })
      const groupRole = user.group_id 
        ? (await client.query(`SELECT roles.name AS role_name FROM roles LEFT JOIN groups ON groups.role_id = roles.id WHERE groups.id = ${user.group_id}`)).rows[0]
        : null

      const message = (await client.query(`SELECT messages.user_id, messages.channel_id FROM messages WHERE id = ${messageId}`)).rows[0]

      // если пользователь имеет права администратора, убирает метку "Удалено" на сообщении
      if (user.role_name === 'administrator' || (groupRole && groupRole.role_name === 'administrator')) {
        await client.query(`UPDATE messages SET deleted=false WHERE id=${messageId}`)
        const indexes = (await client.query(`SELECT MAX(index) AS max_index, MIN(index) AS min_index FROM messages WHERE channel_id = ${message.channel_id}`)).rows[0]
        return res.status(200).json({ lastIndex: indexes.max_index, firstIndex: indexes.min_index })
      }

      // если пользователь не попал под предыдущие условия - ошибка
      return res.status(400).json({ error: true, msg: 'Пользователь не имеет достаточно полномочий' }) 

    } catch(e) {
      console.log('e', e)
      return res.status(500).json({ error: true, msg: 'Ошибка сервера' })
    }
  }
)

// * удаление сообщения без возможности восстановления
router.post(
  '/deleteforevermessage',
  auth,
  async (req, res) => {
    try {

      const { userId, messageId } = req.body
      
      // получение прав пользователя
      const user = (await client.query(`SELECT users.group_id, roles.name AS role_name FROM roles LEFT JOIN users ON users.role_id = roles.id WHERE users.id = ${userId}`)).rows[0]
      if (!user) return res.status(400).json({ error: true, msg: 'Ошибка получения информации о пользователе' })
      const groupRole = user.group_id 
        ? (await client.query(`SELECT roles.name AS role_name FROM roles LEFT JOIN groups ON groups.role_id = roles.id WHERE groups.id = ${user.group_id}`)).rows[0]
        : null

      const message = (await client.query(`SELECT messages.user_id, messages.channel_id, messages.attachments FROM messages WHERE id = ${messageId}`)).rows[0]

      // если пользователь имеет права администратора, убирает метку "Удалено" на сообщении
      if (user.role_name === 'administrator' || (groupRole && groupRole.role_name === 'administrator')) {
        await client.query(`DELETE FROM messages WHERE id=${messageId}`)
        if (message.attachments && message.attachments.audio) {
          // удаление аудиосообщения
          fs.unlink(config.get('channelsPath') + message.channel_id + '\\' + config.get('audioMessagesPath') + message.attachments.audio.name, () => {})
        }
        if (message.attachments && message.attachments.file) {
          // удаление файла
          fs.unlink(config.get('channelsPath') + message.channel_id + '\\' + config.get('channelFilesPath') + message.attachments.file.name, () => {})
        }
        const indexes = (await client.query(`SELECT MAX(index) AS max_index, MIN(index) AS min_index FROM messages WHERE channel_id = ${message.channel_id}`)).rows[0]
        return res.status(200).json({ lastIndex: indexes.max_index, firstIndex: indexes.min_index })
      }

      // если пользователь не попал под предыдущие условия - ошибка
      return res.status(400).json({ error: true, msg: 'Пользователь не имеет достаточно полномочий' }) 

    } catch(e) {
      console.log('e', e)
      return res.status(500).json({ error: true, msg: 'Ошибка сервера' })
    }
  }
)

module.exports = router