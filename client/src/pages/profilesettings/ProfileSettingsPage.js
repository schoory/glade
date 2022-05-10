import { lazy, Suspense, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProfiles } from './../../asyncActions/profiles';
import { SpinnerComponent } from './../../components/spinner/SpinnerComponent';
import { fetchGroups } from '../../asyncActions/groups';
import { alert } from '../../asyncActions/alert';
import { saveProfile } from '../../api/profiles.api';
import { request } from '../../api';

const TabComponent = lazy(() => import('../../components/tabs/TabComponent'))
const ListComponent = lazy(() => import('../../components/list/ListComponent'))
const DialogComponent = lazy(() => import('../../components/dialog/DialogComponent'))

export const ProfileSettingsPage = () => {

  const user = useSelector(state => state.user.user)
  const groups = useSelector(state => state.groups.groups)
  const profiles = useSelector(state => state.profiles.profiles)
  const socket = useSelector(state => state.socket.socket)

  const dispatch = useDispatch()

  const navigate = useNavigate()
  const [searchParams, setSearchParams]  = useSearchParams()

  const [tabVariables, setTabVariables] = useState({
    id: '',
    login: '',
    role: '',
    group: null
  })

  const [profileId, setProfileId] = useState('')
  const [profileName, setProfileName] = useState('')

  const [dialogProfileGroup, setDialogProfileGroup] = useState({ visible: false, groupId: '' })

  // * получение списка групп и пользователей
  useEffect(() => {
    dispatch(fetchProfiles({ token: user.token, refreshToken: user.refreshToken }))
    dispatch(fetchGroups({ token: user.token, refreshToken: user.refreshToken }))
  }, [])

  // * получение id группы с параметров поисковой строки
  useEffect(() => {
    const profileId = searchParams.get('profile')
    if (!profileId) {
      navigate('/generalsettings')
    }
    setProfileId(profileId)
  }, [searchParams])

  // * установка каналов и пользователей связанных с каналом
  useEffect(() => {
    if (profileId) {
      const profileData = profiles.find(item => item.id === profileId)
      setProfileName(profileData ? profileData.login : '')
      setTabVariables({
        id: profileId,
        login: profileData ? profileData.login : '',
        role: profileData ? profileData.role : 'user',
        group: profileData ? groups.find(item => item.id === profileData.group_id) : null
      })
    }
  }, [profiles, profileId, groups])

  // * сохранение изменений
  const handleSaveProfileSettings = () => {
    saveProfile({ 
      userId: user.id, profileId: tabVariables.id, role: tabVariables.role, groupId: tabVariables.group ? tabVariables.group.id : null ,
      token: user.token, refreshToken: user.refreshToken
    })
      .then(data => {
        if (data.error) {
          return dispatch(alert({ delay: 3000, text: data.msg, style: 'error' }))
        }
        socket.emit('users-changed', { id: 'server', selfIncluded: true})
        dispatch(alert({ delay: 3000, text: data.msg, style: 'success' }))
      })
  }

  // * изменение группы
  const handleChangeGroup = ({ currentTarget }) => {
    const groupId = currentTarget.getAttribute('data-id')
    setTabVariables({
      ...tabVariables,
      group: groups.find(item => item.id === groupId)
    })

    setDialogProfileGroup({ visible: false, groupId: '' })
  }

  // * рендер вкладки Основные
  const renderGeneralSettings = () => {
    return (
      <>
        <div className="tabs__tab-title">Основные</div>
        <div className="control">
          <p className="control-label">Логин</p>
          <input 
            type="text" 
            className="control-input" 
            readOnly
            value={tabVariables.login}
          />
        </div>
        <div className="control">
          <div className="control-label">Администрирование</div>
          <label className={
            tabVariables.role === 'administrator'
              ? "control-checkbox control-checkbox_active"
              : "control-checkbox"
          }>
            <input type="checkbox" checked={tabVariables.role !== 'user'} onChange={
              ({ currentTarget: { checked } }) => {
                setTabVariables({ ...tabVariables, role: checked ? 'administrator' : 'user' })
              }
            } />
            Права администратора
            {
              tabVariables.group && tabVariables.group.role === 'administrator'
                ? <div className="control-hint">Этот пользователь уже имеет права администратора, которые он унаследовал от своей группы.</div>
                : <></>
            }
            <div className="control-hint">Дает пользователю привилегии администратора.</div>
          </label>
        </div>
        <div className="control">
          <p className="control-label">Группа пользователя</p>
          <input 
            type="text" 
            className="control-input" 
            readOnly
            style={{ cursor: 'pointer', color: tabVariables.group && tabVariables.group.color ? tabVariables.group.color : '#000' }} 
            placeholder='Группа не выбрана'
            value={tabVariables.group ? tabVariables.group.name : ''}
            onClick={() => { setDialogProfileGroup({ visible: true, groupId: tabVariables.group ? tabVariables.group.id : '' }) }}
          />
          {
            !tabVariables.group
              ? 
              <p className="control-hint">
                Этому пользователю не назначена группа. <br />
                Кликните по полю ввода, чтобы выбрать.
              </p>
              : <></>
          }
        </div>
      </>
    )
  }

  
  return (
    <div className="workplace__settings settings">
      <Suspense fallback={<div className='spinner-wrapper'><SpinnerComponent text='Загрузка' /></div>}>
        <TabComponent 
          tabs={[{ name: 'general', label: 'Основные' }]}
          title={`Изменение ${profileName}`}
          general={renderGeneralSettings}
          onApply={handleSaveProfileSettings}
          onClose={() => navigate('/generalsettings')}
        />
        <DialogComponent
          title='Выбор группы'
          classes='dialog'
          submitbtn='Удалить'
          visible={dialogProfileGroup.visible}
          onClose={() => setDialogProfileGroup({ visible: false, id: '' })}
          noActions
        >
          <div className="dialog__list">
            <div className="dialog__list-item" data-id={null} onClick={handleChangeGroup}>
              <div className="dialog__list-item-name">
                Убрать группу
              </div>
            </div>
            {
              groups.map((item, index) => {
                return (
                  <div className="dialog__list-item" data-id={item.id} onClick={handleChangeGroup} key={index}>
                    <div className="dialog__list-item-name" style={{ color: item.color ? item.color : '#000' }}>
                      {
                        item.name
                      }
                    </div>
                  </div>
                )
              })
            }
          </div>
        </DialogComponent>
      </Suspense>
    </div>
  )
}