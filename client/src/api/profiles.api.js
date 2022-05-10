
import { request } from './index'

export const getProfiles = async (payload) => {

  const { token, refreshToken } = payload

  
  if (token && refreshToken) {
    const profiles = await request(
      '/api/profiles/getprofiles', 
      'POST', 
      {

      },
      {
        Authorization: `Bearer ${token}`,
        Refresh: `Bearer ${refreshToken}`
      }
    )
  
    if (!profiles || profiles.error) {
      return null
    }
    
    return profiles
  } else {
    return null
  }
  
}

export const saveProfiles = async (payload) => {
  const { userId, profiles, token, refreshToken } = payload

  if (userId, profiles, token && refreshToken) {
    const response = await request(
      '/api/profiles/saveprofiles', 
      'POST', 
      {
        userId: userId,
        profiles: profiles
      },
      {
        Authorization: `Bearer ${token}`,
        Refresh: `Bearer ${refreshToken}`
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

export const saveProfile = async (payload) => {
  const { userId, profileId, groupId, role, token, refreshToken } = payload

  if (userId, profileId, groupId, role, token && refreshToken) {
    const response = await request(
      '/api/profiles/saveprofile', 
      'POST', 
      {
        userId: userId,
        profileId: profileId,
        groupId: groupId,
        profileRole: role
      },
      {
        Authorization: `Bearer ${token}`,
        Refresh: `Bearer ${refreshToken}`
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