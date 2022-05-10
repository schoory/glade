import { request } from './index'

export const uploadAvatar = async (payload) => {

  const { userId, avatarFile, token, refreshToken } = payload

  if (userId, avatarFile, token && refreshToken) {

    const formData = new FormData()
    formData.append('avatar', avatarFile)
    formData.append('userId', userId)

    const response = await fetch(
      '/api/files/uploadavatar',  
      {
        method: 'POST',
        body: formData, 
        headers: {
          Authorization: `Bearer ${token}`,
          Refresh: `Bearer ${refreshToken}`
        }
      }
    )
  
    if (!response || response.error) {
      return null
    }
    
    return response
  } else {
    return null
  }
  
}

export const uploadAudioMessage = async (payload) => {
  const { userId, channelId, message, audioBlob, audioDuration, token, refreshToken } = payload

  if (userId && channelId && message && audioBlob && audioDuration && token && refreshToken) {

    const formData = new FormData()
    formData.append('userId', userId)
    formData.append('channelId', channelId)
    formData.append('reply', message.replyId)
    formData.append('audioMessage', audioBlob)
    formData.append('duration', audioDuration)

    const response = await fetch(
      '/api/files/uploadaudiomessage',  
      {
        method: 'POST',
        body: formData, 
        headers: {
          Authorization: `Bearer ${token}`,
          Refresh: `Bearer ${refreshToken}`
        }
      }
    )
    
    if (!response || response.error) {
      return null
    }
    
    return response.json()
  } else {
    return null
  }
}

export const downloadMessageFile = async (payload) => {
  const { channelId, fileName, token, refreshToken } = payload

  if (channelId && fileName) {    
    const response = await fetch(
      '/api/files/downloadfile',  
      {
        method: 'POST',
        body: JSON.stringify({ channelId: channelId, fileName: fileName }), 
        headers: {
          "Content-Type": 'application/json',
          Authorization: `Bearer ${token}`,
          Refresh: `Bearer ${refreshToken}`
        }
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