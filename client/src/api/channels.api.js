
import { request } from './index'

export const getChannels = async (payload) => {

  const { userId, token, refreshToken } = payload

  if (userId && token && refreshToken) {
    const channels = await request(
      '/api/channels/getchannels', 
      'POST', 
      { 
        userId: userId
      }, 
      {
        Authorization: `Bearer ${token}`,
        Refresh: `Bearer ${refreshToken}`
      }
    )
  
    if (!channels || channels.error) {
      return null
    }
    
    return channels
  } else {
    return null
  }
  
}

export const deleteChannel = async (payload) => {

  const { userId, channelId, token, refreshToken } = payload

  if (userId && channelId && token && refreshToken) {
    const response = await request(
      '/api/channels/deletechannel',
      'POST',
      { userId: userId, channelId: channelId },
      { Authorization: `Bearer ${token}`, Refresh: `Bearer ${refreshToken}` }
    )
  
    if (!response || response.error) {
      return { error: true, msg: response ? response.msg : 'Что-то пошло не так' }
    }
    
    return response
  } else {
    return null
  }
  
}

export const getSections = async (payload) => {

  const { userId, token, refreshToken } = payload

  if (userId && token && refreshToken) {
    const channels = await request(
      '/api/channels/getsections', 
      'POST', 
      { 
        userId: userId
      }, 
      {
        Authorization: `Bearer ${token}`,
        Refresh: `Bearer ${refreshToken}`
      }
    )
  
    if (!channels || channels.error) {
      return null
    }
    
    return channels
  } else {
    return null
  }
  
}

export const createSection = async (payload) => {
  const { userId, sectionName, token, refreshToken } = payload

  if (userId && sectionName && token && refreshToken) {
    const response = await request(
      '/api/channels/createsection',
      'POST',
      { userId: userId, sectionName: sectionName },
      { Authorization: `Bearer ${token}`, Refresh: `Bearer ${refreshToken}` }
    )
  
    if (!response || response.error) {
      return { error: true, msg: response ? response.msg : 'Что-то пошло не так' }
    }
    
    return response
  } else {
    return null
  }
}

export const deleteSection = async (payload) => {
  const { userId, sectionId, token, refreshToken } = payload
  
  if (userId && sectionId && token && refreshToken) {
    const response = await request(
      '/api/channels/deletesection',
      'POST',
      { userId: userId, sectionId: sectionId },
      { Authorization: `Bearer ${token}`, Refresh: `Bearer ${refreshToken}` }
    )
  
    if (!response || response.error) {
      return { error: true, msg: response ? response.msg : 'Что-то пошло не так' }
    }
    
    return response
  } else {
    return null
  }
}

export const editSection = async (payload) => {
  const { userId, sectionId, sectionName, token, refreshToken } = payload
  
  if (userId && sectionName && sectionId && token && refreshToken) {
    const response = await request(
      '/api/channels/editsection',
      'POST',
      { userId: userId, sectionId: sectionId, sectionName: sectionName },
      { Authorization: `Bearer ${token}`, Refresh: `Bearer ${refreshToken}` }
    )
  
    if (!response || response.error) {
      return { error: true, msg: response ? response.msg : 'Что-то пошло не так' }
    }
    
    return response
  } else {
    return null
  }
}

export const moveChannelToSection = async (payload) => {
  const { userId, sectionId, channelId, token, refreshToken } = payload

  if (userId && channelId && token && refreshToken) {
    const response = await request(
      '/api/channels/movechannel',
      'POST',
      { userId: userId, sectionId: sectionId, channelId: channelId },
      { Authorization: `Bearer ${token}`, Refresh: `Bearer ${refreshToken}` }
    )
  
    if (!response || response.error) {
      return { error: true, msg: response ? response.msg : 'Что-то пошло не так' }
    }
    
    return response
  } else {
    return null
  }
}