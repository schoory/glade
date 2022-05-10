
import { request } from './index'



// * получение списка групп
export const getGroups = async (payload) => {

  const { token, refreshToken } = payload
  
  if (token && refreshToken) {
    const groups = await request(
      '/api/groups/getgroups', 
      'POST',  
      {

      },
      {
        Authorization: `Bearer ${token}`,
        Refresh: `Bearer ${refreshToken}`
      }
    )
  
    if (!groups || groups.error) {
      return null
    }
    
    return groups
  } else {
    return null
  }
  
}

// * удаление группы
export const deleteGroup = async (payload) => {
  const { userId, groupId, token, refreshToken } = payload

  if (userId && groupId && token && refreshToken) {
    const response = await request(
      '/api/groups/deletegroup', 
      'POST',  
      {
        userId: userId,
        groupId: groupId
      },
      {
        Authorization: `Bearer ${token}`,
        Refresh: `Bearer ${refreshToken}`
      }
    )
  
    if (!response || response.error) {
      return { error: true, msg: response ? response.msg : 'Что-то пошло не так' }
    }
    
    return response
  } else {
    return null
  }
}

// * создание группы
export const createGroup = async (payload) => {
  const { userId, groupName, token, refreshToken } = payload

  if (userId && groupName && token && refreshToken) {
    const response = await request(
      '/api/groups/creategroup', 
      'POST',  
      {
        userId: userId,
        groupName: groupName
      },
      {
        Authorization: `Bearer ${token}`,
        Refresh: `Bearer ${refreshToken}`
      }
    )
  
    if (!response || response.error) {
      return { error: true, msg: response ? response.msg : 'Что-то пошло не так' }
    }
    
    return response
  } else {
    return null
  }
}

// * сохранение изменений 
export const saveGroups = async (payload) => {
  const { userId, groups, token, refreshToken } = payload

  if (userId && groups && token && refreshToken) {
    const response = await request(
      '/api/groups/savegroups', 
      'POST',  
      {
        userId: userId,
        groups: groups
      },
      {
        Authorization: `Bearer ${token}`,
        Refresh: `Bearer ${refreshToken}`
      }
    )
  
    if (!response || response.error) {
      return { error: true, msg: response ? response.msg : 'Что-то пошло не так' }
    }
    
    return response
  } else {
    return null
  }
}

// * сохранение изменений 
export const addProfilesToGroup = async (payload) => {
  const { userId, profiles, groupId, token, refreshToken } = payload

  if (userId && profiles && groupId && token && refreshToken) {
    const response = await request(
      '/api/groups/savegroupusers', 
      'POST',  
      {
        userId: userId,
        groupId: groupId,
        profiles: profiles
      },
      {
        Authorization: `Bearer ${token}`,
        Refresh: `Bearer ${refreshToken}`
      }
    )
  
    if (!response || response.error) {
      return { error: true, msg: response ? response.msg : 'Что-то пошло не так' }
    }
    
    return response
  } else {
    return null
  }
}
