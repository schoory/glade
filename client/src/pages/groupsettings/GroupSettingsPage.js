import { lazy, Suspense, useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProfiles } from './../../asyncActions/profiles';
import { HexColorInput, HexColorPicker } from 'react-colorful';
import { SpinnerComponent } from './../../components/spinner/SpinnerComponent';
import { fetchGroups } from '../../asyncActions/groups';
import { saveGroups, addProfilesToGroup } from '../../api/groups.api';
import { alert } from '../../asyncActions/alert';

const TabComponent = lazy(() => import('../../components/tabs/TabComponent'))
const ListComponent = lazy(() => import('../../components/list/ListComponent'))
const DialogComponent = lazy(() => import('../../components/dialog/DialogComponent'))

export const GroupSettingsPage = () => {

  const user = useSelector(state => state.user.user)
  const groups = useSelector(state => state.groups.groups)
  const profiles = useSelector(state => state.profiles.profiles)
  const socket = useSelector(state => state.socket.socket)

  const dispatch = useDispatch()

  const navigate = useNavigate()
  const [searchParams, setSearchParams]  = useSearchParams()

  const [tabVariables, setTabVariables] = useState({
    id: '',
    name: '',
    color: '',
    role: '',
    profiles: []
  })

  const [profilesList, setProfilesList] = useState([])

  const [groupId, setGroupId] = useState('')
  const [groupName, setGroupName] = useState('')

  const [dialogManage, setDialogManage] = useState({ visible: false })

  // * получение списка групп и пользователей
  useEffect(() => {
    dispatch(fetchProfiles({ token: user.token, refreshToken: user.refreshToken }))
    dispatch(fetchGroups({ token: user.token, refreshToken: user.refreshToken }))
  }, [])

  // * получение id группы с параметров поисковой строки
  useEffect(() => {
    const groupId = searchParams.get('group')
    if (!groupId) {
      navigate('/generalsettings')
    }
    setGroupId(groupId)
  }, [searchParams])

  // * установка каналов и пользователей связанных с каналом
  useEffect(() => {
    if (groupId) {
      const groupData = groups.find(item => item.id === groupId)
      setGroupName(groupData ? groupData.name : '')
      setTabVariables({
        id: groupId,
        name: groupData ? groupData.name : '',
        color: groupData ? groupData.color : '#000',
        role: groupData ? groupData.role : 'user',
        profiles: profiles.filter(item => item.group_id === groupId)
      })
    }
  }, [profiles, groupId, groups])

  useEffect(() => {
    if (tabVariables.profiles.length > 0) {
      setProfilesList(
        tabVariables.profiles.reduce((prev, item) => {
          prev.push({ id: item.id, name: `${item.first_name} ${item.last_name}`, avatar: item.avatar })
          return prev
        }, [])
      )
    } else { setProfilesList([]) }
  }, [tabVariables])

  // * сохранение изменений
  const handleSaveGroupSettings = () => {
    if (!tabVariables.name) return dispatch(alert({ delay: 3000, text: 'Название группы не может быть пустым', style: 'error' }))
    if (tabVariables.name.length > 32) return dispatch(alert({ delay: 3000, text: 'Название группы не может быть больше 32 символов', style: 'error' }))

    saveGroups({ 
      userId: user.id, groups: [{ id: tabVariables.id, name: tabVariables.name, color: tabVariables.color, role: tabVariables.role }],
      token: user.token, refreshToken: user.refreshToken
    })
      .then(data => {
        if (data.error) {
          return dispatch(alert({ delay: 3000, text: data.msg, style: 'error' }))
        }
        socket.emit('groups-changed', 'server')
        addProfilesToGroup({ 
          userId: user.id, profiles: tabVariables.profiles, groupId: groupId, 
          token: user.token, refreshToken: user.refreshToken 
        })
          .then(data => {
            if (data.error) {
              return dispatch(alert({ delay: 3000, text: data.msg, style: 'error' }))
            }
            socket.emit('users-changed', 'server')
            dispatch(alert({ delay: 3000, text: data.msg, style: 'success' }))
            dispatch(fetchProfiles({ token: user.token, refreshToken: user.refreshToken }))
            dispatch(fetchGroups({ token: user.token, refreshToken: user.refreshToken }))
          })
      })
  }

  // * рендер вкладки Основные
  const renderGeneralSettings = () => {
    return (
      <>
        <p className="tabs__tab-title">Основные</p>
        <div className="control">
          <p className="control-label">Название группы</p>
          <input 
            type="text" 
            className='control-input' 
            value={tabVariables.name} 
            onChange={({ currentTarget: { value } }) => setTabVariables({ ...tabVariables, name: value })}
          />
        </div>
        <div className="control">
          <p className="control-label">Администрирование</p>
          <label 
            className={
              tabVariables.role === 'administrator'
                ? "control-checkbox control-checkbox_active"
                : "control-checkbox"
            }
          >
            <input 
              type="checkbox" 
              name='role' 
              checked={tabVariables.role === 'administrator'}
              onChange={({ target: { checked } }) => setTabVariables({ ...tabVariables, role: checked ? 'administrator' : 'user' })} 
            />
            Права администратора
            <p className="control-hint">Когда включено, все пользователи, принадлежащие этой группе, считаются администраторами.</p>
          </label>
        </div>
        <div className="control">
          <p className="control-label">Цвет группы</p>
          <HexColorPicker className='control-color' color={tabVariables.color} onChange={(value) => { setTabVariables({ ...tabVariables, color: value }) }}/>
          <HexColorInput className='control-input' color={tabVariables.color} onChange={(value) => { setTabVariables({ ...tabVariables, color: value }) }}/>
        </div>
      </>
    )
  }

  const renderUserSettings = () => {
    return (
      <>
        <p className="tabs__tab-title">Пользователи</p>
        <Suspense fallback={<div className='spinner-wrapper'><SpinnerComponent text='Загрузка' /></div>}>
          <ListComponent
            title='Список пользователей'
            search
            searchPlaceholder='Поиск пользователя'
            controls={[{ name: 'controlAddUser', label: 'Управление'}]}
            controlAddUser={() => setDialogManage({ visible: true })}
            items={profilesList}
            itemsEmptyString='К этой группе не добавлено ни одного пользователя'
            itemStyle={{
              display: 'flex',
              gap: '15px'
            }}
          />
        </Suspense>
      </>
    )
  }

  
  return (
    <div className="workplace__settings settings">
      <Suspense fallback={<div className='spinner-wrapper'><SpinnerComponent text='Загрузка' /></div>}>
        <TabComponent 
          tabs={[{ name: 'general', label: 'Основные' }, { name: 'users', label: 'Пользователи' }]}
          title={`Изменение ${groupName}`}
          general={renderGeneralSettings}
          users={renderUserSettings}
          onApply={handleSaveGroupSettings}
          onClose={() => navigate('/generalsettings')}
        />
        {/* Диалог добавления пользователя к группе */}
        <DialogComponent
          title='Добавить пользователей к группе'
          classes='dialog'
          noActions
          visible={dialogManage.visible}
          onClose={() => setDialogManage({ visible: false })}
        >
          {
            profiles.length === 0
              ? <p className='dialog__text'>Нет пользователей для добавления</p>
              : (
                <div className="dialog__list">
                  {
                    profiles.map((item, index) => {
                      return (
                        <div 
                          className={
                            tabVariables.profiles.findIndex(profileItem => profileItem.id === item.id) !== -1
                              ? "dialog__list-item dialog__list-item_active"
                              : "dialog__list-item"
                          } 
                          key={index} 
                          data-id={item.id}
                          onClick={({ currentTarget }) => {
                            const id = currentTarget.getAttribute('data-id') 
                            const profile = profiles.find(item => item.id.toString() === id)
                            const profileIndex = tabVariables.profiles.findIndex(profileItem => profileItem.id === profile.id)
                            if (profileIndex === -1) {
                              const users = [ ...tabVariables.profiles ]
                              users.push(profile)
                              setTabVariables({ ...tabVariables, profiles: [ ...users ] })
                            } else {
                              const users = [ ...tabVariables.profiles ]
                              users.splice(profileIndex, 1)
                              setTabVariables({ ...tabVariables, profiles: [ ...users ] })
                            }
                          }}
                        >
                          <div className='dialog__list-item-avatar'>
                            <img src={item.avatar ? `${document.location.origin}/i/${item.avatar}` : `${document.location.origin}/i/avatar-sample.jpg`} alt="" />
                          </div>
                          <p className="dialog__list-item-name">{`${item.first_name} ${item.last_name}`}</p>
                        </div>
                      )
                    })
                  }
                </div>
              )
          }
        </DialogComponent>
      </Suspense>
    </div>
  )
}