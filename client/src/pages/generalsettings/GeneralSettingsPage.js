import { lazy, Suspense, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { alert } from './../../asyncActions/alert';
import { fetchGroups } from './../../asyncActions/groups';
import { SpinnerComponent } from './../../components/spinner/SpinnerComponent';
import { createGroup, deleteGroup, saveGroups } from '../../api/groups.api';
import { fetchProfiles } from '../../asyncActions/profiles';
import { saveProfiles } from '../../api/profiles.api';
import { setContextMenuHidden } from '../../store/contextReducer';

const TabComponent = lazy(() => import('../../components/tabs/TabComponent'))
const ListComponent = lazy(() => import('../../components/list/ListComponent'))
const DialogComponent = lazy(() => import('../../components/dialog/DialogComponent'))

export const GeneralSettingsPage = () => {

  const user = useSelector(state => state.user.user)
  const groups = useSelector(state => state.groups.groups)
  const profiles = useSelector(state => state.profiles.profiles)
  const breakpoints = useSelector(state => state.breakpoints)
  const socket = useSelector(state => state.socket.socket)
  const dispatch = useDispatch()

  const navigate = useNavigate()

  const [tabVariables, setTabVariables] = useState({
    groups: [],
    profiles: []
  })

  const [loading, setLoading] = useState(false)
  const [quantity, setQuantity] = useState([]) // количество пользователей для каждой группы


  const [dialogCreateGroup, setDialogCreateGroup] = useState({ visible: false, groupName: '' }) // диалоговое окно создания группы
  const [dialogDeleteGroup, setDialogDeleteGroup] = useState({ visible: false, id: '' }) // диалоговое окно удаления группы
  const [dialogCreateProfile, setDialogCreateProfile] = useState({ visible: false, login: '', avatar: '', first_name: '', last_name: '', password: '', password_expired: true }) // диалоговое окно создания пользователя
  const [dialogResetPassword, setDialogResetPassword] = useState({ visible: false, id: '', password: '', password_expired: true }) // диалоговое окно создания пользователя
  
  // * получение списка групп и пользователей
  useEffect(() => {
    dispatch(fetchGroups({ token: user.token, refreshToken: user.refreshToken }))
    dispatch(fetchProfiles({ token: user.token, refreshToken: user.refreshToken }))
  }, [])

  // * передача списка пользователей
  useEffect(() => {
    setTabVariables({ 
      ...tabVariables, 
      profiles: [ ...profiles.reduce((prev, item) => {
        prev.push({ 
          id: item.id, 
          login: item.login, 
          avatar: item.avatar, 
          first_name: item.first_name, 
          last_name: item.last_name, 
          name: `${item.first_name} ${item.last_name}`,
          password_expired: item.password_expired
        })
        return prev
      }, []) ] 
    })
  }, [profiles])

  // * получение количества пользователей для каждой группы
  useEffect(() => {
    setQuantity(groups.reduce((prev, item) => {
      prev.push(profiles.filter(profile => profile.group_id === item.id).length)
      return prev
    }, []))
  }, [groups, profiles])

  // * смена цвета у группы
  const handleGroupsColorChanged = (items) => {
    setTabVariables({ ...tabVariables, groups: [...items] })
  }

  // * удаление группы
  const handleDeleteGroup = (id) => {
    deleteGroup({ userId: user.id, groupId: dialogDeleteGroup.id, token: user.token, refreshToken: user.refreshToken })
      .then(data => {
        
        if (data.error) {
          return dispatch(alert({ delay: 3000, text: data.msg, style: 'error' }))
        }

        socket.emit('groups-changed', 'server')

        setDialogDeleteGroup({ visible: false, id: '' })
  
        dispatch(alert({ delay: 3000, text: data.msg, style: 'success' }))
        dispatch(fetchGroups({ token: user.token, refreshToken: user.refreshToken }))
      })
  }

  // * создание группы
  const handleCreateGroup = (form) => {
    
    if (!dialogCreateGroup.groupName) return dispatch(alert({delay: 3000, text: 'Введите название группы', style: 'error'}))
    if (dialogCreateGroup.groupName.length > 32) return dispatch(alert({delay: 3000, text: 'Название группы не должно быть больше 32 символов', style: 'error'}))

    createGroup({ userId: user.id, groupName: dialogCreateGroup.groupName, token: user.token, refreshToken: user.refreshToken })
      .then(data => {

        if (data.error) {
          return dispatch(alert({ delay: 3000, text: data.msg, style: 'error' }))
        }

        socket.emit('groups-changed', 'server')

        setDialogCreateGroup({ visible: false, groupName: '' })
  
        dispatch(alert({ delay: 3000, text: data.msg, style: 'success' }))
        dispatch(fetchGroups({ token: user.token, refreshToken: user.refreshToken }))
      })
  }

  // * сохранение всех изменений
  const handleSaveGeneral = () => {
    saveGroups({ userId: user.id, groups: tabVariables.groups, token: user.token, refreshToken: user.refreshToken })
      .then(data => {
        if (data.error) {
          return dispatch(alert({ delay: 3000, text: data.msg, style: 'error' }))
        }
        socket.emit('groups-changed', 'server')
        dispatch(alert({ delay: 3000, text: data.msg, style: 'success' }))
        dispatch(fetchGroups({ token: user.token, refreshToken: user.refreshToken }))
      })
    saveProfiles({ userId: user.id, profiles: tabVariables.profiles, token: user.token, refreshToken: user.refreshToken })
      .then(data => {
        if (data.error) {
          return dispatch(alert({ delay: 3000, text: data.msg, style: 'error' }))
        }
        dispatch(alert({ delay: 3000, text: data.msg, style: 'success' }))
        dispatch(fetchProfiles({ token: user.token, refreshToken: user.refreshToken }))
      })
  }

  // * добавление пользователя
  const handleAddProfile = () => {
    if (!dialogCreateProfile.login) return dispatch(alert({ delay: 3000, text: 'Логин не может быть пустым', style: 'error' }))
    if (dialogCreateProfile.login.length > 64) return dispatch(alert({ delay: 3000, text: 'Логин не может быть больше 64 символов', style: 'error' }))
    if (!dialogCreateProfile.password) return dispatch(alert({ delay: 3000, text: 'Пароль не может быть пустым', style: 'error' }))
    if (!dialogCreateProfile.first_name) return dispatch(alert({ delay: 3000, text: 'Имя не может быть пустым', style: 'error' }))
    if (!dialogCreateProfile.last_name) return dispatch(alert({ delay: 3000, text: 'Фамилия не может быть пустой', style: 'error' }))
    const users = [ ...tabVariables.profiles ]
    users.push({ 
      id: new Date().getTime(),
      login: dialogCreateProfile.login,
      password: dialogCreateProfile.password,
      first_name: dialogCreateProfile.first_name,
      last_name: dialogCreateProfile.last_name,
      avatar: dialogCreateProfile.avatar,
      password_expired: dialogCreateProfile.password_expired,
      name: `${dialogCreateProfile.first_name} ${dialogCreateProfile.last_name}`
    })
    setTabVariables({ ...tabVariables, profiles: [ ...users ] })
    setDialogCreateProfile({ visible: false, login: '', avatar: '', first_name: '', last_name: '', password: '', password_expired: true })
  }

  // * удаление пользователя
  const handleRemoveProfile = (id) => {
    const users = [ ...tabVariables.profiles ]
    users.splice(users.findIndex(item => item.id.toString() === id), 1)
    setTabVariables({ ...tabVariables, profiles: [ ...users ] })
  }

  // * сброс пароля
  const handleResetPassword = () => {
    const users = [ ...tabVariables.profiles ]
    const profile = users.find(item => item.id.toString() === dialogResetPassword.id)
    profile.password = dialogResetPassword.password
    profile.password_expired = dialogResetPassword.password_expired
    setTabVariables({ ...tabVariables, profiles: [ ...users ] })
    setDialogResetPassword({ visible: false, id: '', password: '', password_expired: true })
  }
  
  // * рендер вкладки Группы
  const renderGroupsTab = () => {
    return (
      <>
        <p className='tabs__tab-title'>Группы</p>
        <div className="control">
          <ListComponent
            title='Список групп'
            search
            searchPlaceholder='Поиск группы'
            controls={[{ name: 'controlCreateGroup', label: 'Создать группу'}]}
            controlCreateGroup={() => {setDialogCreateGroup({ visible: true, groupName: '' })}}
            items={groups}
            itemsEmptyString='Еще не добавлено ни одной группы'
            itemStyle={
              breakpoints.lg || breakpoints.xl || breakpoints.xxl
                ? {
                  display: 'flex',
                  gap: '15px'
                }
                : {
                  display: 'grid',
                  gridTemplateColumns: 'minmax(200px, 1fr) auto',
                  gap: '10px'
                }
            }
            quantity={quantity}
            coloredItems
            onColorChange={handleGroupsColorChanged}
            itemControls={{ 
              control: 
                <svg viewBox="0 0 24 24">
                  <path fill="currentColor" d="M16,12A2,2 0 0,1 18,10A2,2 0 0,1 20,12A2,2 0 0,1 18,14A2,2 0 0,1 16,12M10,12A2,2 0 0,1 12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12M4,12A2,2 0 0,1 6,10A2,2 0 0,1 8,12A2,2 0 0,1 6,14A2,2 0 0,1 4,12Z" />
                </svg>,
              context: ['Изменить группу', 'Удалить группу'],
              contextActions: [
                (id) => { dispatch(setContextMenuHidden()); navigate('/groupsettings?group='+id) }, 
                (id) => { dispatch(setContextMenuHidden()); setDialogDeleteGroup({ visible: true, id: id }) }
              ]
            }}
          />
        </div>
      </>
    )
  }

  // * рендер вкладки Пользователи
  const renderUsersTab = () => {
    return (
      <>
        <p className="tabs__tab-title">Пользователи</p>
        <div className="control">
          <ListComponent
            title='Список пользователей'
            search
            searchPlaceholder='Поиск пользователя'
            controls={[{ name: 'controlCreateProfile', label: 'Создать пользователя'}]}
            controlCreateProfile={() => {setDialogCreateProfile({ visible: true, login: '', avatar: '', first_name: '', last_name: '', password: '', password_expired: true })}}
            quantity={
              tabVariables.profiles.reduce((prev, item) => {
                prev.push(item.login)
                return prev
              }, [])
            }
            items={tabVariables.profiles}
            itemsEmptyString='Еще не добавлено ни одного пользователя'
            itemStyle={
              breakpoints.lg || breakpoints.xl || breakpoints.xxl
                ? {
                  display: 'grid',
                  gridTemplateColumns: '36px minmax(100px, 1fr) 100px 32px',
                  gap: '15px'
                }
                : {
                  display: 'grid',
                  gridTemplateColumns: '100px minmax(100px, 1fr)',
                  justifyItems: 'center',
                  gap: '15px'
                }
            }
            itemControls={{ 
              control: 
                <svg viewBox="0 0 24 24">
                    <path fill="currentColor" d="M16,12A2,2 0 0,1 18,10A2,2 0 0,1 20,12A2,2 0 0,1 18,14A2,2 0 0,1 16,12M10,12A2,2 0 0,1 12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12M4,12A2,2 0 0,1 6,10A2,2 0 0,1 8,12A2,2 0 0,1 6,14A2,2 0 0,1 4,12Z" />
                </svg>,
              context: ['Изменить пользователя', 'Сбросить пароль', 'Удалить пользователя'],
              contextActions: [
                (id) => { dispatch(setContextMenuHidden()); navigate('/profilesettings?profile='+id) },
                (id) => { dispatch(setContextMenuHidden()); setDialogResetPassword({ visible: true, id: id, password: '', password_expired: true }) },
                (id) => { dispatch(setContextMenuHidden()); handleRemoveProfile(id) }
              ]
            }}
          />
        </div>
      </>
    )
  }

  // * если загрузка - вывод спиннера
  if (loading) {
    return (
      <div className="spinner-wrapper spinner-wrapper_fullscreen">
        <SpinnerComponent text='Загрузка'/>
      </div>
    )
  }

  return (
    <div className="workplace__settings settings">
      <Suspense fallback={<div className='spinner-wrapper'><SpinnerComponent text='Загрузка'/></div>}>
        <TabComponent 
          tabs={[{ name: 'groups', label: 'Группы' }, { name: 'users', label: 'Пользователи' }]}
          groups={renderGroupsTab}
          users={renderUsersTab}
          title='Основные параметры'
          onApply={handleSaveGeneral}
        />
        {/* Диалог создания группы */}
        <DialogComponent
          title='Создание группы'
          classes='dialog_fit'
          submitbtn='Создать'
          visible={dialogCreateGroup.visible}
          onClose={() => setDialogCreateGroup({ visible: false, groupName: '' })}
          onApply={handleCreateGroup}
        >
          <div className="control">
            <p className="control-label">Название группы</p>
            <input 
              type="text" 
              className="control-input" 
              value={dialogCreateGroup.groupName} 
              onChange={({ target }) => setDialogCreateGroup({ ...dialogCreateGroup, groupName: target.value })}
            />
          </div>
        </DialogComponent>
        {/* Диалог удаления группы */}
        <DialogComponent
          title='Удаление группы'
          classes='dialog dialog_fit'
          submitbtn='Удалить'
          visible={dialogDeleteGroup.visible}
          onClose={() => setDialogDeleteGroup({ visible: false, id: '' })}
          onApply={handleDeleteGroup}
        >
          <p className='dialog__text dialog__text_question'>Вы действительно хотите удалить группу? <br /> Это действие невозможно отменить. </p>
        </DialogComponent>
        {/* Диалог добавления пользователя */}
        <DialogComponent
          title='Создание пользователя'
          classes='dialog_fit'
          submitbtn='Создать'
          visible={dialogCreateProfile.visible}
          onClose={() => setDialogCreateProfile({ visible: false, login: '', avatar: '', first_name: '', last_name: '', password: '', password_expired: true })}
          onApply={handleAddProfile}
        >
          <div className="control">
            <div className="control-label">Логин</div>
            <input 
              type="text" 
              className="control-input" 
              maxLength='64'
              value={dialogCreateProfile.login} 
              onChange={({ target: { value } }) => setDialogCreateProfile({ ...dialogCreateProfile, login: value })} 
            />
          </div>
          <div className="control">
            <div className="control-label">Пароль</div>
            <input 
              type="password" 
              className="control-input" 
              maxLength='64'
              value={dialogCreateProfile.password} 
              onChange={({ target: { value } }) => setDialogCreateProfile({ ...dialogCreateProfile, password: value })} 
            />
          </div>
          <div className="control">
            <div className="control-label">Имя</div>
            <input 
              type="text" 
              className="control-input" 
              maxLength='32'
              value={dialogCreateProfile.first_name} 
              onChange={({ target: { value } }) => setDialogCreateProfile({ ...dialogCreateProfile, first_name: value })} 
            />
          </div>
          <div className="control">
            <div className="control-label">Фамилия</div>
            <input 
              type="text" 
              className="control-input" 
              maxLength='32'
              value={dialogCreateProfile.last_name} 
              onChange={({ target: { value } }) => setDialogCreateProfile({ ...dialogCreateProfile, last_name: value })} 
            />
          </div>
          <div className="control">
            <p className="control-hint">При первом входе у пользователя потребует сменить пароль</p>
            <p className="control-hint">Заполнение дополнительной информации (email, номер телефона, дата рождения) остается на усмотрение пользователя</p>
          </div>
        </DialogComponent>
        {/* Диалог добавления пользователя */}
        <DialogComponent
          title='Создание временного пароля'
          classes='dialog_fit'
          submitbtn='Подтвердить'
          visible={dialogResetPassword.visible}
          onClose={() => setDialogResetPassword({ visible: false, id: '', password: '', password_expired: true })}
          onApply={handleResetPassword}
        >
          <div className="control">
            <div className="control-label">Временный пароль</div>
            <input 
              type="text" 
              className="control-input" 
              value={dialogResetPassword.password} 
              onChange={({ target: { value } }) => setDialogResetPassword({ ...dialogResetPassword, password: value })} 
            />
          </div>
          <div className="control">
            <p className="control-hint">Не забудьте сохранить изменения, чтобы сброс пароля вступил в силу.</p>
            <p className="control-hint">Сообщите этот пароль пользователю, при первом входе у него потребует сменить пароль.</p>
          </div>
        </DialogComponent>
      </Suspense>
    </div>
  )
}