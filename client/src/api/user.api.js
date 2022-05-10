
import { request } from './index'

export const login = async (payload) => {

  const { email, password, status, token, refreshToken } = payload

  // если вход осуществляется по логину и паролю
  if (email && password) {
    const user = await request(
      '/api/auth/login', 
      'POST', 
      { 
        status: status,
        email: email, 
        password: password 
      }
    )
  
    if (user.error) {
      return null
    }
    
    return user
  } 

  // если вход осуществляется по токену
  if (token && refreshToken) {
    const user = await request(
      '/api/auth/validate', 
      'POST', 
      { 
        status: status,
        refreshToken: refreshToken, 
      },
      {
        Authorization: `Bearer ${token}`,
        Refresh: `Bearer ${refreshToken}`
      }
    )
  
    if (user.error) {
      return null
    }
    
    return user
  }
  
}

export const changePassword = async (payload) => {
  const { userId, oldPassword, newPassword, token, refreshToken } = payload

  if (userId, oldPassword, newPassword, token, refreshToken) {
    const response = await request(
      '/api/auth/changepassword', 
      'POST', 
      { 
        userId: userId, 
        oldPassword: oldPassword,
        newPassword: newPassword,
      }, {
        Authorization: `Bearer ${token}`,
        Refresh: `Bearer ${refreshToken}`
      }
    )
  
    if (response.error) {
      return { error: true, msg: response.msg }
    }
    
    return response
  }
}

export const saveSettings = async (payload) => {
  const { 
    userId, 
    firstName, 
    lastName, 
    phone,
    email,
    birthDate,
    privacy,
    token, 
    refreshToken 
  } = payload

  if (userId, firstName, lastName, phone, email, birthDate, privacy, token, refreshToken) {
    const response = await request(
      '/api/auth/saveusersettings', 
      'POST', 
      { 
        userId: userId, 
        firstName: firstName,
        lastName: lastName,
        phone: phone,
        email: email,
        birthDate: birthDate,
        privacy: privacy
      }, {
        Authorization: `Bearer ${token}`,
        Refresh: `Bearer ${refreshToken}`
      }
    )
  
    if (response.error) {
      return { error: true, msg: response.msg }
    }
    
    return response
  }
}

export const changeStatus = async (payload) => {
  const { userId, status, token, refreshToken } = payload
  
  if (userId && status && token && refreshToken) {
    const response = await request(
      '/api/auth/changestatus', 
      'POST', 
      { 
        userId: userId, 
        status: status
      }, {
        Authorization: `Bearer ${token}`,
        Refresh: `Bearer ${refreshToken}`
      }
    )
  
    if (response.error) {
      return { error: true, msg: response.msg }
    }
    
    return response
  }
}