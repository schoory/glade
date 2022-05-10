import { lazy, Suspense, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProfiles } from './../../asyncActions/profiles';
import { fetchChannels } from './../../asyncActions/channels';
import { request } from './../../api/index';
import { alert } from './../../asyncActions/alert';
import { SpinnerComponent } from './../../components/spinner/SpinnerComponent';
import { fetchGroups } from '../../asyncActions/groups';

const TabComponent = lazy(() => import('../../components/tabs/TabComponent'))

export const CreateChannelPage = () => {

  const user = useSelector(state => state.user.user)
  const groups = useSelector(state => state.groups.groups)
  const socket = useSelector(state => state.socket.socket)
  const dispatch = useDispatch()

  const navigate = useNavigate()

  const [tabVariables, setTabVariables] = useState({
    name: '',
    type: 'text',
    permissions: 'public',
    groups: []
  })

  const [groupNames, setGroupNames] = useState([]) // список только названий групп

  // * получение только названий групп
  useEffect(() => {
    setGroupNames(groups.reduce((prev, item) => {
      prev.push(item.name)
      return prev
    }, []))
  }, [groups])

  // * получение списка групп 
  useEffect(() => {
    dispatch(fetchGroups({ token: user.token, refreshToken: user.refreshToken }))
  }, [])

  // * если у пользователя нет полномочий находиться на этой странице редирект на страницу с каналами
  useEffect(() => {
    if ((user.role !== 'administrator') && (!user.group_id || groups.find(item => item.id === user.group_id).role !== 'administrator')) {
      return navigate('/channels')
    }
  }, [user, groups])

  // * создание нового канала
  const handleCreateNewChannel = () => {
    if (!tabVariables.name) {
      return dispatch(alert({ delay: 3000, text: 'Введите название канала', style: 'error' }))
    }
    if (tabVariables.name.length > 64) {
      return dispatch(alert({ delay: 3000, text: 'Название канала не должно быть больше 64 символов', style: 'error' }))
    }
    request(
      '/api/channels/newchannel',
      'POST',
      {
        userId: user.id,
        values: tabVariables
      }, {
        Authorization: `Bearer ${user.token}`,
        Refresh: `Bearer ${user.refreshToken}`
      }
    ).then((data) => {
      if (data.error) {
        return dispatch(alert({ delay: 3000, text: data.msg, style: 'error' }))
      }
      socket.emit('channels-changed', 'server')
      dispatch(alert({ delay: 3000, text: data.msg, style: 'success' }))
      dispatch(fetchChannels({ userId: user.id, token: user.token, refreshToken: user.refreshToken }))
      return navigate('/channels')
    })
  }

  // * обработка имени канала
  const handleChangeChannelName = ({ target: { value } }) => {
    const inputValue = value.replace(/[^A-Za-zА-Яа-я\w\s\-]/gm, '').replace(/\s+/gm, '-').replace(/-+/gm, '-').toLowerCase()
    setTabVariables({ ...tabVariables, name: inputValue })
  }

  // * рендер основной вкладки
  const renderGeneralSettings = () => {
    return (
      <>
        <p className='tabs__tab-title'>Основные</p>
        <div className="control">
          <p className="control-label">Название канала</p>
          <input 
            type="text" 
            name='name' 
            className="control-input" 
            value={tabVariables.name} 
            onChange={handleChangeChannelName}
          />
        </div>
        <div className="control">
          <p className="control-label">Тип канала</p>
          <label 
            className={
              tabVariables.type === 'text'
                ? "control-radio control-radio_active"
                : "control-radio"
            }
          >
            <input 
              type="radio" 
              name='type' 
              checked={tabVariables.type === 'text'}
              onChange={() => setTabVariables({ ...tabVariables, type: 'text' })} 
            />
            Текстовый канал
          </label>
          <label 
            className={
              tabVariables.type === 'voice'
                ? "control-radio control-radio_active"
                : "control-radio"
            }
          >
            <input 
              type="radio" 
              name='type' 
              checked={tabVariables.type === 'voice'}
              onChange={() => setTabVariables({ ...tabVariables, type: 'voice' })} 
            />
            Голосовой канал
          </label>
        </div>
      </>
    )
  }

  // * рендер вкладки с правами доступа к каналу
  const renderPermissionsSettings = () => {
    return (
      <>
        <p className='tabs__tab-title'>Права доступа</p>
        <div className="control">
          <p className="control-label">Видимость</p>
          <label 
            className={
              tabVariables.permissions === 'public'
                ? "control-radio control-radio_active"
                : "control-radio"
            }
          >
            <input 
              type="radio" 
              name='visibility' 
              checked={tabVariables.permissions === 'public'}
              onChange={({ currentTarget }) => setTabVariables({ ...tabVariables, permissions: 'public' })} 
            />
            Публичный
            <p className='control-hint'>
              Все пользователи могут использовать данный канал.
            </p>
          </label>
          <label 
            className={
              tabVariables.permissions === 'private'
                ? "control-radio control-radio_active"
                : "control-radio"
            }
          >
            <input 
              type="radio" 
              name='visibility' 
              checked={tabVariables.permissions === 'private'}
              onChange={({ currentTarget }) => setTabVariables({ ...tabVariables, permissions: 'private' })} 
            />
            Приватный
            <p className='control-hint'>
              Использовать этот канал может ограниченный список пользователей, но все видят его в списке каналов.
            </p>
          </label>
          <label 
            className={
              tabVariables.permissions === 'hidden'
                ? "control-radio control-radio_active"
                : "control-radio"
            }
          >
            <input 
              type="radio" 
              name='visibility' 
              checked={tabVariables.permissions === 'hidden'}
              onChange={({ currentTarget }) => setTabVariables({ ...tabVariables, permissions: 'hidden' })} 
            />
            Скрытый
            <p className='control-hint'>
              Использовать этот канал может ограниченный список пользователей. В списке каналов его видят только те, кому разрешен к нему доступ.
            </p>
          </label>
        </div>
        {
          tabVariables.permissions === 'private' || tabVariables.permissions === 'hidden'
            ? (
              <div className='control'>
                <p className="control-label">Добавьте группы, которым разрешен доступ к этому каналу</p>
                  {
                    groups.length > 0
                    ? (
                      <div className="tabs__tab-groups">
                        <div className="tabs__tab-groups-list">
                          <div 
                            className="tabs__tab-groups-item"
                            onClick={() => setTabVariables({ ...tabVariables, groups: [ ...groupNames ] })}
                          >
                            <p>Все роли</p>
                            <button className="btn-icon">
                              <svg viewBox="0 0 24 24">
                                <path fill="currentColor" d="M5.59,7.41L7,6L13,12L7,18L5.59,16.59L10.17,12L5.59,7.41M11.59,7.41L13,6L19,12L13,18L11.59,16.59L16.17,12L11.59,7.41Z" />
                              </svg>
                            </button>
                          </div>
                          {
                            groupNames.map((item, index) => {
                              return (
                                <div 
                                  className="tabs__tab-groups-item"
                                  key={index}
                                  data-group={item}
                                  onClick={({ currentTarget }) => { 
                                    const group = currentTarget.getAttribute('data-group')
                                    const list = [ ...tabVariables.groups ]
                                    list.push(group)
                                    if (!tabVariables.groups.includes(group)) {
                                      setTabVariables({ ...tabVariables, groups: [ ...list ] })
                                    }
                                  }}
                                >
                                  <p>{item}</p>
                                  <button className="btn-icon">
                                    <svg viewBox="0 0 24 24">
                                      <path fill="currentColor" d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z" />
                                    </svg>
                                  </button>
                                </div>
                              ) 
                            })
                          }
                        </div>
                        <div className="tabs__tab-groups-added">
                          {
                            tabVariables.groups.length > 0
                              ? (
                                <div 
                                  className="tabs__tab-groups-item"
                                  onClick={() => { 
                                    setTabVariables({ ...tabVariables, groups: [] })
                                  }}
                                >
                                  <p>Все роли</p>
                                  <button className="btn-icon">
                                    <svg viewBox="0 0 24 24">
                                      <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                                    </svg>
                                  </button>
                                </div>
                              )
                              : (
                                <></>
                              )
                          }
                          {
                            tabVariables.groups.map((item, index) => {
                              return (
                                <div 
                                  className="tabs__tab-groups-item"
                                  key={index}
                                  data-group={item}
                                  onClick={({ currentTarget }) => { 
                                    const group = currentTarget.getAttribute('data-group')
                                    const list = [ ...tabVariables.groups ]
                                    list.splice(list.indexOf(group), 1)
                                    setTabVariables({ ...tabVariables, groups: [ ...list ] })
                                  }}
                                >
                                  <p>{item}</p>
                                  <button className="btn-icon">
                                    <svg viewBox="0 0 24 24">
                                      <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                                    </svg>
                                  </button>
                                </div>
                              ) 
                            })
                          }
                        </div>
                      </div>
                    )
                    : <p className='control-hint'>У вас не добавлено ни одной группы. <br /> В таком случае, канал будет виден только администраторам.</p>
                  }
              </div>
            )
            : (
              <></>
            )
        }
      </>
    )
  }

  return (
    <div className="workplace__settings settings">
      <Suspense fallback={<div className='spinner-wrapper'><SpinnerComponent text='Загрузка' /></div>}>
        <TabComponent 
          tabs={[{ name: 'general', label: 'Основные' }, { name: 'permissions', label: 'Права доступа' }]}
          title='Создание канала'
          general={renderGeneralSettings}
          permissions={renderPermissionsSettings}
          onApply={handleCreateNewChannel}
        />
      </Suspense>
    </div>
  )
}