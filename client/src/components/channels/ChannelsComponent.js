
import { useState, useEffect, useRef, lazy } from "react"

import './ChannelsComponent.scss'
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setAlertVisible } from "../../store/alertReducer";
import { fetchChannels } from "../../asyncActions/channels";
import DialogComponent from './../dialog/DialogComponent';
import { deleteChannel, deleteSection, editSection, moveChannelToSection } from "../../api/channels.api";
import { leftVoiceChannel } from "../../store/voiceReducer";
import { setAccountDetailsVisible } from "../../store/accountDetailsReducer";
import { createSection } from './../../api/channels.api';
import { setContextMenuHidden, setContextMenuVisible } from '../../store/contextReducer'
import { GladeAvatarStatus } from './../avatarstatus/GladeAvatarStatus';

export default function ChannelsComponent(props) {

  const navigate = useNavigate()
  const breakpoints = useSelector(state => state.breakpoints)
  const user = useSelector(state => state.user.user)
  const groups = useSelector(state => state.groups.groups)
  const profiles = useSelector(state => state.profiles.profiles)
  const socket = useSelector(state => state.socket.socket)
  const voices = useSelector(state => state.voices)
  const voiceChannels = useSelector(state => state.voices.voiceChannels)
  const messageNotifications = useSelector(state => state.messages.messageNotifications)
  const sections = useSelector(state => state.channels.sections)

  const dispatch = useDispatch()

  const [userGroup, setUserGroup] = useState({ })

  const [targetChannel, setTargetChannel] = useState({
    visible: false, id: ''
  })

  const [dialogDeleteChannel, setDialogDeleteChannel] = useState({ visible: false, id: '' })
  const [dialogCreateSection, setDialogCreateSection] = useState({ visible: false, name: '' })
  const [dialogEditSection, setDialogEditSection] = useState({ visible: false, id: '', name: '' })
  const [dialogDeleteSection, setDialogDeleteSection] = useState({ visible: false, id: '' })

  const avatarPath = document.location.origin + '/i/'
  const standartAvatarPath = document.location.origin + '/i/avatar-sample.jpg'

  const draggedChannel = useRef(null)

  const [channelsPersonalSettings, setChannelsPersonalSettings] = useState(null)

  // * группа пользователя
  useEffect(() => {
    if (user && user.group_id && groups.length > 0) {
      setUserGroup(groups.find(item => item.id === user.group_id))
    }
  }, [user, groups])

  useEffect(() => {
    const channelsSettingsStorage = JSON.parse(localStorage.getItem('channels-personal-settings'))
    if (sections.length > 0) {
      if (channelsSettingsStorage) {
        const newSettings = { }
        sections.forEach(item => {
          if (Object.keys(channelsSettingsStorage).includes(item.id)) {
            newSettings[item.id] = { wrapped: channelsSettingsStorage[item.id].wrapped, position: channelsSettingsStorage[item.id].position }
          } else {
            newSettings[item.id] = { wrapped: false, position: item.position }
          }
        })
        setChannelsPersonalSettings(newSettings)
        localStorage.setItem('channels-personal-settings', JSON.stringify(newSettings))
      } else {
        const newSettings = { }
        sections.forEach(item => {
          newSettings[item.id] = { wrapped: false, position: item.position }
        })
        setChannelsPersonalSettings(newSettings)
        localStorage.setItem('channels-personal-settings', JSON.stringify(newSettings))
      }
    }
  }, [props, sections])

  // * переадресация на страницу создания канала
  const handleNavigateNewChannel = () => {
    dispatch(setContextMenuHidden())
    navigate('/newchannel')
  }

  // * отображение кнопки контекстного меню при наведении на название канала
  const handleItemMouseEnter = ({ currentTarget }) => {
    const attribute = currentTarget.getAttribute('data-id')
    setTargetChannel({ visible: true, id: attribute })
  }

  // * скрытие кнопки контекстного меню при выходе мыши из названия канала
  const handleItemMouseLeave = () => {
    setTargetChannel({ visible: false, id: '' })
  }

  // * удаление канала
  const handleDeleteChannel = () => {
    deleteChannel({ userId: user.id, channelId: dialogDeleteChannel.id, token: user.token, refreshToken: user.refreshToken })
      .then(data => {
        
        if (data.error) {
          return dispatch(setAlertVisible({ delay: 3000, text: data.msg, style: 'error' }))
        }
        socket.emit('channels-changed', 'server')
        setDialogDeleteChannel({ visible: false, id: '' })

        dispatch(setAlertVisible({ delay: 3000, text: data.msg, style: 'success' }))
        dispatch(fetchChannels({ userId: user.id, token: user.token, refreshToken: user.refreshToken }))
      })
  }

  // * смена канала
  const handleChangeChannel = ({ currentTarget }) => {
    const id = currentTarget.parentNode.getAttribute('data-id')
    const channel = props.channels.find(item => item.id === id)
    const groupRole = user.group_id ? groups.find(item => item.id === user.group_id).role : null
    
    if (
      channel && 
      (
        (user.role === 'administrator' || groupRole === 'administrator') ||
        (channel.visibility === 'public') || 
        (channel.group_ids && user.group_id && channel.group_ids.includes(user.group_id))
      )
    ) {
      navigate('/channels?channel='+id)
      if (props.onClickChannel) {
        props.onClickChannel()
      }
    }
  }

  // * выход из голосового канала
  const handleLeaveVoiceChannel = () => {
    if (socket) {
      socket.emit('leave-voice-channel', 'v-ch/' + voices.voiceChannelId, voices.voiceChannelId, user.id)
      if (document.location.search.indexOf(voices.voiceChannelId) !== -1) {
        navigate('/channels')
      }
      dispatch(leftVoiceChannel())
    }
  }

  // * открытие детальной информации об аккаунте
  const handleOpenAccountDetails = ({ currentTarget }) => {
    const profile = profiles.find(item => +item.id === +currentTarget.getAttribute('data-id'))
    const position = currentTarget.getBoundingClientRect()
    dispatch(setAccountDetailsVisible({ profile: profile, pos: { left: position.left, top: position.top + Math.round(position.height / 2) } }))
  }

  // * создание раздела
  const handleCreateSection = () => {
    if (!dialogCreateSection.name) return dispatch(alert({ delay: 3000, text: 'Введите название раздела', style: 'error' }))
    createSection({ userId: user.id, sectionName: dialogCreateSection.name, token: user.token, refreshToken: user.refreshToken }).then(data => {
      if (data.error) {
        return dispatch(alert({ delay: 3000, text: data.msg, style: 'error' }))
      }
      socket.emit('channels-changed', 'server')
      setDialogCreateSection({ visible: false, name: '' })
      dispatch(fetchChannels({ userId: user.id, token: user.token, refreshToken: user.refreshToken }))
    })
  }

  // * занесение id канала при перетаскивании
  const handleStartDragChannel = ({ currentTarget }) => {
    if (user.role === 'administrator' || userGroup.role === 'administrator')
    draggedChannel.current = currentTarget.getAttribute('data-id')
  }

  // * удаление id канала при прекращении перетаскивания
  const handleDropChannel = () => {
    if (user.role === 'administrator' || userGroup.role === 'administrator') {
      draggedChannel.current = null
    }
  }

  // * добавление канала к разделу
  const handleDropChannelToSection = ({ currentTarget }) => {
    if (draggedChannel.current) {
      const sectionId = currentTarget.getAttribute('data-id')
      const channelId = draggedChannel.current
      moveChannelToSection({ userId: user.id, sectionId: sectionId, channelId: channelId, token: user.token, refreshToken: user.refreshToken }).then(data => {
        if (data.error) {
          return dispatch(setAlertVisible({ delay: 3000, text: data.msg, style: 'error' }))
        }
        socket.emit('channels-changed', 'server')
        dispatch(fetchChannels({ userId: user.id, token: user.token, refreshToken: user.refreshToken }))
      })
    }
  }

  // * сворачивание раздела
  const handleWrapSection = ({ currentTarget }) => {
    const sectionId = currentTarget.parentNode.parentNode.getAttribute('data-id')
    const sectionSettings = JSON.parse(localStorage.getItem('channels-personal-settings'))
    if (sectionSettings && sectionSettings[sectionId] && sectionSettings[sectionId].wrapped) {
      sectionSettings[sectionId].wrapped = false
    } else {
      const currentSection = sections.find(item => item.id === sectionId)
      sectionSettings[sectionId] = { wrapped: true, index: currentSection ? currentSection.position : sections.length + 1 }
    }
    setChannelsPersonalSettings(sectionSettings)
    localStorage.setItem('channels-personal-settings', JSON.stringify(sectionSettings))
  }

  // * открытие контекста раздела
  const handleOpenContext = ({ currentTarget }) => {
    const id = currentTarget.getAttribute('data-id')
    dispatch(setContextMenuVisible({ 
      pos: { left: currentTarget.getBoundingClientRect().left, top: currentTarget.getBoundingClientRect().top },
      controls: ['Изменить раздел', 'Удалить раздел'],
      actions: [
        () => { dispatch(setContextMenuHidden()); setDialogEditSection({ visible: true, id: id, name: sections.find(item => item.id === id).name }) }, 
        () => { dispatch(setContextMenuHidden()); setDialogDeleteSection({ visible: true, id: id }) }
      ],
      horizontalOffset: currentTarget.getBoundingClientRect().width
    }))
  }

  // * открытие контекста создания каналов/разделов
  const handleOpenChannelContext = ({ currentTarget }) => {
    dispatch(setContextMenuVisible({ 
      pos: { left: currentTarget.getBoundingClientRect().left, top: currentTarget.getBoundingClientRect().top },
      controls: ['Создать новый канал', 'Создать новый раздел'],
      actions: [handleNavigateNewChannel, () => {dispatch(setContextMenuHidden()); setDialogCreateSection({ visible: true, name: '' })}],
      horizontalOffset: currentTarget.getBoundingClientRect().width
    }))
  }

  // * открытие контекста канала
  const handleOpenItemContext = ({ currentTarget }) => {
    const itemId = currentTarget.getAttribute('data-id')
    dispatch(setContextMenuVisible({ 
      pos: { left: currentTarget.getBoundingClientRect().left, top: currentTarget.getBoundingClientRect().top },
      controls: ['Параметры канала', 'Удалить канал'],
      actions: [
        () => { dispatch(setContextMenuHidden()); navigate('/channelsettings?channel=' + itemId); },
        () => { dispatch(setContextMenuHidden()); setDialogDeleteChannel({ visible: true, id: itemId }) }
      ],
      horizontalOffset: currentTarget.getBoundingClientRect().width
    }))
  }

  // * изменение секции
  const handleEditSection = () => {
    editSection({ userId: user.id, sectionId: dialogEditSection.id, sectionName: dialogEditSection.name, token: user.token, refreshToken: user.refreshToken }).then(data => {
      if (data.error) {
        return dispatch(setAlertVisible({ delay: 3000, text: data.msg, style: 'error' }))
      }
      socket.emit('channels-changed', 'server')
      setDialogEditSection({ visible: false, id: '', name: '' })
      dispatch(fetchChannels({ userId: user.id, token: user.token, refreshToken: user.refreshToken }))
    })
  }

  // * удаление секции
  const handleDeleteSection = () => {
    deleteSection({ userId: user.id, sectionId: dialogDeleteSection.id, token: user.token, refreshToken: user.refreshToken }).then(data => {
      if (data.error) {
        return dispatch(setAlertVisible({ delay: 3000, text: data.msg, style: 'error' }))
      }
      socket.emit('channels-changed', 'server')
      setDialogDeleteSection({ visible: false, id: '' })
      dispatch(fetchChannels({ userId: user.id, token: user.token, refreshToken: user.refreshToken }))
    })
  }

  // * сортировка сообщений
  const sortChannels = (channels) => {
    
    const sectionList = []

    // * группировка канала по разделам
    sections.forEach((item) => {
      const publicChannels = channels.filter(channel => channel.visibility === 'public' && channel.section_id === item.id).sort((previous, next) => +previous.id - +next.id)
      const privateChannels = channels.filter(channel => channel.visibility === 'private' && channel.section_id === item.id).sort((previous, next) => +previous.id - +next.id)
      const hiddenChannels = channels.filter(channel => channel.visibility === 'hidden' && channel.section_id === item.id).sort((previous, next) => +previous.id - +next.id)
      sectionList.push({ ...item, channels: [...publicChannels, ...privateChannels, ...hiddenChannels] })
    })

    // * каналы без раздела
    const publicSingleChannels = channels.filter(channel => channel.visibility === 'public' && channel.section_id === null).sort((previous, next) => +previous.id - +next.id)
    const privateSingleChannels = channels.filter(channel => channel.visibility === 'private' && channel.section_id === null).sort((previous, next) => +previous.id - +next.id)
    const hiddenSingleChannels = channels.filter(channel => channel.visibility === 'hidden' && channel.section_id === null).sort((previous, next) => +previous.id - +next.id)
    sectionList.push({ id: null, position: 0, channels: [...publicSingleChannels, ...privateSingleChannels, ...hiddenSingleChannels] })

    return sectionList.sort((previous, next) => previous.position - next.position)
  }

  // * рендер текстового канала
  const renderTextChannel = (item, index) => {
    return (
      <button 
        className={
          props.currentChannel === item.id
            ? "channels__item channels__item_active"
            : "channels__item" 
        }
        data-id={item.id}
        key={index}
        onMouseEnter={handleItemMouseEnter}
        onMouseLeave={handleItemMouseLeave}
        draggable={user.role === 'administrator'}
        onDragStart={handleStartDragChannel}
        onDragEnd={handleDropChannel}
      >
        <div className="channels__item-channel"
          onClick={handleChangeChannel}
        >
          <p className="channels__item-hashtag"> 
            {
              item.visibility === 'public'
                ? <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5.41,21L6.12,17H2.12L2.47,15H6.47L7.53,9H3.53L3.88,7H7.88L8.59,3H10.59L9.88,7H15.88L16.59,3H18.59L17.88,7H21.88L21.53,9H17.53L16.47,15H20.47L20.12,17H16.12L15.41,21H13.41L14.12,17H8.12L7.41,21H5.41M9.53,9L8.47,15H14.47L15.53,9H9.53Z" stroke="none" />
                  </svg>
                : item.visibility === 'hidden'
                  ? <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6.12 17L5.41 21H7.41L8.12 17H14.12L13.41 21H15.41L16.12 17H20.12L20.47 15H16.47L16.9117 12.5H14.9117L14.47 15H8.47L9.52999 9H10.59V7H9.88L10.59 3H8.59L7.88 7H3.88L3.53 9H7.53L6.47 15H2.47L2.12 17H6.12Z" stroke="none" />
                      <path d="M17 7C17.56 7 18 7.44 18 8C18 8.56 17.56 9 17 9C16.44 9 16 8.56 16 8C16 7.44 16.44 7 17 7ZM17 4C19.73 4 22.06 5.66 23 8C22.06 10.34 19.73 12 17 12C14.27 12 11.94 10.34 11 8C11.94 5.66 14.27 4 17 4ZM17 5.5C16.337 5.5 15.7011 5.76339 15.2322 6.23223C14.7634 6.70107 14.5 7.33696 14.5 8C14.5 8.66304 14.7634 9.29893 15.2322 9.76777C15.7011 10.2366 16.337 10.5 17 10.5C17.663 10.5 18.2989 10.2366 18.7678 9.76777C19.2366 9.29893 19.5 8.66304 19.5 8C19.5 7.33696 19.2366 6.70107 18.7678 6.23223C18.2989 5.76339 17.663 5.5 17 5.5Z" stroke="none" />
                    </svg>                 
                  : <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M21 7.3C21 6.6 20.4 6 19.8 6V4.5C19.8 3.1 18.4 2 17 2C15.6 2 14.2 3.1 14.2 4.5V6C13.6 6 13 6.6 13 7.2V10.7C13 11.4 13.6 12 14.2 12H19.7C20.4 12 21 11.4 21 10.8V7.3ZM18.5 4.5V6H15.5V4.5C15.5 3.7 16.2 3.2 17 3.2C17.8 3.2 18.5 3.7 18.5 4.5ZM5.29 21L6 17H2L2.35 15H6.35L7.41 9H3.41L3.76 7H7.76L8.47 3H10.47L9.76 7H12V9H9.41L8.35 15H14.35L14.7033 13H16.7033L16.35 15H20.35L20 17H16L15.29 21H13.29L14 17H8L7.29 21H5.29Z" stroke="none" />
                    </svg>
            }
          </p>
          <p className="channels__item-name">{item.name}</p>
        </div>
        {
          item.id in messageNotifications && +messageNotifications[item.id] !== 0 
            ? (
              <div className="channels__item-unreaded">
                <p>{messageNotifications[item.id]}</p>
              </div>
            )
            : null
        }
        {
          // отображение кнопки настроек если мышка наведена на канал
          // или выбран этот канал
          // или экраны sm или xs
          (user.role === 'administrator') && ((targetChannel.visible && targetChannel.id === item.id) || props.currentChannel === item.id || breakpoints.sm || breakpoints.xs)
            ? (
              <a className="btn-icon channels__item-control" data-id={item.id} onClick={handleOpenItemContext}>
                <svg viewBox="0 0 24 24">
                  <path fill="currentColor" d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z" />
                </svg>
              </a>
            )
            : <></>
        }
      </button>
    )
  }

  // * рендер голосового канала
  const renderVoiceChannel = (item, index) => {
    return (
      <div key={index}>
        <button 
          className={
            props.currentChannel === item.id
              ? "channels__item channels__item_active"
              : "channels__item" 
          }
          data-id={item.id}
          onMouseEnter={handleItemMouseEnter}
          onMouseLeave={handleItemMouseLeave}
          draggable={user.role === 'administrator'}
          onDragStart={handleStartDragChannel}
          onDragEnd={handleDropChannel}
        >
          <div className="channels__item-channel"
            onClick={handleChangeChannel}
          >
            <p className="channels__item-hashtag"> 
              {
                item.visibility === 'public'
                  ? <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M15.4 9.6C15.4 9.6 17.1 9.6 17.1 12.15C17.1 14.7 15.4 14.7 15.4 14.7M3.5 7.9V16.4H6.9L10.3 19.8H13.7V4.5H10.3L6.9 7.9H3.5Z" fill="none" strokeWidth={2}/>
                      <path d="M17.1 6.2C17.1 6.2 20.5 6.2 20.5 12.15C20.5 18.1 17.1 18.1 17.1 18.1" fill="none" strokeWidth={2}/>
                    </svg>
                  : item.visibility === 'hidden'
                    ? <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M15.4 14.7C15.4 14.7 16.6973 14.7 17.0254 13M13.7 13V19.8H10.3L6.9 16.4H3.5V7.9H6.9L10.3 4.5H11" fill="none" strokeWidth={2}/>
                        <path d="M17.1 18.1C17.1 18.1 20.168 18.1 20.4753 13" fill="none" strokeWidth={2}/>
                        <path d="M17 7C17.56 7 18 7.44 18 8C18 8.56 17.56 9 17 9C16.44 9 16 8.56 16 8C16 7.44 16.44 7 17 7ZM17 4C19.73 4 22.06 5.66 23 8C22.06 10.34 19.73 12 17 12C14.27 12 11.94 10.34 11 8C11.94 5.66 14.27 4 17 4ZM17 5.5C16.337 5.5 15.7011 5.76339 15.2322 6.23223C14.7634 6.70107 14.5 7.33696 14.5 8C14.5 8.66304 14.7634 9.29893 15.2322 9.76777C15.7011 10.2366 16.337 10.5 17 10.5C17.663 10.5 18.2989 10.2366 18.7678 9.76777C19.2366 9.29893 19.5 8.66304 19.5 8C19.5 7.33696 19.2366 6.70107 18.7678 6.23223C18.2989 5.76339 17.663 5.5 17 5.5Z" />
                      </svg>                 
                    : <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M15.4 14.7C15.4 14.7 16.6973 14.7 17.0254 13M12 4.5H10.3L6.9 7.9H3.5V16.4H6.9L10.3 19.8H13.7V13" fill="none" strokeWidth={2}/>
                        <path d="M17.1 18.1C17.1 18.1 20.168 18.1 20.4753 13" fill="none" strokeWidth={2}/>
                        <path d="M19.8 6C20.4 6 21 6.6 21 7.3V10.8C21 11.4 20.4 12 19.7 12H14.2C13.6 12 13 11.4 13 10.7V7.2C13 6.6 13.6 6 14.2 6V4.5C14.2 3.1 15.6 2 17 2C18.4 2 19.8 3.1 19.8 4.5V6ZM18.5 6V4.5C18.5 3.7 17.8 3.2 17 3.2C16.2 3.2 15.5 3.7 15.5 4.5V6H18.5Z" />
                      </svg>
              }
            </p>
            <p className="channels__item-name">{item.name}</p>
          </div>
          {
            voices.inVoiceChannel && voices.voiceChannelId === item.id
              ? (
                <a className="btn-icon channels__item-control" onClick={handleLeaveVoiceChannel}>
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fill="currentColor" d="M20.22,2.5L2.5,20.22L3.77,21.5L8.65,16.62C11.76,19.43 15.81,21 20,21A1,1 0 0,0 21,20V16.5A1,1 0 0,0 20,15.5C18.75,15.5 17.55,15.3 16.43,14.93C16.08,14.82 15.69,14.9 15.41,15.18L13.21,17.38C12.06,16.8 11,16.06 10.06,15.21L21.5,3.77L20.22,2.5M4,3A1,1 0 0,0 3,4C3,7.57 4.14,11.05 6.24,13.94L7.66,12.5C7.28,11.97 6.93,11.39 6.62,10.79L8.82,8.59C9.1,8.31 9.18,7.92 9.07,7.57C8.7,6.45 8.5,5.25 8.5,4A1,1 0 0,0 7.5,3H4Z" />
                  </svg>
                </a>
              )
              : null
          }
          {
            // отображение кнопки настроек если мышка наведена на канал
            // или выбран этот канал
            // или экраны sm или xs
            (user.role === 'administrator') && ((targetChannel.visible && targetChannel.id === item.id) || props.currentChannel === item.id || breakpoints.sm || breakpoints.xs)
              ? (
                <a className="btn-icon channels__item-control" data-id={item.id} onClick={handleOpenItemContext}>
                  <svg viewBox="0 0 24 24">
                    <path fill="currentColor" d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z" />
                  </svg>
                </a>
              )
              : <></>
          }
        </button>
        {
            voiceChannels[item.id] && voiceChannels[item.id].users && voiceChannels[item.id].users.length > 0 
              ? (
                <div className="channels__item-list">
                {
                  voiceChannels[item.id].users.map((userItem, userIndex) => {
                    const profile = profiles.find(item => +item.id === +userItem.id)
                    const profileGroup = profile.group_id ? groups.find(item => +item.id === +profile.group_id) : null
                    return (
                      <div data-id={profile.id} className="channels__item-user" key={index.toString() + userIndex.toString()} onClick={handleOpenAccountDetails}>
                        <GladeAvatarStatus profile={profile} width={'25px'} height={'25px'} statusWidth={'12px'} statusHeight={'12px'} />
                        <p className="channels__item-user-name" style={{ color: profileGroup && profileGroup.color ? profileGroup.color : '#343A40' }}>
                          { `${profile.first_name} ${profile.last_name}` }
                        </p>
                        <div className="channels__item-user-controls">
                        {
                          !userItem.mic
                            ? <svg viewBox="0 0 24 24">
                                <path d="M19,11C19,12.19 18.66,13.3 18.1,14.28L16.87,13.05C17.14,12.43 17.3,11.74 17.3,11H19M15,11.16L9,5.18V5A3,3 0 0,1 12,2A3,3 0 0,1 15,5V11L15,11.16M4.27,3L21,19.73L19.73,21L15.54,16.81C14.77,17.27 13.91,17.58 13,17.72V21H11V17.72C7.72,17.23 5,14.41 5,11H6.7C6.7,14 9.24,16.1 12,16.1C12.81,16.1 13.6,15.91 14.31,15.58L12.65,13.92L12,14A3,3 0 0,1 9,11V10.28L3,4.27L4.27,3Z" />
                              </svg>
                            : null
                        }
                        {
                          userItem.mute
                            ? <svg viewBox="0 0 24 24">
                                <path fill="currentColor" d="M1.5,4.77L3.57,6.84C3.2,7.82 3,8.89 3,10V20A3,3 0 0,0 6,23H12V21H5V20H9V12.27L15,18.27V20H16.73L19.23,22.5L20.5,21.22L2.78,3.5L1.5,4.77M12,1C9.47,1 7.18,2.04 5.55,3.72L6.96,5.14C8.23,3.82 10,3 12,3A7,7 0 0,1 19,10V12H15V13.18L20.5,18.67C20.81,18.19 21,17.62 21,17V10A9,9 0 0,0 12,1M5,12V10C5,9.46 5.06,8.94 5.17,8.44L8.73,12H5Z" />
                              </svg>
                            : null
                        }
                        </div>
                      </div>
                    )
                  })
                }
                </div>
              ) : null
        }
      </div>
    )
  }
  
  // * рендер списка каналов
  const renderChannelList = () => {

    const items = []

    const sortedChannels = sortChannels(props.channels)

    sortedChannels.forEach((item, index) => {
      items.push(
        <div 
          className="channels__section" 
          key={index + item.id} 
          data-id={item.id} 
          data-wrapped={ channelsPersonalSettings && channelsPersonalSettings[item.id] && channelsPersonalSettings[item.id].wrapped ? channelsPersonalSettings[item.id].wrapped : false }
          onDragOver={(e) => e.preventDefault()} onDrop={handleDropChannelToSection}
        >
        {
          item.id && item.name
            ? (
              <div className="channels__section-name">
                <p>{ item.name }</p>
                <p>{ item.channels.length }</p>
                {
                  user.role === 'administrator'
                    ? (
                      <button 
                        className="btn-icon" 
                        data-id={item.id} 
                        onClick={handleOpenContext} 
                        style={{ 'flex': 'none' }}
                      >
                        <svg viewBox="0 0 24 24">
                          <path fill="currentColor" d="M16,12A2,2 0 0,1 18,10A2,2 0 0,1 20,12A2,2 0 0,1 18,14A2,2 0 0,1 16,12M10,12A2,2 0 0,1 12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12M4,12A2,2 0 0,1 6,10A2,2 0 0,1 8,12A2,2 0 0,1 6,14A2,2 0 0,1 4,12Z" />
                        </svg>
                      </button>
                    )
                    : null
                }
                <button className="btn-icon" onClick={handleWrapSection} style={{ 'flex': 'none' }}>
                  <svg viewBox="0 0 24 24">
                    {
                      channelsPersonalSettings && channelsPersonalSettings[item.id] && channelsPersonalSettings[item.id].wrapped
                        ? <path fill="currentColor" d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z" />
                        : <path fill="currentColor" d="M7.41,15.41L12,10.83L16.59,15.41L18,14L12,8L6,14L7.41,15.41Z" />
                    }
                  </svg>
                </button>
              </div>
            )
            : null
        }
        <div className="channels__section-list">
          {
            item.channels.map((item, index) => {
              if (item.type === 'text') { 
                return renderTextChannel(item, index)
              } else {
                return renderVoiceChannel(item, index)
              }
            })
          }
        </div>
        </div>
      )
    })

    // sortedChannels.forEach((item, index) => {
    //   if (item.type === 'text') {
    //     items.push(renderTextChannel(item, index))
    //   } else {
    //     items.push(renderVoiceChannel(item, index))
    //   }
    // })

    return items

  }
  
  return (
    <>
      <div 
        className={
           `${ props.classes ? props.classes : '' } channels` 
        }
      >
        <div className="channels__wrapper">
          <div className="channels__title" onDragOver={(e) => e.preventDefault()} onDrop={handleDropChannelToSection}>
            <p>Каналы</p>
            <div className="channels__controls">
              {
                user.role === 'administrator'
                  ? (
                      <>
                        <button className="btn-icon" onClick={handleOpenChannelContext}>
                          <svg viewBox="0 0 24 24">
                            <path fill="currentColor" d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
                          </svg>
                        </button>
                        <button className="btn-icon" onClick={() => { navigate('/generalsettings') }}>
                          <svg viewBox="0 0 24 24">
                            <path fill="currentColor" d="M4 7C4 4.79 7.58 3 12 3S20 4.79 20 7 16.42 11 12 11 4 9.21 4 7M12.08 18L12 18C7.58 18 4 16.21 4 14V17C4 19.21 7.58 21 12 21C12.1 21 12.2 21 12.29 21C12.11 20.36 12 19.69 12 19C12 18.66 12.03 18.33 12.08 18M20 12.08C20 12.05 20 12.03 20 12V9C20 11.21 16.42 13 12 13S4 11.21 4 9V12C4 14.21 7.58 16 12 16C12.23 16 12.46 16 12.69 16C13.82 13.63 16.22 12 19 12C19.34 12 19.67 12.03 20 12.08M23.8 20.4C23.9 20.4 23.9 20.5 23.8 20.6L22.8 22.3C22.7 22.4 22.6 22.4 22.5 22.4L21.3 22C21 22.2 20.8 22.3 20.5 22.5L20.3 23.8C20.3 23.9 20.2 24 20.1 24H18.1C18 24 17.9 23.9 17.8 23.8L17.6 22.5C17.3 22.4 17 22.2 16.8 22L15.6 22.5C15.5 22.5 15.4 22.5 15.3 22.4L14.3 20.7C14.2 20.6 14.3 20.5 14.4 20.4L15.5 19.6V18.6L14.4 17.8C14.3 17.7 14.3 17.6 14.3 17.5L15.3 15.8C15.4 15.7 15.5 15.7 15.6 15.7L16.8 16.2C17.1 16 17.3 15.9 17.6 15.7L17.8 14.4C17.8 14.3 17.9 14.2 18.1 14.2H20.1C20.2 14.2 20.3 14.3 20.3 14.4L20.5 15.7C20.8 15.8 21.1 16 21.4 16.2L22.6 15.7C22.7 15.7 22.9 15.7 22.9 15.8L23.9 17.5C24 17.6 23.9 17.7 23.8 17.8L22.7 18.6V19.6L23.8 20.4M20.5 19C20.5 18.2 19.8 17.5 19 17.5S17.5 18.2 17.5 19 18.2 20.5 19 20.5 20.5 19.8 20.5 19Z" />
                          </svg>
                        </button>
                      </>
                  )
                  : <></>
              }
              <button className="btn-icon" onClick={() => { if (props.onOpenUserList) props.onOpenUserList() }}>
                <svg viewBox="0 0 24 24">
                  <path fill="currentColor" d="M16 17V19H2V17S2 13 9 13 16 17 16 17M12.5 7.5A3.5 3.5 0 1 0 9 11A3.5 3.5 0 0 0 12.5 7.5M15.94 13A5.32 5.32 0 0 1 18 17V19H22V17S22 13.37 15.94 13M15 4A3.39 3.39 0 0 0 13.07 4.59A5 5 0 0 1 13.07 10.41A3.39 3.39 0 0 0 15 11A3.5 3.5 0 0 0 15 4Z" />
                </svg>
              </button>
            </div>
          </div>
          <div className="channels__list">
            {
              // если нет каналов вывод заглушки
              props.channels.length === 0
                ? (
                  <div>Channels list are empty</div>
                )
                : (
                  renderChannelList() // отображение списка каналов
                )
            }  
          </div>
        </div>    
      </div>
      <DialogComponent
        title='Удаление канала'
        classes='dialog_fit'
        submitbtn='Удалить'
        visible={dialogDeleteChannel.visible}
        onClose={() => setDialogDeleteChannel({ visible: false, id: '' })}
        onApply={handleDeleteChannel}
      >
        <p className='dialog__text dialog__text_question'>Вы действительно хотите удалить канал? <br /> Это действие невозможно отменить. </p>
      </DialogComponent>
      <DialogComponent
        title='Создание раздела'
        classes='dialog_fit'
        submitbtn='Создать'
        visible={dialogCreateSection.visible}
        onClose={() => setDialogCreateSection({ visible: false, name: '' })}
        onApply={handleCreateSection}
      >
        <div className="control" style={{ padding: '15px' }}>
          <p className="control-label">Название раздела</p>
          <input type="text" className="control-input" value={dialogCreateSection.name} onChange={({ target }) => setDialogCreateSection({ ...dialogCreateSection, name: target.value })} />
        </div>
      </DialogComponent>
      <DialogComponent
        title='Изменение раздела'
        classes='dialog_fit'
        submitbtn='Изменить'
        visible={dialogEditSection.visible}
        onClose={() => setDialogEditSection({ visible: false, id: '', name: '' })}
        onApply={handleEditSection}
      >
        <div className="control" style={{ padding: '15px' }}>
          <p className="control-label">Название раздела</p>
          <input type="text" className="control-input" value={dialogEditSection.name} onChange={({ target }) => setDialogEditSection({ ...dialogEditSection, name: target.value })} />
        </div>
      </DialogComponent>
      <DialogComponent
        title='Удаление раздела'
        classes='dialog_fit'
        submitbtn='Удалить'
        visible={dialogDeleteSection.visible}
        onClose={() => setDialogDeleteSection({ visible: false, name: '' })}
        onApply={handleDeleteSection}
      >
        <p className="dialog__text dialog__text_question">Вы уверены, что хотите удалить этот раздел?</p>
        <p className="control-hint">Это действие невозможно отменить, оно не затрагивает каналы находящиеся в этом разделе.</p>
      </DialogComponent>
    </>
  )

}