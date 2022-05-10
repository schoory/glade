
import { useState, useEffect } from 'react'
import { Route, Routes, Navigate } from 'react-router-dom'

import { useSelector } from 'react-redux'
import { LoginPage } from './pages/login/LoginPage';
import { WorkplacePage } from './pages/workplace/WorkplacePage';
import { CreateChannelPage } from './pages/createchannel/CreateChannelPage';
import { ChannelSettingsPage } from './pages/channelsettings/ChannelSettingsPage';
import { GeneralSettingsPage } from './pages/generalsettings/GeneralSettingsPage';
import { GroupSettingsPage } from './pages/groupsettings/GroupSettingsPage';
import { ProfileSettingsPage } from './pages/profilesettings/ProfileSettingsPage';
import { ExpiredPage } from './pages/expired/ExpiredPage';
import { SpinnerComponent } from './components/spinner/SpinnerComponent';
import { UserSettingsPage } from './pages/usersettings/UserSettingsPage';

export const useRoutes = () => {

  const [authenticated, setAuthenticated] = useState(false) // флаг аутентификации пользователя
  const [administrator, setAdministrator] = useState(false) // флаг аутентификации пользователя

  const user = useSelector(state => state.user)

  // * если пользователь вошел в систему ставится флаг Authenticated
  useEffect(() => {
    if (user.user === null) {
      setAuthenticated(false)
    } else {
      setAuthenticated(true)
      if (user.user.role === 'administrator') {
        setAdministrator(true)
      } else {
        setAdministrator(false)
      }
    }
  }, [user])

  // вывод спиннера
  if (user.user === null && user.status !== 0 && user.status !== 'failed' && user.status !== 'loggedout') {
    return (
      <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><SpinnerComponent text='Загрузка'/></div>
    )
  }

  // вывод страницы просроченного пароля
  if (user.user && user.user.password_expired) {
    return (
      <Routes>
        <Route path='/expired' element={<ExpiredPage />}/>
        <Route path="*" exact element={<Navigate replace to="/expired" />} />
      </Routes>
    )
  }

  if (authenticated) {
    if (administrator) {
      return (
        <Routes>
          <Route path='/channels' element={<WorkplacePage />} />
          <Route path='/newchannel' element={<CreateChannelPage />} />
          <Route path='/channelsettings' element={<ChannelSettingsPage />} />
          <Route path='/generalsettings' element={<GeneralSettingsPage />} />
          <Route path='/groupsettings' element={<GroupSettingsPage />} />
          <Route path='/profilesettings' element={<ProfileSettingsPage />} />
          <Route path='/settings' element={<UserSettingsPage />} />
          <Route path='/expired' element={<Navigate replace to="/channels" />} />
          <Route path='/login' element={<Navigate replace to="/channels" />} />
        </Routes>
      )
    } else {
      return (
        <Routes>
          <Route path='/channels' element={<WorkplacePage />} />
          <Route path='/settings' element={<UserSettingsPage />} />
          <Route path='/expired' element={<Navigate replace to="/channels" />} />
          <Route path='/login' element={<Navigate replace to="/channels" />} />
        </Routes>
      )
    }
  } else {
    return (
      <Routes>
        <Route path='/login' element={<LoginPage />} />
        <Route path="/" exact element={<Navigate replace to="/login" />} />
        <Route path="/expired" exact element={<Navigate replace to="/login" />} />
        <Route path="/channels" exact element={<Navigate replace to="/login" />} />
        <Route path="*" exact element={<div>404</div>} />
      </Routes>
    )
  }

}