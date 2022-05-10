
import { request } from "./index"

// * получение сообщений
export const getMessages = async (payload) => {
  const { userId, channelId, startWith, limit, token, refreshToken } = payload
  
  if (userId && channelId && limit && token && refreshToken) {
    const messages = await request(
      '/api/messages/getmessages?channel='+channelId+'&user='+userId+ (startWith !== undefined ? '&startWith=' + startWith : '')+ '&limit='+limit, 
      'GET',  
      null,
      {
        Authorization: `Bearer ${token}`,
        Refresh: `Bearer ${refreshToken}`
      }
    )
  
    if (!messages || messages.error) {
      return { error: true, msg: messages ? messages.msg : 'Что-то пошло не так' }
    }
    
    return messages
  } else {
    return null
  }
}

// * получение количества новых сообщений
export const getUnreadedMessage = async (payload) => {
  const { channelId, lastSeenIndex, token, refreshToken } = payload
  
  if (channelId && lastSeenIndex && token && refreshToken) {
    const unreadedMessages = await request(
      '/api/messages/getunreadedmessages?channel='+channelId+'&lastSeenIndex='+lastSeenIndex, 
      'GET',  
      null,
      {
        Authorization: `Bearer ${token}`,
        Refresh: `Bearer ${refreshToken}`
      }
    )
  
    if (!unreadedMessages || unreadedMessages.error) {
      return { error: true, msg: unreadedMessages ? unreadedMessages.msg : 'Что-то пошло не так' }
    }
    
    return unreadedMessages
  } else {
    return null
  }
}

// * получение количества новых сообщений во всех каналах
export const getAllUnreadedMessage = async (payload) => {
  const { channels, token, refreshToken } = payload
  
  if (channels && token && refreshToken) {
    const unreadedMessages = await request(
      '/api/messages/getallunreadedmessages',
      'POST',  
      {
        channels: channels
      },
      {
        Authorization: `Bearer ${token}`,
        Refresh: `Bearer ${refreshToken}`
      }
    )
  
    if (!unreadedMessages || unreadedMessages.error) {
      return { error: true, msg: unreadedMessages ? unreadedMessages.msg : 'Что-то пошло не так' }
    }
    
    return unreadedMessages
  } else {
    return null
  }
}

// * создание/изменение сообщения
export const newMessage = async (payload) => {
  const { userId, channelId, message, token, refreshToken } = payload

  if (userId && channelId && message && token && refreshToken) {
    const response = await request(
      '/api/messages/newmessage', 
      'POST',  
      {
        userId: userId,
        channelId: channelId,
        message: message
      },
      {
        Authorization: `Bearer ${token}`,
        Refresh: `Bearer ${refreshToken}`
      }
    )
  
    if (response && response.error) {
      return { error: true, msg: response ? response.msg : 'Что-то пошло не так' }
    }
    
    return response
  } else {
    return null
  }
}

// * создание сообщения с файлом
export const newMessageWithFile = async (payload) => {
  const { userId, channelId, file, fileName, fileSize, messageText, messageReplyId, token, refreshToken } = payload

  if (!fileSize) {
    return { error: true, msg: 'Файл пуст' }
  }
  
  if (userId && channelId && file && fileName && fileSize && token && refreshToken) {
    const data = new FormData()
    data.append('userId', userId)
    data.append('channelId', channelId)
    data.append('messageFile', file)
    data.append('message', messageText)
    data.append('messageReplyId', messageReplyId)
    data.append('fileName', fileName)
    data.append('fileSize', fileSize)
    
    const response = await (await fetch('/api/files/uploadmessagewithfile', { method: 'POST', body: data, headers: { Authorization: `Bearer ${token}`, Refresh: `Bearer ${refreshToken}` } })).json()
    if (response && response.error) {
      return { error: true, msg: response ? response.msg : 'Что-то пошло не так' }
    }
    
    return response
  } else {
    return null
  }
}

// * удаление сообщения
export const deleteMessage = async (payload) => {
  const { userId, messageId, token, refreshToken } = payload

  if (userId && messageId && token && refreshToken) {
    const response = await request(
      '/api/messages/deletemessage', 
      'POST',  
      {
        userId: userId,
        messageId: messageId
      },
      {
        Authorization: `Bearer ${token}`,
        Refresh: `Bearer ${refreshToken}`
      }
    )
  
    if (response && response.error) {
      return { error: true, msg: response ? response.msg : 'Что-то пошло не так' }
    }
    
    return response
  } else {
    return null
  }
}

// * восстановление сообщения
export const restoreMessage = async (payload) => {
  const { userId, messageId, token, refreshToken } = payload

  if (userId && messageId && token && refreshToken) {
    const response = await request(
      '/api/messages/restoremessage', 
      'POST',  
      {
        userId: userId,
        messageId: messageId
      },
      {
        Authorization: `Bearer ${token}`,
        Refresh: `Bearer ${refreshToken}`
      }
    )
  
    if (response && response.error) {
      return { error: true, msg: response ? response.msg : 'Что-то пошло не так' }
    }
    
    return response
  } else {
    return null
  }
}

// * удаление без возможности восстановления
export const deleteForeverMessage = async (payload) => {
  const { userId, messageId, token, refreshToken } = payload

  if (userId && messageId && token && refreshToken) {
    const response = await request(
      '/api/messages/deleteforevermessage', 
      'POST',  
      {
        userId: userId,
        messageId: messageId
      },
      {
        Authorization: `Bearer ${token}`,
        Refresh: `Bearer ${refreshToken}`
      }
    )
  
    if (response && response.error) {
      return { error: true, msg: response ? response.msg : 'Что-то пошло не так' }
    }
    
    return response
  } else {
    return null
  }
}