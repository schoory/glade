
import { lazy, Suspense, useRef, useEffect, useState, useMemo } from "react"
import { useSearchParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from 'react-redux';
import { fetchChannels } from './../../asyncActions/channels';
import { fetchGroups } from './../../asyncActions/groups';
import { fetchProfiles } from './../../asyncActions/profiles';
import { fetchMessages, fetchUnreadedMessages, fetchAllUnreadedMessages } from './../../asyncActions/messages';
import { alert } from "../../asyncActions/alert";
import { SpinnerComponent } from "../../components/spinner/SpinnerComponent";
import { isMobile } from 'react-device-detect'
import { deleteMessage, newMessage, restoreMessage, deleteForeverMessage, newMessageWithFile } from "../../api/messages.api";
import { GladeAvatarStatus } from './../../components/avatarstatus/GladeAvatarStatus';
import DialogComponent from '../../components/dialog/DialogComponent'

import { uploadAudioMessage } from "../../api/files.api";
import { joinVoiceChannel, saveVoiceSettings } from "../../store/voiceReducer";
import { setAccountDetailsVisible } from "../../store/accountDetailsReducer";

import './WorkplacePage.scss'
import newMessageAudio from '../../static/audio/new-message.mp3'

const ChannelsComponent = lazy(() => import('../../components/channels/ChannelsComponent'))
const GladeMessagesList = lazy(() => import('./../../components/glademessages/GladeMessagesList'));

export const WorkplacePage = () => {

  const user = useSelector(state => state.user.user)
  const channels = useSelector(state => state.channels.channels)
  const socket = useSelector(state => state.socket.socket)
  const profiles = useSelector(state => state.profiles.profiles)
  const groups = useSelector(state => state.groups.groups)
  const breakpoints = useSelector(state => state.breakpoints)

  const messages = useSelector(state => state.messages.messages) 
  const messagesTotal = useSelector(state => state.messages.messagesTotal) 
  const messagesStatus = useSelector(state => state.messages.status) 
  const minMessageIndex = useSelector(state => state.messages.minIndex)
  const maxMessageIndex = useSelector(state => state.messages.maxIndex)
  const messageNotifications = useSelector(state => state.messages.messageNotifications)

  const voiceSettings = useSelector(state => state.voices.voiceSettings)

  const MESSAGES_LIMIT = isMobile ? 50 : 200 // лимит загрузки сообщений за один раз

  const dispatch = useDispatch()

  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const avatarPath = useRef(document.location.origin + '/i/' + user.avatar)

  const [targetChannelId, setTargetChannelId] = useState('')
  const [targetChannel, setTargetChannel] = useState(null)
  const [toggleHistory, setToggleHistory] = useState(false)
  const [scrollToIndex, setScrollToIndex] = useState(-1)

  const [channelCache, setChannelCache] = useState({ })
  const [lastQuery, setLastQuery] = useState({ })

  const [isScrolled, setIsScrolled] = useState(false)
  const [hasNewMessages, setHasNewMessages] = useState(false)

  const [channelActiveUsers, setChannelActiveUsers] = useState([])

  const [dialogUserList, setDialogUserList] = useState(false)

  // * доступные каналы для пользователя
  const getAllowedChannels = useMemo(() => {
    if (channels.length > 0 && user) {
      const userGroup = user.group_id && groups.length > 0 ? groups.find(item => item.id === user.group_id) : null
      if (user.role !== 'administrator' && (!userGroup || (userGroup && userGroup.role !== 'administrator'))) {
        return channels.reduce((prev, item, index) => {
          if (item.visibility === 'public' || (userGroup && (item.group_ids && item.group_ids.includes(userGroup.id)))) {
            prev.push(item)
          }
          return prev
        }, [])
      } else {
        return channels
      }
    } else {
      return []
    }
  }, [channels, groups, user])

  // * получение id текущего канала из параметра адреса
  useEffect(() => {
    const channel = searchParams.get('channel')
    if (!channel && channels.length > 0) {
      return
    }
    if (channel && channels.length > 0) {
      const targetChannel = channels.find(item => item.id === channel)
      const groupRole = user.group_id && groups.length > 0 ? groups.find(item => item.id === user.group_id).role : 'user'
      if (
        (user.role === 'administrator' || groupRole === 'administrator') ||
        (targetChannel.visibility === 'public') || 
        (targetChannel.group_ids && user.group_id && targetChannel.group_ids.includes(user.group_id))
      ) {
        setTargetChannelId(targetChannel.id)
        setTargetChannel(targetChannel)
        return navigate('/channels?channel='+targetChannel.id)
      }
    } else return navigate('/channels')
  }, [searchParams, channels])

  // * получение каналов, профилей и групп
  useEffect(() => {
    dispatch(fetchChannels({ userId: user.id, token: user.token, refreshToken: user.refreshToken }))  
    dispatch(fetchProfiles({ token: user.token, refreshToken: user.refreshToken }))
    dispatch(fetchGroups({ token: user.token, refreshToken: user.refreshToken })) 

    return () => {
      if (targetChannel) {
        socket.emit('leave-channel', 'ch/' + targetChannel.id, user.id)
        socket.removeListener('logged-into-channel', activeUsersChanged)
        socket.removeListener('left-channel', activeUsersChanged)
        socket.removeListener('message-notification-get', messageNotificationChanged)
      }
      if (getAllowedChannels.length > 0) {
        getAllowedChannels.forEach(item => {
          socket.emit('leave-room', 'ch/' + item.id + '/notification')
        })
      }
    }
  }, [])

  // * работа с уведомлениями
  useEffect(() => {
    if (getAllowedChannels.length > 0) {
      socket.on('message-notification-get', messageNotificationChanged) 
      // подключение к комнатам для получения уведомлений 
      getAllowedChannels.forEach(item => {
        socket.emit('join-room', 'ch/' + item.id + '/notification')
      })
      // получение информации о доступных каналах
      const allowedChannelsInfo = getAllowedChannels.reduce((prev, item) => {
        const cache = JSON.parse(localStorage.getItem('ch/'+ item.id))
        prev.push({ id: item.id, lastSeenIndex: cache && cache.lastSeen ? cache.lastSeen : -1 })
        return prev
      }, [])
      if (messagesStatus !== 'pending') {
        dispatch(fetchAllUnreadedMessages({ channels: allowedChannelsInfo, token: user.token, refreshToken: user.refreshToken }))
      }
    }
    return () => {
      socket.removeListener('message-notification-get', messageNotificationChanged) 
      getAllowedChannels.forEach(item => {
        socket.emit('leave-room', 'ch/' + item.id + '/notification')
      })
    }
  }, [getAllowedChannels, targetChannel, user])

  // * слушатели подключений пользователей к каналу
  useEffect(() => {
    if (targetChannel) {
      socket.on('logged-into-channel', activeUsersChanged)
      socket.on('left-channel', activeUsersChanged)
      if (targetChannel.type === 'text') {
        socket.emit('join-channel', 'ch/' + targetChannel.id, user.id)
      }
      if (targetChannel.type === 'voice') {
        socket.emit('join-voice-channel', 'v-ch/' + targetChannel.id, targetChannel.id, user.id, { mic: voiceSettings.mic, mute: voiceSettings.mute })
        dispatch(joinVoiceChannel({ channelId: targetChannel.id }))
      }
    }
    return () => {
      if (targetChannel) {        
        socket.emit('leave-channel', 'ch/' + targetChannel.id, user.id)
        socket.removeListener('logged-into-channel', activeUsersChanged)
        if (targetChannel.type === 'text') {
          socket.removeListener('left-channel', activeUsersChanged)
        }
        if (targetChannel.type === 'voice') {

        }
      }
    }
  }, [targetChannel])

  // * слушатели изменения сообщений 
  useEffect(() => {
    if (targetChannel && targetChannel.type === 'text') {
      socket.on('messages-update', messagesChanged)
    }
    return () => {
      socket.removeListener('messages-update', messagesChanged)
    }
  }, [targetChannel, isScrolled])

  // * получение сообщений при входе на канал
  useEffect(() => {
    if (targetChannel) {
      setChannelActiveUsers([])
      setScrollToIndex(-1)
      setIsScrolled(false)
      setHasNewMessages(false)
      if (targetChannel.type === 'text') {
        dispatch(
          fetchMessages({ 
            userId: user.id, 
            channelId: targetChannel.id, 
            limit: MESSAGES_LIMIT, 
            token: user.token, 
            refreshToken: user.refreshToken  
          })
        )
      }
    }
  }, [targetChannel])

  // * получение информации о последнем прочитанном сообщении канала из локального хранилища
  useEffect(() => {
    if (targetChannel && targetChannel.type === 'text') {
      const channelCache = JSON.parse(localStorage.getItem('ch/'+ targetChannel.id))
      if (!channelCache || !channelCache.lastSeen) {
        localStorage.setItem('ch/'+targetChannel.id, JSON.stringify({ lastSeen: -1 }))
        setChannelCache({ lastSeen: -1 })
      } else {
        setChannelCache({ ...channelCache })
      }
    }
  }, [targetChannel])

  // * получение списка сообщений при изменении
  const messagesChanged = () => {
    if (!isScrolled) {
      dispatch(
        fetchMessages({ 
          userId: user.id, 
          channelId: targetChannel.id, 
          limit: MESSAGES_LIMIT, 
          token: user.token, 
          refreshToken: user.refreshToken,
          cleanOnFetch: false
        })
      )
      setHasNewMessages(false)
    } else {
      dispatch(
        fetchMessages({ ...lastQuery, cleanOnFetch: false })
      )
      setHasNewMessages(true)
    }
  }

  // * получение уведомлений при изменении
  const messageNotificationChanged = (channelId) => {
    if (getAllowedChannels.find(item => +item.id === +channelId)) {
      const cache = JSON.parse(localStorage.getItem('ch/'+ channelId))
      if (cache && cache.lastSeen) {
        dispatch(fetchUnreadedMessages({ channelId: channelId, lastSeenIndex: cache.lastSeen, token: user.token, refreshToken: user.refreshToken }))
        console.log('user.status', user.status)
        if ((!targetChannel || (targetChannel && +channelId !== +targetChannel.id)) && user.status !== 'notdisturb') {
          const audio = new Audio(newMessageAudio)
          audio.play()
        }
      }
    }
  }

  // * получение активных пользователей при изменении
  const activeUsersChanged = (users) => {
    if (users) {
      setChannelActiveUsers(
        users.reduce((prev, item) => {
          const profile = profiles.find(profileItem => profileItem.id === item)
          if (profile) {
            prev.push(profile)
          }
          return prev
        }, [])
      )
    }
  }

  // * на мобильной версии показ списка сообщений
  const handleToggleHistory = () => {
    setToggleHistory(value => !value)
  }

  // * отправка сообщения
  const handleSendMessage = (value) => {
    const replyMessage = messages.find(item => item.index === value.replyIndex) // получение сообщения, которому отвечают
    const editedMessage = messages.find(item => item.id === value.editId) // получение сообщения, которого изменяют
    // если к сообщению добавлен файл
    if (value.file) {
      newMessageWithFile({ 
        userId: user.id, 
        channelId: targetChannel.id, 
        file: value.file,
        fileName: value.file.name,
        fileSize: value.file.size,
        messageText: value.value,
        messageReplyId: replyMessage ? replyMessage.id : null,
        token: user.token, 
        refreshToken: user.refreshToken 
      }).then(data => {
        if (data.error) {
          return dispatch(alert({ delay: 3000, text: data.msg, style: 'error' }))
        }
        if (value.editId) {
          const index = messages.find(item => +item.id === +value.editId).index
          setScrollToIndex(index)
        }
        handleNewLastSeenMessage(data.lastIndex)
        socket.emit('messages-changed', 'ch/'+targetChannel.id, targetChannel.id)
        socket.emit('message-notification', 'ch/' + targetChannel.id + '/notification', targetChannel.id)
      })
    } else {
      newMessage({ 
        userId: user.id, 
        channelId: targetChannel.id, 
        message: { 
          text: value.value, 
          file: value.file,
          replyId: replyMessage ? replyMessage.id : null, 
          editId: editedMessage ? editedMessage.id : null
        }, 
        token: user.token, 
        refreshToken: user.refreshToken 
      }).then(data => {
        if (data.error) {
          return dispatch(alert({ delay: 3000, text: data.msg, style: 'error' }))
        }
        if (value.editId) {
          const index = messages.find(item => +item.id === +value.editId).index
          setScrollToIndex(index)
        }
        handleNewLastSeenMessage(data.lastIndex)
        socket.emit('messages-changed', 'ch/'+targetChannel.id, targetChannel.id)
        socket.emit('message-notification', 'ch/' + targetChannel.id + '/notification', targetChannel.id)
      })
    }
  }

  // * удаление сообщения
  const handleDeleteMessage = (id) => {
    deleteMessage({ userId: user.id, messageId: id, token: user.token, refreshToken: user.refreshToken }).then(data => {
      if (data.error) {
        return dispatch(alert({ delay: 3000, text: data.msg, style: 'error' }))
      }
      const index = messages.find(item => +item.id === +id).index
      setScrollToIndex(index + 1 < data.lastIndex ? data.lastIndex : index + 1)
      handleNewLastSeenMessage(data.lastIndex)
      socket.emit('messages-changed', 'ch/'+targetChannel.id, targetChannel.id)
      socket.emit('message-notification', 'ch/' + targetChannel.id + '/notification', targetChannel.id)
    })
  }
  
  // * восстановление удаленного сообщения
  const handleRestoreMessage = (id) => {
    restoreMessage({ userId: user.id, messageId: id, token: user.token, refreshToken: user.refreshToken }).then(data => {
      if (data.error) {
        return dispatch(alert({ delay: 3000, text: data.msg, style: 'error' }))
      }
      const index = messages.find(item => +item.id === +id).index
      setScrollToIndex(index + 1 < data.lastIndex ? data.lastIndex : index + 1)
      handleNewLastSeenMessage(data.lastIndex)
      socket.emit('messages-changed', 'ch/'+targetChannel.id, targetChannel.id)
    })
  }
  
  // * удаление удаленного сообщения без возможности восстановления
  const handleDeleteForeverMessage = (id) => {
    deleteForeverMessage({ userId: user.id, messageId: id, token: user.token, refreshToken: user.refreshToken }).then(data => {
      if (data.error) {
        return dispatch(alert({ delay: 3000, text: data.msg, style: 'error' }))
      }
      const index = messages.find(item => +item.id === +id).index
      setScrollToIndex(index + 1 < data.lastIndex ? data.lastIndex : index + 1)
      handleNewLastSeenMessage(data.lastIndex)
      socket.emit('messages-changed', 'ch/'+targetChannel.id, targetChannel.id)
      socket.emit('message-notification', 'ch/' + targetChannel.id + '/notification', targetChannel.id)
    })
  }

  // * сохранение записанного аудио-сообщения
  const handleAudioRecordEnds = (audio, replyMessage) => {
    uploadAudioMessage({ 
      userId: user.id, 
      channelId: targetChannel.id, 
      audioBlob: audio.blob, 
      audioDuration: audio.duration,
      message: {
        replyId: replyMessage ? replyMessage.messageIndex : null
      },
      token: user.token, 
      refreshToken: user.refreshToken
    }).then(data => {
      if (data.error) {
        return dispatch(alert({ delay: 3000, text: data.msg, style: 'error' }))
      }
      handleNewLastSeenMessage(data.lastIndex)
      socket.emit('messages-changed', 'ch/'+targetChannel.id, targetChannel.id)
      socket.emit('message-notification', 'ch/' + targetChannel.id + '/notification', targetChannel.id)
    })
  }
  
  // * загрузка дополнительных сообщений 
  const handleLoadUpMessages = (element) => {
    if (element && messagesStatus !== 'pending') {
      const index = element.getAttribute('data-index')
      if (!isScrolled) setIsScrolled(true)
      dispatch(
        fetchMessages({ 
          userId: user.id, 
          channelId: targetChannel.id, 
          startWith: isMobile ? +index + 15 : +index + 90,
          limit: MESSAGES_LIMIT, 
          token: user.token, 
          refreshToken: user.refreshToken,
          // TODO: cleanOnFetch: true
        })
      )
      setLastQuery({
        userId: user.id, 
        channelId: targetChannel.id, 
        startWith: isMobile ? +index + 15 : + index + 90,
        limit: MESSAGES_LIMIT, 
        token: user.token, 
        refreshToken: user.refreshToken,
      })
      setScrollToIndex(index)
    }
  }

  // * загрузка предыдущих сообщений
  const handleLoadDownMessages = (element) => {
    if (element && messagesStatus !== 'pending') {
      const index = element.getAttribute('data-index')
      if (messages[0]) {
        if (messages[0].index !== maxMessageIndex) {
          if (!isScrolled) setIsScrolled(true)
        } else {
          setIsScrolled(false)
          hasNewMessages(false)
        }
      }
      dispatch(
        fetchMessages({ 
          userId: user.id, 
          channelId: targetChannel.id, 
          startWith: isMobile 
            ? +index + MESSAGES_LIMIT <= messagesTotal 
              ? +index + MESSAGES_LIMIT - 20 : messagesTotal
            : +index + MESSAGES_LIMIT <= messagesTotal 
              ? +index + MESSAGES_LIMIT - 80 : messagesTotal, 
          limit: MESSAGES_LIMIT, 
          token: user.token, 
          refreshToken: user.refreshToken,
          // TODO: cleanOnFetch: true
        })
      )
      setLastQuery({
        userId: user.id, 
          channelId: targetChannel.id, 
          startWith: isMobile 
            ? +index + MESSAGES_LIMIT <= messagesTotal 
              ? +index + MESSAGES_LIMIT - 20 : messagesTotal
            : +index + MESSAGES_LIMIT <= messagesTotal 
              ? +index + MESSAGES_LIMIT - 80 : messagesTotal, 
          limit: MESSAGES_LIMIT, 
          token: user.token, 
          refreshToken: user.refreshToken,
      })
      setScrollToIndex(index)
    }
  }

  // * загрузка последних сообщений
  const handleScrollToStart = () => {
    dispatch(
      fetchMessages({ 
        userId: user.id, 
        channelId: targetChannel.id, 
        limit: MESSAGES_LIMIT, 
        token: user.token, 
        refreshToken: user.refreshToken
      })
    )
    setLastQuery({ })
    setScrollToIndex(maxMessageIndex)
    setIsScrolled(false)
    setHasNewMessages(false)
  }

  // * установка последнего прочитанного сообщения
  const handleNewLastSeenMessage = (index) => {
    localStorage.setItem('ch/' + targetChannel.id, JSON.stringify({ lastSeen: index }))
    setChannelCache({ lastSeen: index })
    dispatch(fetchUnreadedMessages({ channelId: targetChannel.id, lastSeenIndex: index, token: user.token, refreshToken: user.refreshToken }))
  }

  // * прокрутка до последнего прочитанного сообщения
  const handleLoadToLastSeen = () => {
    setScrollToIndex(+channelCache.lastSeen)
    dispatch(
      fetchMessages({ 
        userId: user.id, 
        channelId: targetChannel.id, 
        startWith: +channelCache.lastSeen + MESSAGES_LIMIT <= messagesTotal ? +channelCache.lastSeen + MESSAGES_LIMIT - 80 : messagesTotal, 
        limit: MESSAGES_LIMIT, 
        token: user.token, 
        refreshToken: user.refreshToken 
      })
    )
    setLastQuery({
      userId: user.id, 
      channelId: targetChannel.id, 
      startWith: +channelCache.lastSeen + MESSAGES_LIMIT <= messagesTotal ? +channelCache.lastSeen + MESSAGES_LIMIT - 80 : messagesTotal, 
      limit: MESSAGES_LIMIT, 
      token: user.token, 
      refreshToken: user.refreshToken 
    })
    if (+channelCache.lastSeen + MESSAGES_LIMIT > messagesTotal) {
      setIsScrolled(false)
    } else {
      setIsScrolled(true)
    }
    handleNewLastSeenMessage(maxMessageIndex)
  }

  // * отключение микрофона
  const handleMuteMic = () => {
    const settings = { ...voiceSettings }
    if (settings.mic) {
      settings.mic = false
    } else {
      settings.mic = true
      if (settings.mute) {
        settings.mute = false
      }
    }
    localStorage.setItem('voice-settings', JSON.stringify(settings))
    dispatch(saveVoiceSettings(settings))
  }

  // * отключение микрофона и звука
  const handleMuteAll = () => {
    const settings = { ...voiceSettings }
    if (settings.mute) {
      settings.mute = false
    } else {
      settings.mute = true
      settings.mic = false
    }
    localStorage.setItem('voice-settings', JSON.stringify(settings))
    dispatch(saveVoiceSettings(settings))
  }

  // * открытие наложения детальной информации о пользователе
  const handleOpenAccountDetails = (currentTarget) => {
    if (profiles) {
      const profile = profiles.find(item => +item.id === +currentTarget.getAttribute('data-id'))
      const position = currentTarget.getBoundingClientRect()
      dispatch(setAccountDetailsVisible({ profile: profile, pos: { left: position.left, top: position.top + Math.round(position.height / 2) } }))
    }
  }

  // * рендер списка пользователей канала
  const renderChannelUsers = () => {

    const renderElements = []

    groups.forEach((group, groupIndex) => {
      const groupUsers = profiles.filter(user => user.group_id && user.group_id === group.id)
      if (groupUsers.length !== 0) {
        renderElements.push(
          <div className="gladechannel__userlist" key={group + groupIndex}>
            <p className="gladechannel__userlist-groupname">{group.name} - {groupUsers.length}</p>
            {
              groupUsers.map((user, userIndex) => {
                return (
                  <div className="gladechannel__userlist-item" key={user.first_name + user.last_name + userIndex} data-id={user.id} onClick={({currentTarget}) => handleOpenAccountDetails(currentTarget)}>
                    <GladeAvatarStatus profile={user} width={'25px'} height={'25px'} statusWidth={'12px'} statusHeight={'12px'} />
                    <p className="gladechannel__userlist-name" style={group.color ? { color: group.color } : null}>{ `${user.first_name} ${user.last_name}` }</p>
                  </div>
                )
              })  
            }
          </div>
        )
      }
    })

    const usersWithoutGroup = profiles.filter(user => !user.group_id)
    if (usersWithoutGroup.length > 0) {
      renderElements.push(
        <div className="gladechannel__userlist" key={'Без группы'}>
          <p className="gladechannel__userlist-groupname">Без группы - {usersWithoutGroup.length}</p>
          {
            usersWithoutGroup.map((user, userIndex) => {
              return (
                <div className="gladechannel__userlist-item" key={user.first_name + user.last_name + userIndex} data-id={user.id} onClick={({currentTarget}) => handleOpenAccountDetails(currentTarget)}>
                  <GladeAvatarStatus profile={user} width={'25px'} height={'25px'} statusWidth={'12px'} statusHeight={'12px'} />
                  <p className="gladechannel__userlist-name">{ `${user.first_name} ${user.last_name}` }</p>
                </div>
              )
            })  
          }
        </div>
      )
    }


    return renderElements
  }
    
  return (
    <>
      <div className="glade__workplace workplace">
        <div className="workplace__logo">
          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M32 6C33.6569 6 35 4.65685 35 3C35 1.34315 33.6569 0 32 0C30.3431 0 29 1.34315 29 3C29 4.65685 30.3431 6 32 6ZM32 64C33.6569 64 35 62.6569 35 61C35 59.3431 33.6569 58 32 58C30.3431 58 29 59.3431 29 61C29 62.6569 30.3431 64 32 64ZM13.6152 9.37258C14.7868 10.5442 14.7868 12.4437 13.6152 13.6152C12.4436 14.7868 10.5442 14.7868 9.37258 13.6152C8.20101 12.4437 8.20101 10.5442 9.37258 9.37258C10.5442 8.20101 12.4436 8.20101 13.6152 9.37258ZM54.6274 54.6274C55.799 53.4558 55.799 51.5563 54.6274 50.3848C53.4558 49.2132 51.5564 49.2132 50.3848 50.3848C49.2132 51.5563 49.2132 53.4558 50.3848 54.6274C51.5564 55.799 53.4558 55.799 54.6274 54.6274ZM3 29C4.65685 29 6 30.3431 6 32C6 33.6569 4.65685 35 3 35C1.34315 35 0 33.6569 0 32C0 30.3431 1.34315 29 3 29ZM64 32C64 30.3431 62.6569 29 61 29C59.3431 29 58 30.3431 58 32C58 33.6569 59.3431 35 61 35C62.6569 35 64 33.6569 64 32ZM27 13C27 10.2386 29.2386 8 32 8C34.7614 8 37 10.2386 37 13V15.7472C38.0305 16.0639 39.0193 16.4758 39.9561 16.9728L41.8995 15.0294C42.6956 14.2334 43.6933 13.7618 44.7283 13.6149L36.4194 21.9238C35.3569 21.4571 34.2065 21.1536 33 21.0448V19C33 18.4477 32.5523 18 32 18C31.4477 18 31 18.4477 31 19V21.0448C28.7132 21.2509 26.6283 22.1568 24.9609 23.5467L23.5147 22.1005C23.1242 21.71 22.491 21.71 22.1005 22.1005C21.71 22.491 21.71 23.1242 22.1005 23.5147L23.5467 24.9609C22.1568 26.6283 21.2509 28.7132 21.0448 31H19C18.4477 31 18 31.4477 18 32C18 32.5523 18.4477 33 19 33H21.0448C21.1536 34.2065 21.4571 35.3569 21.9238 36.4194L13.6149 44.7283C13.7618 43.6933 14.2334 42.6956 15.0294 41.8995L16.9728 39.9561C16.4758 39.0193 16.0639 38.0305 15.7472 37H13C10.2386 37 8 34.7614 8 32C8 29.2386 10.2386 27 13 27H15.7472C16.0639 25.9695 16.4758 24.9807 16.9728 24.0439L15.0294 22.1005C13.0768 20.1479 13.0768 16.9821 15.0294 15.0294C16.9821 13.0768 20.1479 13.0768 22.1005 15.0294L24.0439 16.9728C24.9807 16.4758 25.9695 16.0639 27 15.7472V13ZM19.2717 50.3851L27.5806 42.0762C28.6431 42.5429 29.7935 42.8464 31 42.9552V45C31 45.5523 31.4477 46 32 46C32.5523 46 33 45.5523 33 45V42.9552C35.2868 42.7491 37.3717 41.8432 39.0391 40.4533L40.4853 41.8995C40.8758 42.29 41.509 42.29 41.8995 41.8995C42.29 41.509 42.29 40.8758 41.8995 40.4853L40.4533 39.0391C41.8432 37.3717 42.7491 35.2868 42.9552 33H45C45.5523 33 46 32.5523 46 32C46 31.4477 45.5523 31 45 31H42.9552C42.8464 29.7935 42.5429 28.6431 42.0762 27.5806L50.3851 19.2717C50.2382 20.3067 49.7666 21.3044 48.9706 22.1005L47.0272 24.0439C47.5242 24.9807 47.9361 25.9695 48.2528 27H51C53.7614 27 56 29.2386 56 32C56 34.7614 53.7614 37 51 37H48.2528C47.9361 38.0305 47.5242 39.0193 47.0272 39.9561L48.9706 41.8995C50.9232 43.8521 50.9232 47.0179 48.9706 48.9706C47.0179 50.9232 43.8521 50.9232 41.8995 48.9706L39.9561 47.0272C39.0193 47.5242 38.0305 47.9361 37 48.2528V51C37 53.7614 34.7614 56 32 56C29.2386 56 27 53.7614 27 51V48.2528C25.9695 47.9361 24.9807 47.5242 24.0439 47.0272L22.1005 48.9706C21.3044 49.7666 20.3067 50.2382 19.2717 50.3851Z"/>
          </svg>
          <p>Glade</p>
        </div>
        <div className="workplace__channels">
          <Suspense fallback={<div className="spinner-wrapper"><SpinnerComponent text='Загрузка' /></div>}>
            <ChannelsComponent 
              classes='workplace__channels' 
              channels={channels}
              currentChannel={targetChannelId}
              onClickChannel={() => setToggleHistory(true)}
              onOpenUserList={() => setDialogUserList(true)}
            />
          </Suspense>
        </div>
        <div className="workplace__account">
          <GladeAvatarStatus profile={user} width={'42px'} height={'42px'} statusWidth={'18px'} statusHeight={'18px'} statusCanBeChanged={true} />
          <div className="workplace__account-name">
            <p>{ user.first_name }</p>
            <p>{ user.last_name }</p>
          </div>
          <div className="workplace__account-controls">
            <button className="btn-icon" onClick={handleMuteMic} data-mute={!voiceSettings.mic}>
            {
              voiceSettings.mic
                ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M0 0h24v24H0z" fill="none"/>
                    <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M19,11C19,12.19 18.66,13.3 18.1,14.28L16.87,13.05C17.14,12.43 17.3,11.74 17.3,11H19M15,11.16L9,5.18V5A3,3 0 0,1 12,2A3,3 0 0,1 15,5V11L15,11.16M4.27,3L21,19.73L19.73,21L15.54,16.81C14.77,17.27 13.91,17.58 13,17.72V21H11V17.72C7.72,17.23 5,14.41 5,11H6.7C6.7,14 9.24,16.1 12,16.1C12.81,16.1 13.6,15.91 14.31,15.58L12.65,13.92L12,14A3,3 0 0,1 9,11V10.28L3,4.27L4.27,3Z" />
                  </svg>
                )
            }
            </button>
            <button className="btn-icon" onClick={handleMuteAll} data-mute={voiceSettings.mute}>
            {
              !voiceSettings.mute
                ? (
                  <svg viewBox="0 0 24 24">
                    <path fill="currentColor" d="M12,1C7,1 3,5 3,10V17A3,3 0 0,0 6,20H9V12H5V10A7,7 0 0,1 12,3A7,7 0 0,1 19,10V12H15V20H18A3,3 0 0,0 21,17V10C21,5 16.97,1 12,1Z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24">
                    <path fill="currentColor" d="M1.5,4.77L3.57,6.84C3.2,7.82 3,8.89 3,10V20A3,3 0 0,0 6,23H12V21H5V20H9V12.27L15,18.27V20H16.73L19.23,22.5L20.5,21.22L2.78,3.5L1.5,4.77M12,1C9.47,1 7.18,2.04 5.55,3.72L6.96,5.14C8.23,3.82 10,3 12,3A7,7 0 0,1 19,10V12H15V13.18L20.5,18.67C20.81,18.19 21,17.62 21,17V10A9,9 0 0,0 12,1M5,12V10C5,9.46 5.06,8.94 5.17,8.44L8.73,12H5Z" />
                  </svg>
                )
            }
            </button>
            <button className="btn-icon" onClick={() => { navigate('/settings') }}>
              <svg viewBox="0 0 24 24">
                <path fill="currentColor" d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      <div className="glade__history history" data-toggle={targetChannel && targetChannel.type !== 'voice' ? toggleHistory : false}>
        {
          ((toggleHistory) || (breakpoints.lg || breakpoints.xl || breakpoints.xxl)) && (targetChannel && targetChannel.type !== 'voice')
            ? 
              <Suspense fallback={<div className="spinner-wrapper"><SpinnerComponent text='Загрузка' /></div>}>
                <GladeMessagesList 
                  breakpoints={breakpoints}
                  channel={targetChannel}
                  activeUsers={channelActiveUsers}
                  user={user}
                  userGroup={ user.group_id && groups.find(item => item.id === user.group_id) ? groups.find(item => item.id === user.group_id) : null }
                  users={profiles}
                  groups={groups}
                  messages={messages}
                  messagesTotal={messagesTotal}
                  messagesStatus={messagesStatus}
                  messagesMinIndex={minMessageIndex}
                  messagesMaxIndex={maxMessageIndex}
                  lastSeenMessageIndex={channelCache.lastSeen ? channelCache.lastSeen : -1}
                  hasNewMessages={hasNewMessages}
                  scrollToIndex={scrollToIndex}
                  loadLimit={MESSAGES_LIMIT}
                  usersAvatarPath={document.location.origin + '/i/'}
                  standartAvatar={document.location.origin + '/i/avatar-sample.jpg'}
                  audioMessagePath={document.location.origin + '/ch/' + targetChannel.id + '/a/'}
                  toggle={toggleHistory}
                  onToggleOn={handleToggleHistory}
                  onToggleOff={handleToggleHistory}
                  onLoadUp={handleLoadUpMessages}
                  onLoadDown={handleLoadDownMessages}
                  onSendMessage={handleSendMessage}
                  onDeleteMessage={handleDeleteMessage}
                  onDeleteForeverMessage={handleDeleteForeverMessage}
                  onRestoreMessage={handleRestoreMessage}
                  onScrollToStart={handleScrollToStart}
                  onNewLastSeenMessage={handleNewLastSeenMessage}
                  onLoadToLastSeen={handleLoadToLastSeen}
                  onAudioRecordEnds={handleAudioRecordEnds}
                />
              </Suspense>
            : null
        }
      </div>
      <DialogComponent
        title='Список пользователей'
        classes='dialog'
        submitbtn='Удалить'
        visible={dialogUserList}
        onClose={() => setDialogUserList(false)}
        noActions={true}
      >
        {
          renderChannelUsers()
        }
      </DialogComponent>
    </>
  )
}