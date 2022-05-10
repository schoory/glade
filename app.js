
const config = require('config')

const express = require('express')
const app = express()
const http = require('http').Server(app)

const io = require('socket.io')(http, {
  cors: {
    origin: '*'
  }
})

const client = require('./postgre')


const SERVER_PORT = config.get('appPort') || 5000


app.use(express.json({ extended: true }))
app.use(express.static(config.get('staticPath')))

app.use('/api/auth', require('./routes/auth.routes'))
app.use('/api/channels', require('./routes/channels.routes'))
app.use('/api/groups', require('./routes/groups.routes'))
app.use('/api/profiles', require('./routes/profiles.routes'))
app.use('/api/messages', require('./routes/messages.routes'))
app.use('/api/files', require('./routes/files.routes'))

const channelsUsers = {}
const voiceChannels = {}


io.on('disconnect', () => {
  console.log('disconnected')
})

io.on('connection', (socket) => {

  const socketRooms = [] // комнаты, к которым подключен сокет

  let onlineTimer = null // таймер статуса пользователя

  // подключение к комнате сокета
  socket.on('join-room', (roomId) => {
    socketRooms.push(roomId)
    socket.join(roomId)
  })

  // подключение к голосовому каналу
  socket.on('join-voice-channel', (roomId, channelId, userId, userSettings) => {
    socketRooms.push(roomId)
    socket.join(roomId)

    if (voiceChannels[channelId]) {
      const users = [ ...voiceChannels[channelId].users ]

      if (users.findIndex(item => item.id === userId) === -1) {
        users.push({ id: userId, mic: userSettings.mic, mute: userSettings.mute })
      }
      voiceChannels[channelId] = { users: [ ...users ] }
    } else {
      voiceChannels[channelId] = { users: [{ id: userId, mic: userSettings.mic, mute: userSettings.mute }] }
    }
    io.sockets.emit('voice-channels-get', voiceChannels)
  })

  // выход из голосового канала
  socket.on('leave-voice-channel', (roomId, channelId, userId) => {
    if (voiceChannels[channelId]) {
      const users = [ ...voiceChannels[channelId].users ]

      socketRooms.splice(socketRooms.indexOf(roomId), 1)
      socket.leave(roomId)

      if (users.findIndex(item => item.id === userId) !== -1) {
        users.splice(users.findIndex(item => item.id === userId), 1)
      }
      if (users.length > 0) {
        voiceChannels[channelId] = { users: [ ...users ] }
      } else {
        delete voiceChannels[channelId]
      }
    }
    io.sockets.emit('voice-channels-get', voiceChannels)
  })

  // получение данных и пользователей в голосовых каналах
  socket.on('request-voice-channels', () => {
    socket.emit('voice-channels-get', voiceChannels)
  })

  // подключение к каналу
  socket.on('join-channel', (roomId, userId) => {
    // создание списка пользователей в канале если еще никого в нем нет
    if (!channelsUsers[roomId]) {
      channelsUsers[roomId] = []
    }
    // удаление пользователя, если он до этого был в чате
    Object.keys(channelsUsers).map(item => {
      if (channelsUsers[item].includes(userId)) {
        channelsUsers[item].splice(channelsUsers[item].indexOf(userId), 1)
        if (channelsUsers[item].length === 0) {
          delete channelsUsers[item]
        }
      }
    })
    // добавление пользователя в список
    if (channelsUsers[roomId] && !channelsUsers[roomId].includes(userId)) {
      channelsUsers[roomId].push(userId)
    }

    socketRooms.push(roomId)
    socket.join(roomId)
    io.sockets.in(roomId).emit('logged-into-channel', channelsUsers[roomId])
  })

  // выход из комнаты сокета
  socket.on('leave-room', (roomId) => {
    socketRooms.splice(socketRooms.indexOf(roomId), 1)
    socket.leave(roomId)
  })

  // выход из канала
  socket.on('leave-channel', (roomId, userId) => {
    if (channelsUsers[roomId]) {
      channelsUsers[roomId].splice(channelsUsers[roomId].indexOf(userId), 1)
      if (channelsUsers[roomId].length === 0) {
        delete channelsUsers[roomId]
      }

      socketRooms.splice(socketRooms.indexOf(roomId), 1)
      socket.leave(roomId)
      io.sockets.in(roomId).emit('left-channel', channelsUsers[roomId])
    }
  })

  // изменение пользователей
  socket.on('users-changed', (room) => {
    if (room.selfIncluded) {
      return socket.in(room.id).emit('users-update')
    }
    if (room === 'all') {
      socket.broadcast.emit('users-update')
    } else {
      socket.to(room).emit('users-update')
    }
  })

  // изменение каналов
  socket.on('channels-changed', (room) => {
    if (room.selfIncluded) {
      return socket.in(room.id).emit('groups-update')
    }
    if (room === 'all') {
      socket.broadcast.emit('channels-update')
    } else {
      socket.to(room).emit('channels-update')
    }
  })

  // изменение групп
  socket.on('groups-changed', (room) => {
    if (room.selfIncluded) {
      return socket.in(room.id).emit('groups-update')
    }
    if (room === 'all') {
      socket.broadcast.emit('groups-update')
    } else {
      socket.to(room).emit('groups-update')
    }
  })

  // изменение сообщений
  socket.on('messages-changed', (room, channelId) => {
    if (room.selfIncluded) {
      return socket.in(room.id).emit('messages-update', channelId)
    }
    if (room === 'all') {
      socket.broadcast.emit('messages-update', channelId)
    } else {
      io.sockets.in(room).emit('messages-update', channelId)
    }
  })

  // новое уведомление в текстовом канале
  socket.on('message-notification', (room, channelId) => {
    socket.to(room).emit('message-notification-get', channelId)
  }) 

  // отправка аудио-данных в голосовом канале
  socket.on('voice-media', (room, userId, voiceMedia) => {
    socket.to(room).emit('voice-media-get', userId, voiceMedia)
  })

  // при изменении голосовых настроек пользователя
  socket.on('voice-settings-changed', (channelId, userId, voiceSettings) => {
    if (voiceChannels[channelId]) {
      // получение пользователя канала
      const users = [ ...voiceChannels[channelId].users ] 
      const user = users.find(item => item.id === userId) 
      if (user) {
        // изменение голосовых настроек
        user.mic = voiceSettings.mic 
        user.mute = voiceSettings.mute
        voiceChannels[channelId] = { users: [ ...users ] }
        io.sockets.emit('voice-channels-get', voiceChannels) // отправка данных о пользователях
      }
    }
  })

  // проверка статуса пользователя
  socket.on('user-still-online', (userId) => {
    clearTimeout(onlineTimer)
    // пользователь отправляет каждую минуту свой статус 
    // если пользователь не отправлял свой статус 3 минуты, считается, что он вышел
    onlineTimer = setTimeout(async () => {

      // удаление пользователя из текстовых каналов, в которых он находился
      Object.keys(channelsUsers).forEach((key) => {
        if (channelsUsers[key].length > 0 && channelsUsers[key].includes(userId)) {
          const userIndex = channelsUsers[key].indexOf(userId)
          channelsUsers[key].splice(userIndex, 1)
          if (channelsUsers[key].length === 0) {
            delete channelsUsers[key]
          }
          io.sockets.in(key).emit('left-channel', channelsUsers[key])
        }
      })
      // удаление пользователя из голосовых каналов, в которых он находился
      Object.keys(voiceChannels).forEach((key) => {
        if (voiceChannels[key] && voiceChannels[key].users && voiceChannels[key].users.length > 0) {
          const userIndex = voiceChannels[key].users.findIndex(item => +item.id === +userId)
          if (userIndex !== -1) {
            voiceChannels[key].users.splice(userIndex, 1)
            if (voiceChannels[key].users.length === 0) {
              delete voiceChannels[key]
            }
            io.sockets.emit('voice-channels-get', voiceChannels)
          }
        }
      })

      // изменение статуса пользователя
      const statusId = (await client.query(`SELECT id FROM statuses WHERE name = 'offline'`)).rows[0].id
      await client.query(`UPDATE users SET status_id = ${statusId} WHERE id = ${userId}`)

      io.sockets.in('server').emit('users-update')

      clearTimeout(onlineTimer)
    }, 180000)
  })
})


async function start() {
  try {

    // подключение базы данных
    client
      .connect()
      .then(() => console.log('Database is connected'))
      .catch(error => console.log('Connection to the database was interrupted with an error', error.stack))
    // запуск сервера
    http.listen(SERVER_PORT, console.log(`App has been started on port ${SERVER_PORT}`))

  } catch (error) {
    console.log('Server error ', error.message)
    process.exit(1)
  }
}

start() // Server starts