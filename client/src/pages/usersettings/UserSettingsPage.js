
import { lazy, Suspense, useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"
import { uploadAvatar } from "../../api/files.api"
import { alert } from "../../asyncActions/alert"
import { fetchUser } from "../../asyncActions/user"
import { format, sub } from 'date-fns'
import { SpinnerComponent } from "../../components/spinner/SpinnerComponent"

import { changePassword, saveSettings } from "../../api/user.api"
import { logoutUser } from "../../store/userReducer"
import DialogComponent from './../../components/dialog/DialogComponent';

const TabComponent = lazy(() => import('../../components/tabs/TabComponent'))

export const UserSettingsPage = () => {

  const user = useSelector(state => state.user.user)
  const dispatch = useDispatch()

  const navigate = useNavigate()

  const avatarPath = document.location.origin + '/i/' 
  const sampleAvatarPath = document.location.origin + '/i/avatar-sample.jpg'
  
  const [firstName, setFirstName] = useState(user.first_name ? user.first_name : '')
  const [lastName, setLastName] = useState(user.last_name ? user.last_name : '')
  const [email, setEmail] = useState(user.email ? user.email : '')
  const [phone, setPhone] = useState(user.phone ? user.phone : '')
  const [birthDate, setBirthDate] = useState(user.birth_date ? format(new Date(user.birth_date), 'yyyy-MM-dd') : '')
  const [avatar, setAvatar] = useState(user.avatar ? avatarPath + user.avatar : sampleAvatarPath)

  const [emailVisibility, setEmailVisibility] = useState(user.privacy && user.privacy.indexOf('allowemail') !== -1 ? true : false)
  const [phoneVisibility, setPhoneVisibility] = useState(user.privacy && user.privacy.indexOf('allowphone') !== -1 ? true : false)
  const [birthDateVisibility, setBirthDateVisibility] = useState(user.privacy && user.privacy.indexOf('allowbirthdate') !== -1 ? true : false)

  const [restoreCode, setRestoreCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [dialogQuit, setDialogQuit] = useState(false)


  const [inputsErrors, setInputsErrors] = useState({ 
    restoreCode: { hasError: false, msg: '' }, 
    password: { hasError: false, msg: '' }, 
    confirmPassword: { hasError: false, msg: '' } 
  })

  // * установка аватара
  useEffect(() => {
    setAvatar(user.avatar ? avatarPath + user.avatar : sampleAvatarPath)
  }, [user])

  // * валидация пароля
  const validatePassword = () => {
    const errors = { restoreCode: { hasError: false, msg: '' }, password: { hasError: false, msg: '' }, confirmPassword: { hasError: false, msg: '' } }

    if (!restoreCode.trim()) {
      errors.restoreCode = { 
        hasError: true, 
        msg: 'Необходимо ввести код для восстановления' 
      }
    } else {
      errors.restoreCode = { hasError: false, msg: '' }
    }

    const passwordRegexp = /(?=.*[0-9])(?=.*[!@#-_$%^&*])(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z!@#-_$%^&*]{8,}/g
    if (!password.match(passwordRegexp)) {
      errors.password = {
        hasError: true,
        msg: `
        Требования к созданию пароля:\n
        - пароль должен содержать 8 или более символов\n
        - пароль должен состоять из латинских символов\n
        - пароль должен содержать хотя бы одну строчную и заглавную букву\n
        - пароль должен включать хотя бы 1 цифру\n
        - пароль должен включать хотя бы 1 спец. символ
        `
      }
    } else {
      errors.password = { hasError: false, msg: '' }
    }
    
    if (confirmPassword !== password || !confirmPassword) {
      errors.confirmPassword = {
        hasError: true,
        msg: 'Подтвердите пароль'
      }
    } else {
      errors.confirmPassword = { hasError: false, msg: '' }
    }

    if (errors.restoreCode.hasError || errors.password.hasError || errors.confirmPassword.hasError) {
      setInputsErrors({ ...inputsErrors, restoreCode: errors.restoreCode, password: errors.password, confirmPassword: errors.confirmPassword })
      return false
    } else {
      setInputsErrors({ 
        restoreCode: { hasError: false, msg: '' }, 
        password: { hasError: false, msg: '' }, 
        confirmPassword: { hasError: false, msg: '' } 
      })
      return true
    }
  }

  // * сохранение изменений
  const handleApplyChanges = () => {
    const phoneRegexp = /^(\s*)?(\+)?([- _():=+]?\d[- _():=+]?){10,14}(\s*)?$/
    if (phone && !phone.match(phoneRegexp)) {
      return dispatch(alert({ delay: 3000, text: 'Некорректное значение номера телефона', style: 'error' }))
    }
    if (new Date('1900-01-01').getTime() > new Date(birthDate).getTime()) {
      return dispatch(alert({ delay: 3000, text: 'Дата рождения меньше допустимой', style: 'error' }))
    }
    if (sub(new Date(), { years: 10 }).getTime() < new Date(birthDate).getTime()) {
      return dispatch(alert({ delay: 3000, text: 'Дата рождения больше допустимой', style: 'error' }))
    }
    const emailRegexp = /^[A-Z0-9._%+-]+@[A-Z0-9-]+.+.[A-Z]{2,4}$/i
    if (email && !email.match(emailRegexp)) {
      return dispatch(alert({ delay: 3000, text: 'Некорректное значение Email', style: 'error' }))
    }

    let privacy = ''
    if (emailVisibility) {
      privacy += 'allowemail'
    }
    if (phoneVisibility) {
      privacy += ', allowphone'
    }
    if (birthDateVisibility) {
      privacy += ', allowbirthdate'
    }

    // сохранение данных о пользователе
    saveSettings({ 
      userId: user.id, 
      firstName: firstName, 
      lastName: lastName, 
      phone: phone,
      email: email,
      birthDate: birthDate,
      privacy: privacy,
      token: user.token, 
      refreshToken: user.refreshToken
    }).then(data => {
      if (data.error) {
        return dispatch(alert({ delay: 3000, text: data.msg, style: 'error' }))
      }
      // если введен пароль и старый пароль - валидация пароля и его изменения
      if (password || restoreCode) {
        if (!validatePassword()) {
          return dispatch(alert({ delay: 3000, text: 'Невозможно изменить пароль', style: 'error' }))
        } else {
          // изменение пароля пользователя
          changePassword({ userId: user.id, oldPassword: restoreCode, newPassword: password, token: user.token, refreshToken: user.refreshToken }).then(data => {
            if (data.error) {
              return dispatch(alert({ delay: 3000, text: data.msg, style: 'error' }))
            }
            dispatch(fetchUser({ email: user.login, password: password }))
            return dispatch(alert({ delay: 1500, text: 'Данные сохранены', style: 'success' }))
          })
        }
      } else {
        dispatch(fetchUser({ token: user.token, refreshToken: user.refreshToken }))
        return dispatch(alert({ delay: 1500, text: 'Данные сохранены', style: 'success' }))
      }
    })

    if (password || restoreCode) {
      if (!validatePassword()) {
        return dispatch(alert({ delay: 3000, text: 'Невозможно изменить пароль', style: 'error' }))
      }
    }
  }

  // * загрузка нового аватара
  const handleNewAvatar = ({ target }) => {
    if (target.files[0]) {
      uploadAvatar({ userId: user.id, avatarFile: target.files[0], token: user.token, refreshToken: user.refreshToken }).then(data => {
        if (data.error) {
          return dispatch(alert({ delay: 3000, text: data.msg, style: 'error' }))
        }
        dispatch(fetchUser({ token: user.token, refreshToken: user.refreshToken }))
      })
    }
  }

  // * рендер вкладки Основные
  const renderGeneralSettings = () => {
    return (
      <>
        <p className="tabs__tab-title">Основные</p>
        <div className="control control_outlined">
          <label htmlFor="avatar" className="control-avatar">
            <img src={avatar} alt="" />
            <div>
              <p className="control-label">Аватар</p>
              <p className="control-avatar-value">Выберите файл</p>
            </div>
            <input type="file" id="avatar" style={{ display: 'none' }} onChange={handleNewAvatar} />
          </label>
          <div className="control-divider" />
          <p className="control-label">Логин</p>
          <p className="control-value">{ user.login }</p>
        </div>
        <div className="control">
          <p className="control-label">Имя</p>
          <input type="text" className="control-input" value={firstName} onChange={({ target: { value } }) => setFirstName(value)} />
        </div>
        <div className="control">
          <p className="control-label">Фамилия</p>
          <input type="text" className="control-input" value={lastName} onChange={({ target: { value } }) => setLastName(value)} />
        </div>
        <div className="control">
          <p className="control-label">Email</p>
          <input type="email" className="control-input" value={email} onChange={({ target: { value } }) => setEmail(value)} />
        </div>
        <div className="control">
          <p className="control-label">Номер телефона</p>
          <input type="text" className="control-input" value={phone} onChange={({ target: { value } }) => setPhone(value)} />
        </div>
        <div className="control">
          <p className="control-label">Дата рождения</p>
          <input type="date" 
            className="control-input" 
            min={'1900-01-01'}
            max={format(sub(new Date(), { years: 10 }), 'yyyy-MM-dd')} 
            value={birthDate} 
            onChange={({ target: { value } }) => setBirthDate(value)} 
          />
        </div>
      </>
    )
  }

  // * рендер вкладки Конфиденциальность
  const renderPermisstionsSettings = () => {
    return (
      <>
        <p className="tabs__tab-title">Конфиденциальность</p>
        <div className="control">
          <p className="control-label">Видимость данных</p>
          <label 
            className={
              emailVisibility
                ? "control-checkbox control-checkbox_active"
                : "control-checkbox"
            }
          >
            <input 
              type="checkbox" 
              name='role' 
              checked={emailVisibility}
              onChange={({ target: { checked } }) => setEmailVisibility(checked)} 
            />
            Видимость электронной почты 
            <p className="control-hint">Когда включено, все пользователи могут видеть вашу электронную почту, зайдя на ваш профиль.</p>
          </label>
          <label 
            className={
              phoneVisibility
                ? "control-checkbox control-checkbox_active"
                : "control-checkbox"
            }
          >
            <input 
              type="checkbox" 
              name='role' 
              checked={phoneVisibility}
              onChange={({ target: { checked } }) => setPhoneVisibility(checked)} 
            />
            Видимость номера телефона
            <p className="control-hint">Когда включено, все пользователи могут видеть ваш номер телефона, зайдя на ваш профиль.</p>
          </label>
          <label 
            className={
              birthDateVisibility
                ? "control-checkbox control-checkbox_active"
                : "control-checkbox"
            }
          >
            <input 
              type="checkbox" 
              name='role' 
              checked={birthDateVisibility}
              onChange={({ target: { checked } }) => setBirthDateVisibility(checked)} 
            />
            Видимость даты рождения
            <p className="control-hint">Когда включено, все пользователи могут видеть вашу дату рождения, зайдя на ваш профиль.</p>
          </label>
        </div>
      </>
    )
  }

  // * рендер вкладки Безопасность
  const renderSecuritySettings = () => {
    return (
      <>
        <p className="tabs__tab-title">Безопасность</p>
        <div className="control">
          <p className="control-label">Смена пароля</p>
        </div>
        <div className="control">
          <p className="control-label">Старый пароль</p>
          <input type="password" className="control-input control-input_green" value={restoreCode} onChange={({ target: { value } }) => setRestoreCode(value)} />
          { 
            inputsErrors.restoreCode.hasError
              ? <p className="control-hint control-hint_error" style={{ margin: '0', paddingLeft: '20px' }}>{inputsErrors.restoreCode.msg}</p> 
              : null 
          }
        </div>
        <div className="control">
          <p className="control-label">Введите новый пароль</p>
          <input type="password" className="control-input control-input_green" value={password} onChange={({ target: { value } }) => setPassword(value)} />
          { 
            inputsErrors.password.hasError
              ? <div className="control-hint control-hint_error" style={{ margin: '0', paddingLeft: '20px' }}>
              {
                inputsErrors.password.msg.split('\n').map((item, index, textArray) => {
                  if (index === textArray.length - 1) {
                    return <p key={index}>{item}</p>
                  } else {
                    return <p key={index}>{item}</p>
                  }
                })
              }
              </div> 
              : null 
          }
        </div>
        <div className="control">
          <p className="control-label">Подтвердите пароль</p>
          <input type="password" className="control-input control-input_green" value={confirmPassword} onChange={({ target: { value } }) => setConfirmPassword(value)} />
          { 
            inputsErrors.password.hasError
              ? <p className="control-hint control-hint_error" style={{ margin: '0', paddingLeft: '20px' }}>{inputsErrors.confirmPassword.msg}</p> 
              : null 
          }
        </div>
      </>
    )
  }

  return (
    <>
      <div className="workplace__settings usersettings">
        <Suspense fallback={<div className='spinner-wrapper'><SpinnerComponent text='Загрузка' /></div>}>
          <TabComponent 
            tabs={[
              { name: 'general', label: 'Основные' }, 
              { name: 'permissions', label: 'Конфиденциальность' }, 
              { name: 'security', label: 'Безопасность' },
              { name: 'quit', label: 'Выход', onclick: () => setDialogQuit(true) }
            ]}
            title={`Параметры учетной записи`}
            general={renderGeneralSettings}
            permissions={renderPermisstionsSettings}
            security={renderSecuritySettings}
            onApply={handleApplyChanges}
            onClose={() => navigate('/channels')}
          />
        </Suspense>
      </div>
      <DialogComponent
        title='Выход из Glade'
        classes='dialog_fit'
        submitbtn='Выйти'
        visible={dialogQuit}
        onClose={() => setDialogQuit(false)}
        onApply={() => { navigate('/login'); localStorage.removeItem('user'); dispatch(logoutUser()); }}
      >
        <p className="dialog__text dialog__text_question">Вы уверены, что хотите выйти?</p>
      </DialogComponent>
    </>
  )
}