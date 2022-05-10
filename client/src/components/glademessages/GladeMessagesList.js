

import { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { GladeMessage } from './glademessage/GladeMessage';
import { isMobile } from 'react-device-detect';
import './GladeMessagesList.scss'
import DialogComponent from './../dialog/DialogComponent';
import { useDispatch } from 'react-redux';
import { setAccountDetailsVisible } from '../../store/accountDetailsReducer';
import { GladeAudio } from './gladeaudio/GladeAudio';
import { GladeFile } from './gladefile/GladeFile';
import { GladeAvatarStatus } from './../avatarstatus/GladeAvatarStatus';

export default function GladeMessagesList(props) {

  const dispatch = useDispatch()

  const [channel, setChannel] = useState(null)
  const [newMessageValue, setNewMessageValue] = useState('')

  const [messages, setMessages] = useState([])
  const [messagesTotal, setMessagesTotal] = useState(0)
  const [messagesStatus, setMessagesStatus] = useState('')
  const [minIndex, setMinIndex] = useState(0)
  const [maxIndex, setMaxIndex] = useState(0)

  const [isScrolled, setIsScrolled] = useState(false)
  const [lastSeenMessageIndex, setLastSeenMessageIndex] = useState(-1)

  const [addFileToMessage, setAddFileToMessage] = useState({ added: false, file: null })
  const [replyToMessage, setReplyToMessage] = useState({ messageIndex: -1, reply: false })
  const [editMessage, setEditMessage] = useState({ edited: false, id: '' })
  const [moreInfo, setMoreInfo] = useState({ visible: false })
  const moreInfoRef = useRef(null)

  const loadDownElement = useRef(null)
  const loadUpElement = useRef(null)

  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorder = useRef(null)
  const audioDurationInterval = useRef(null)
  const audioDuration = useRef(0)
  const [audioDurationRender, setAudioDurationRender] = useState(0)
  const sendAudioMessage = useRef(true)

  const [canScroll, setCanScroll] = useState(true)

  const [scrollToElement, setScrollToElement] = useState(null)
  const scrollToElementRef = useCallback((node) => {
    if (node !== null) {
      setScrollToElement(node)
    }
  }, [])

  const [dialogDeleteMessage, setDialogDeleteMessage] = useState({ visible: false, id: '' })
  const [dialogDeleteForeverMessage, setDialogDeleteForeverMessage] = useState({ visible: false, id: '' })
  const [dialogRestoreMessage, setDialogRestoreMessage] = useState({ visible: false, id: '' })
  const [dialogUserList, setDialogUserList] = useState(false)

  const loadLimit = props.loadLimit || 200
  const offset = loadLimit * .2

  const listRoot = useRef(null)

  const dragCount = useRef(0)
  const [isDragged, setIsDragged] = useState(false)

  useEffect(() => {
    setChannel(props.channel)
    setMessages(props.messages)
    setMessagesStatus(props.messagesStatus)
    setMessagesTotal(props.messagesTotal)
    setMinIndex(props.messagesMinIndex)
    setMaxIndex(props.messagesMaxIndex)
    setLastSeenMessageIndex(props.lastSeenMessageIndex)
  }, [props])

  useEffect(() => {
    if (messages.length > 0 && lastSeenMessageIndex === -1 && props.onNewLastSeenMessage)  {
      props.onNewLastSeenMessage(messages[0].index)
    }
  }, [messages, lastSeenMessageIndex])

  // * на мобильной версии возвращение к списку каналов
  const handleToggleChannelOff = () => {
    if (props.onToggleOff) {
      props.onToggleOff()
    }
  }

  // * ответ на сообщение
  const handleReplyToMessage = (messageIndex) => {
    setEditMessage({ edited: false, id: '' })
    setNewMessageValue('')
    setReplyToMessage({ reply: true, messageIndex: messageIndex })
  }

  // * отправка сообщения
  const handleSendMessage = () => {
    if (props.onSendMessage) {
      const messageValue = {
        value: newMessageValue,
        edited: editMessage.edited,
        editId: editMessage.id,
        reply: replyToMessage.reply,
        replyIndex: replyToMessage.messageIndex,
        file: addFileToMessage.added ? addFileToMessage.file : null
      }
      props.onSendMessage(messageValue)
      setNewMessageValue('')
      setAddFileToMessage({ added: false, file: null })
      setEditMessage({ edited: false, id: '' })
      setReplyToMessage({ reply: false, messageIndex: -1 })
    }
  }

  // * удаление сообщения
  const handleDeleteMessage = () => {
    if (props.onDeleteMessage) {
      props.onDeleteMessage(dialogDeleteMessage.id)
      setDialogDeleteMessage({ visible: false, id: '' })
    }
  }

  // * удаление сообщения без возможности восстановления
  const handleDeleteForeverMessage = () => {
    if (props.onDeleteForeverMessage) {
      props.onDeleteForeverMessage(dialogDeleteForeverMessage.id)
      setDialogDeleteForeverMessage({ visible: false, id: '' })
    }
  }

  // * восстановление удаленного сообщения
  const handleRestoreMessage = () => {
    if (props.onRestoreMessage) {
      props.onRestoreMessage(dialogRestoreMessage.id)
      setDialogRestoreMessage({ visible: false, id: '' })
    }
  }

  // * на десктопной версии нажатие на Enter без зажатия Shift отправляет сообщение
  const handleFormInputKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !isMobile && props.onSendMessage) {
      handleSendMessage()
      event.preventDefault()
    }
  }

  // * прокрутка до сообщения, на которое был дан ответ
  const handleScrollToReply = (index) => {
    if (index > -1) {
      const messageItem = [ ...listRoot.current.children ].find(item => +item.getAttribute('data-index') === +index)
      if (messageItem) {
        messageItem.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  // * прокрутка до последнего прочитанного сообщения
  const handleScrollToLastSeen = () => {
    if (lastSeenMessageIndex > -1) {
      const messageItem = [ ...listRoot.current.children ].find(item => +item.getAttribute('data-index') === +lastSeenMessageIndex)
      if (messageItem) {
        messageItem.scrollIntoView({ behavior: 'smooth' })
        if (props.onNewLastSeenMessage)  {
          props.onNewLastSeenMessage(maxIndex)
        }
      } else {
        if (props.onLoadToLastSeen) {
          props.onLoadToLastSeen()
        }
      }
    }
  }

  // * изменение сообщения
  const handleEditMessage = (id) => {
    const message = messages.find(item => item.id === id)
    setReplyToMessage({ messageIndex: -1, reply: false })
    setNewMessageValue(message.text)
    setEditMessage({ edited: true, id: message.id })
  }

  // * на мобильной версии отображение плашки с полной информации о сообщении
  const handleViewMoreInfo = (id) => {
    const message = messages.find(item => item.id === id)
    const profile = props.users.find(item => item.id === message.user_id)
    const group = props.groups.find(item => item.id === profile.group_id)
    setMoreInfo({ 
      visible: true, 
      ...message, 
      groupColor: group && group.color ? group.color : '#000',
      userName: profile ? `${profile.first_name} ${profile.last_name}` : 'Не указано',
      userLogin: profile ? profile.login : 'Не указано'
    })
    const timer = setTimeout(() => {
      moreInfoRef.current.setAttribute('data-visible', true)
      clearTimeout(timer)
    }, 100)
  }

  // * прокрутка в начало
  const handleScrollToStart = () => {
    if (props.onScrollToStart) {
      props.onScrollToStart()
      setIsScrolled(false)
      listRoot.scrollTop = 0
    }
  }

  // * запуск записи
  const handleStartRecordAudioMessage = () => {
    if (navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          setIsRecording(true)
          mediaRecorder.current = { recorder: new MediaRecorder(stream), voiceChunks: [] }
          if (mediaRecorder.current.recorder) {
            let duration = 0
            audioDurationInterval.current = setInterval(() => {
              audioDuration.current += 1
              duration++
              setAudioDurationRender(duration)
              if (duration >= 59 * 60 + 58 && navigator.mediaDevices && mediaRecorder.current && mediaRecorder.current.recorder) {
                setIsRecording(false)
                setAudioDurationRender(0)
                sendAudioMessage.current = true
                mediaRecorder.current.recorder.stop()
              }
            }, 1000)

            mediaRecorder.current.recorder.start()

            mediaRecorder.current.recorder.ondataavailable = (e) => {
              mediaRecorder.current.voiceChunks.push(e.data)
            }

            mediaRecorder.current.recorder.onstop = (e) => {
              clearInterval(audioDurationInterval.current)
              mediaRecorder.current.recorder.stream.getTracks().forEach(track => {
                track.stop()
              })
              const blob = new Blob(mediaRecorder.current.voiceChunks, { 'type' : 'audio/webm; codecs=opus' });
              mediaRecorder.current.recorder = null
              mediaRecorder.current.voiceChunks = [];  
              if (props.onAudioRecordEnds && sendAudioMessage.current) {
                props.onAudioRecordEnds({ blob: blob, duration: audioDuration.current }, replyToMessage.reply ? replyToMessage : null)
              }
              audioDuration.current = 0
            }
          }
          
        })
        .catch(e => {
          
        })
    }
  }

  // * остановка записи с отправкой на сервер
  const handleStopRecordAudioMessage = () => {
    if (navigator.mediaDevices && mediaRecorder.current && mediaRecorder.current.recorder) {
      setIsRecording(false)
      setAudioDurationRender(0)
      sendAudioMessage.current = true
      mediaRecorder.current.recorder.stop()
    }
  }

  // * остановка записи без отправки на сервер
  const handleStopRecordAndNotSend = () => {
    if (navigator.mediaDevices && mediaRecorder.current && mediaRecorder.current.recorder) {
      setIsRecording(false)
      setAudioDurationRender(0)
      sendAudioMessage.current = false
      mediaRecorder.current.recorder.stop()
    }
  }

  const handleOpenAccountDetails = (currentTarget) => {
    if (props.users) {
      const profile = props.users.find(item => +item.id === +currentTarget.getAttribute('data-id'))
      const position = currentTarget.getBoundingClientRect()
      dispatch(setAccountDetailsVisible({ profile: profile, pos: { left: position.left, top: position.top + Math.round(position.height / 2) } }))
    }
  }
  
  // * рендер сообщений
  const renderMessages = () => {

    if (messages.length === 0) return

    return messages.reduce((messagesItems, item, index) => {
      let profile = null
      let profileGroup = null
      if (
        (messages[index + 1] && messages[index + 1].user_id !== item.user_id) || // если следующее сообщение не от этого пользователя
        !messages[index + 1] || // или следующего сообщения нет, вывод сгруппированных сообщений по пользователю
        item.edited || 
        (messages[index + 1] && new Date(messages[index + 1].creation_date).toLocaleDateString() !== new Date(item.creation_date).toLocaleDateString())
      ) {
        profile = props.users ? props.users.find(subitem => subitem.id === item.user_id) : null
        profileGroup = props.groups ? props.groups.find(subitem => subitem.id === profile.group_id) : null
      }
      messagesItems.push(
        <GladeMessage 
          ref={
            index === offset && +messages[0].index !== +maxIndex
              ? loadDownElement
              : index === loadLimit - offset && +messages[messages.length-1].index !== +minIndex
                ? loadUpElement
                : +item.index === +props.scrollToIndex && +props.scrollToIndex > -1
                  ? scrollToElementRef
                  : null
          }
          message={item}
          repliedMessage={ item.reply_to ? messages.find(subitem => subitem.id === item.reply_to) : null }
          currentUser={props.user}
          currentUserGroup={props.userGroup}
          profile={profile}
          profileGroup={profileGroup}
          usersAvatarPath={props.usersAvatarPath} 
          standartAvatar={props.standartAvatar}
          audioMessagePath={props.audioMessagePath}
          key={index}
          onReply={handleReplyToMessage}
          onScrollToReply={handleScrollToReply}
          onEdit={handleEditMessage}
          onMoreInfo={handleViewMoreInfo}
          onDelete={(id) => { setDialogDeleteMessage({ visible: true, id: id }) }}
          onRestore={(id) => { setDialogRestoreMessage({ visible: true, id: id }) }}
          onDeleteForever={(id) => { setDialogDeleteForeverMessage({ visible: true, id: id }) }}
          onOpenAccountDetails={handleOpenAccountDetails}
        />
      )
      return messagesItems
    }, [])
  }

  // * рендер формы отправки сообщения
  const renderForm = () => {
    return (<div 
        className="gladechannel__form" 
        data-reply={
          replyToMessage.reply && replyToMessage.messageIndex > -1 && messages.find(item => item.index === replyToMessage.messageIndex)
            ? true
            : false
        }
        data-edit={
          editMessage.edited && editMessage.id && messages.find(item => item.id === editMessage.id)
            ? true
            : false
        }
      >
        {
          addFileToMessage.added
            ? (
              <div className="gladechannel__form-file" onClick={() => { setAddFileToMessage({ added: false, file: null }) }}>
                <p className='gladechannel__form-filename'>{addFileToMessage.file.name}</p>
                <p className='gladechannel__form-filesize'>
                  { Math.trunc(addFileToMessage.file.size / (1024*1024)) + '.' + Math.ceil((addFileToMessage.file.size / (1024*1024)).toString().split('.')[1]).toString().slice(0, 2) + " MB" }
                </p>
              </div>
            ) : (
              <label htmlFor='message-file'>
                <div className="gladechannel__form-files">
                  <svg viewBox="0 0 24 24">
                    <path fill="currentColor" d="M13,9H18.5L13,3.5V9M6,2H14L20,8V20A2,2 0 0,1 18,22H6C4.89,22 4,21.1 4,20V4C4,2.89 4.89,2 6,2M15,18V16H6V18H15M18,14V12H6V14H18Z" />
                  </svg>
                </div>
                <input id='message-file' type="file" style={{ display: 'none' }} onChange={({ target }) => { setAddFileToMessage({ added: target.files[0] ? true : false, file: target.files[0] ? target.files[0] : null }) }} />
              </label>
            )
        }
        <textarea 
          className='gladechannel__form-textfield' 
          placeholder='Напишите сообщение'
          style={{ 
            width: '100%', 
            height: newMessageValue.indexOf('\n') === -1 ? '40px' : `calc(23px + 21px * ${newMessageValue.split('\n').length})`
          }} 
          value={newMessageValue}
          onChange={({ target: { value } }) => setNewMessageValue(value)}
          onKeyDown={handleFormInputKeyDown}
        />
        {
          props.breakpoints.md || props.breakpoints.sm || props.breakpoints.xs
            ? (
              <>
                {
                  newMessageValue || addFileToMessage.added
                    ? (
                      <button className="gladechannel__form-send" onClick={handleSendMessage}>
                        <svg viewBox="0 0 24 24">
                          <path fill="currentColor" d="M2,21L23,12L2,3V10L17,12L2,14V21Z" />
                        </svg>
                      </button>
                    )
                    : (
                      <button 
                        className="gladechannel__form-send" 
                        onClick={() => {
                          if (isRecording) {
                            handleStopRecordAudioMessage()
                          } else {
                            handleStartRecordAudioMessage()
                          }
                        }} 
                      >
                        <svg viewBox="0 0 24 24">
                          <path fill="currentColor" d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z" />
                        </svg>
                      </button>
                    )
                }
              </>
            )
            : (
              <button 
                className="gladechannel__form-send" 
                onClick={() => {
                  if (isRecording) {
                    handleStopRecordAudioMessage()
                  } else {
                    handleStartRecordAudioMessage()
                  }
                }} 
              >
                <svg viewBox="0 0 24 24">
                  <path fill="currentColor" d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z" />
                </svg>
              </button>
            )
        }
        {
          replyToMessage.reply && replyToMessage.messageIndex > -1 && messages.find(item => item.index === replyToMessage.messageIndex)
            ? <div className="gladechannel__form-reply">
                <p>В ответ на "{messages.find(item => item.index === replyToMessage.messageIndex).text}"</p>
                <button className="gladechannel__form-btn" onClick={() => setReplyToMessage({ messageIndex: -1, reply: false })}>
                  <svg viewBox="0 0 24 24">
                    <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                  </svg>
                </button>
              </div>
            : null
        }
        {
          editMessage.edited && editMessage.id && messages.find(item => item.id === editMessage.id)
            ? (
              <div className="gladechannel__form-edit">
                <p>Изменение сообщения</p>
                <button className="gladechannel__form-btn" onClick={() => { 
                  setNewMessageValue('')
                  setEditMessage({ edited: false, id: '' }) 
                }}>
                  <svg viewBox="0 0 24 24">
                    <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                  </svg>
                </button>
              </div>
            )
            : null
        }
        {
          props.hasNewMessages || isScrolled || (+lastSeenMessageIndex !== +maxIndex && +lastSeenMessageIndex !== -1)
            ? (
              <div className="gladechannel__form-popover">
                {
                  props.hasNewMessages
                    ? <div className="gladechannel__form-newmessages" onClick={handleScrollToStart}>Есть новые сообщения</div>
                    : null
                }
                {
                  isScrolled
                    ? <div className="gladechannel__form-newmessages" onClick={handleScrollToStart}>Вернуться в начало</div>
                    : null
                }
                {
                  +lastSeenMessageIndex !== +maxIndex && +lastSeenMessageIndex !== -1
                    ? <div className="gladechannel__form-newmessages" onClick={handleScrollToLastSeen}>Перейти к последнему прочитанному сообщению</div>
                    : null
                }
              </div>
            )
            : null
        }
      </div>)
  }

  // * рендер формы записи голосового сообщения
  const renderFormRecording = () => {
    return (
      <div 
        className="gladechannel__form gladechannel__form_recording" 
        data-reply={
          replyToMessage.reply && replyToMessage.messageIndex > -1 && messages.find(item => item.index === replyToMessage.messageIndex)
            ? true
            : false
        }
      >
        <div className="gladechannel__form-record">
          <div className="gladechannel__form-record-icon"/>
          <div className='gladechannel__form-range'>
            <p className='gladechannel__form-range-start'>
             { `${Math.trunc(audioDurationRender / 60).toString().padStart(2, '0')}:${(audioDurationRender - (Math.trunc(audioDurationRender / 60) * 60)).toString().padStart(2, 0)}` }
            </p>
            <p className='gladechannel__form-range-divider'>/</p>
            <div className="gladechannel__form-range-end">59:59</div>
          </div>
        </div>
        <div className='gladechannel__form-controls'>
          <button 
            className="gladechannel__form-send" 
            onClick={() => {
              if (isRecording) {
                handleStopRecordAudioMessage()
              } else {
                handleStartRecordAudioMessage()
              }
            }} 
          >
            <svg viewBox="0 0 24 24">
              <path fill="currentColor" d="M19,11C19,12.19 18.66,13.3 18.1,14.28L16.87,13.05C17.14,12.43 17.3,11.74 17.3,11H19M15,11.16L9,5.18V5A3,3 0 0,1 12,2A3,3 0 0,1 15,5V11L15,11.16M4.27,3L21,19.73L19.73,21L15.54,16.81C14.77,17.27 13.91,17.58 13,17.72V21H11V17.72C7.72,17.23 5,14.41 5,11H6.7C6.7,14 9.24,16.1 12,16.1C12.81,16.1 13.6,15.91 14.31,15.58L12.65,13.92L12,14A3,3 0 0,1 9,11V10.28L3,4.27L4.27,3Z" />
            </svg>
          </button>
          <button 
            className="gladechannel__form-send" 
            onClick={handleStopRecordAndNotSend}
          >
            <svg viewBox="0 0 24 24">
              <path fill="currentColor" d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  const renderChannelUsers = () => {
    const activeUsers = props.activeUsers
    const groups = props.groups
    const users = props.channel.visibility === 'public'
      ? props.users
      : props.users.filter(user => 
        user.role === 'administrator' || 
        (user.group_id && groups.find(group => group.id === user.group_id) && groups.find(group => group.id === user.group_id).role === 'administrator') || 
        (user.group_id && groups.find(group => group.id === user.group_id) && props.channel.group_ids && props.channel.group_ids.includes(user.group_id))
      )
    const renderElements = []

    // сначала вывод активных пользователей
    if (activeUsers.length > 0) {
      // получение списка групп активных пользователей
      // если групп нет или группу невозможно найти ставится гурппа "Без группы"
      const activeUsersGroups = activeUsers.reduce((previous, user) => {
        if (user.group_id && groups.length > 0) {
          const group = groups.find(group => user.group_id === group.id)
          if (group && previous.findIndex(previousGroup => previousGroup.id === group.id) === -1) {
            previous.push(group)
          } else if (!previous.includes('Без группы')) {
            previous.push('Без группы')
          }
        } else if (!previous.includes('Без группы')) {
          previous.push('Без группы')
        }
        return previous
      }, [])

      activeUsersGroups.forEach((group, groupIndex) => {
        if (typeof group === 'string') {
          // если группа "Без группы"
          const usersWithoutGroup = activeUsers.filter(user => !user.group_id) // получение списка активных пользователей без группы
          if (usersWithoutGroup.length > 0) {
            renderElements.push(
              <div className="gladechannel__userlist" key={group + groupIndex}>
                <p className="gladechannel__userlist-groupname">{group} - {usersWithoutGroup.length}</p>
                {
                  usersWithoutGroup.map((user, userIndex) => {
                    return (
                      <div className="gladechannel__userlist-item" key={user.id + user.first_name + user.last_name + userIndex} data-id={user.id} onClick={({currentTarget}) => handleOpenAccountDetails(currentTarget)}>
                        <GladeAvatarStatus profile={user} width={'30px'} height={'30px'} statusWidth={'15px'} statusHeight={'15px'} />
                        <p className="gladechannel__userlist-name">{ `${user.first_name} ${user.last_name}` }</p>
                      </div>
                    )
                  })  
                }
              </div>
            )
          }
        } else {
          const groupUsers = activeUsers.filter(user => user.group_id && user.group_id === group.id)
          renderElements.push(
            <div className="gladechannel__userlist" key={group.name + groupIndex}>
              <p className="gladechannel__userlist-groupname">{group.name} - {groupUsers.length}</p>
              {
                groupUsers.map((user, userIndex) => {
                  return (
                    <div className="gladechannel__userlist-item" key={user.first_name + user.last_name + userIndex} data-id={user.id} onClick={({currentTarget}) => handleOpenAccountDetails(currentTarget)}> 
                      <GladeAvatarStatus profile={user} width={'30px'} height={'30px'} statusWidth={'15px'} statusHeight={'15px'} />
                      <p 
                        className="gladechannel__userlist-name" 
                        style={group.color ? { color: group.color } : null}
                      >
                        { `${user.first_name} ${user.last_name}` }
                      </p>
                    </div>
                  )
                })  
              }
            </div>
          )
        }
      })
    }

    groups.forEach((group, groupIndex) => {
      const groupUsers = users.filter(user => !activeUsers.find(activeUser => +activeUser.id === +user.id) && user.group_id && user.group_id === group.id)
      if (groupUsers.length !== 0) {
        renderElements.push(
          <div className="gladechannel__userlist" key={group + groupIndex}>
            <p className="gladechannel__userlist-groupname">{group.name} - {groupUsers.length}</p>
            {
              groupUsers.map((user, userIndex) => {
                return (
                  <div className="gladechannel__userlist-item" key={user.first_name + user.last_name + userIndex} data-id={user.id} onClick={({currentTarget}) => handleOpenAccountDetails(currentTarget)}>
                    <GladeAvatarStatus profile={user} width={'30px'} height={'30px'} statusWidth={'15px'} statusHeight={'15px'} />
                    <p className="gladechannel__userlist-name" style={{ opacity: .7 }}>{ `${user.first_name} ${user.last_name}` }</p>
                  </div>
                )
              })  
            }
          </div>
        )
      }
    })

    const usersWithoutGroup = users.filter(user => !activeUsers.find(activeUser => +activeUser.id === +user.id) && !user.group_id)
    if (usersWithoutGroup.length > 0) {
      renderElements.push(
        <div className="gladechannel__userlist" key={'Без группы'}>
          <p className="gladechannel__userlist-groupname">Без группы - {usersWithoutGroup.length}</p>
          {
            usersWithoutGroup.map((user, userIndex) => {
              return (
                <div className="gladechannel__userlist-item" key={user.first_name + user.last_name + userIndex} data-id={user.id} onClick={({currentTarget}) => handleOpenAccountDetails(currentTarget)}>
                  <GladeAvatarStatus profile={user} width={'30px'} height={'30px'} statusWidth={'15px'} statusHeight={'15px'} />
                  <p className="gladechannel__userlist-name" style={{ opacity: .7 }}>{ `${user.first_name} ${user.last_name}` }</p>
                </div>
              )
            })  
          }
        </div>
      )
    }


    return renderElements
  }

  useEffect(() => {
    if (scrollToElement !== null) {
      scrollToElement.scrollIntoView()
      setCanScroll(true)
    }
  }, [scrollToElement])

  useEffect(() => {
    if (messages[0] && maxIndex === messages[0].index) {
      setIsScrolled(false)
    }
  }, [maxIndex])

  // * загрузка дополнительныхх сообщений при достижении скролла 
  const handleScrollList = ({ target }) => {
    if (loadUpElement.current && target.scrollTop <= loadUpElement.current.offsetTop && props.onLoadUp && messagesStatus !== 'pending' && canScroll) {
      props.onLoadUp(loadUpElement.current)
      setIsScrolled(true)
      setCanScroll(false)
    }
    if (loadDownElement.current && target.scrollTop + target.offsetHeight >= loadDownElement.current.offsetTop && props.onLoadDown && messagesStatus !== 'pending' && canScroll) {
      props.onLoadDown(loadDownElement.current)
      setIsScrolled(true)
      setCanScroll(false)
    }
  }

  // * отображение наложения Drag and Drop 
  const handleDropEnter = (event) => {
    dragCount.current += 1
    if (!isDragged) setIsDragged(true)
  }

  // * скрытие наложения Drag and Drop
  const handleDragLeave = (event) => {
    dragCount.current -= 1
    if (dragCount.current === 0) {
      setIsDragged(false)
    }
  }

  // * дроп файла
  const handleDrop = (event) => {
    setAddFileToMessage({ added: event.dataTransfer.files[0] ? true : false, file: event.dataTransfer.files[0] ? event.dataTransfer.files[0] : null })
    dragCount.current = 0
    setIsDragged(false)
    event.preventDefault()
  }

  const handleDragOver = (event) => {
    event.preventDefault()
  }

  return (
    <div className='gladechannel' onDragEnter={handleDropEnter} onDragLeave={handleDragLeave}>
      <div className="gladechannel__header">
        { 
          // если экраны md, sm или xs вывод кнопки Назад
          props.breakpoints && (props.breakpoints.md || props.breakpoints.sm || props.breakpoints.xs) 
            ? <button className="btn-icon" onClick={handleToggleChannelOff}>
                <svg viewBox="0 0 24 24">
                  <path fill="currentColor" d="M15.41,16.58L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.58Z" />
                </svg>
              </button>
            : null
        }
        {
          channel 
            ? <p className="gladechannel__header-title">{ '#' + channel.name }</p> : null
        }
        <div className="gladechannel__header-controls">
          {
            props.activeUsers && props.activeUsers.length > 0
              ? (
                <ul 
                  className="gladechannel__header-users" 
                  style={
                    props.activeUsers.length <= 3
                      ? { width: `calc((50px - 50px * .3) * ${props.activeUsers.length - 1} + 50px)` } // высчитывается ширина блока с учетом смещения 30%
                      : { width: '155px' } // если больше 3 пользователей фиксированная ширина
                  }
                  onClick={() => setDialogUserList(true)}
                >
                {
                  props.activeUsers.map((item, index) => {
                    const avatarPath = props.usersAvatarPath && props.standartAvatar && item.avatar ? props.usersAvatarPath + item.avatar : props.standartAvatar // путь к аватару пользователя
                    if (index <= 2) {
                      return (
                        <li 
                        className="gladechannel__header-users-item" 
                        style={{ transform: `translateX(calc(-30% * ${index}))` }}
                        key={index}
                        >
                          <img src={item.avatar ? avatarPath : props.standartAvatar} alt="" /> {/* если у пользователя нет аватара, вывод заглушки */}
                        </li>
                      )
                    }
                  })
                }
                {
                  props.activeUsers.length > 3 // если больше 3 пользователей вывод заглушки (etc. +3 пользователя)
                    ? (
                      <li 
                      className="gladechannel__header-users-item" 
                      style={{ transform: `translateX(calc(-30% * 3))` }}
                      >
                        <p>{ '+' + (props.activeUsers.length - 3) }</p>
                      </li>
                    )
                    : null
                }
                </ul>
              )
              : null
          } 
        </div>
      </div>
      <div className="gladechannel__messages" onScroll={handleScrollList} ref={listRoot}> 
        {
          renderMessages()
        }
        {
          messagesStatus === 'pending'
            ? <div className="gladechannel__messages-spinner"/>
            : null
        }
      </div>
      {
        isDragged
          ? (
            <>
              <div className="gladechannel__drop-wrapper" onDrop={handleDrop} onDragOver={handleDragOver} />
              <div className='gladechannel__drop-panel' onDrop={handleDrop} onDragOver={handleDragOver}><p onDrop={handleDrop} onDragOver={handleDragOver}>Drop your files here</p></div>
            </>
          ) : null
      }
      {
        !isRecording
          ? renderForm()
          : renderFormRecording()
      }
      {
        moreInfo.visible
          ? (
            <>
              <div className="gladechannel__messageinfo" ref={moreInfoRef}>
                <div className="control">
                  <div className="control-label">Отправитель</div>
                  <div className="gladechannel__messageinfo-sender">
                    <p className="gladechannel__messageinfo-username" style={{ color: moreInfo.groupColor }}>
                      { moreInfo.userName }
                    </p>
                    <p className="gladechannel__messageinfo-userlogin">
                      {moreInfo.userLogin}
                    </p>
                  </div>
                </div>
                <div className="control">
                  <div className="control-label">Дата</div>
                  <div className="gladechannel__messageinfo-value">{ new Date(moreInfo.creation_date).toLocaleDateString() }</div>
                </div>
                {
                  moreInfo.edited
                    ? <div className="control">
                        <div className="control-label">Статус</div>
                        <div className="gladechannel__messageinfo-value">Изменено</div>
                      </div>
                    : null
                }
                {
                  moreInfo.deleted && (props.user.role === 'administrator' || props.userGroup.role === 'administrator')
                    ? <div className="control">
                        <div className="gladechannel__messageinfo-value">Удалено</div>
                        <div className="control-label">Сообщение</div>
                        <div className="gladechannel__messageinfo-value">{ moreInfo.text }</div>
                        {
                          moreInfo.attachments && moreInfo.attachments.audio
                            ? <GladeAudio audioMessagePath={props.audioMessagePath + moreInfo.attachments.audio.name} duration={moreInfo.attachments.audio.duration} />
                            : null
                        }
                        {
                          moreInfo.attachments && moreInfo.attachments.file
                            ? <GladeFile file={moreInfo.attachments.file} channelId={moreInfo.channel_id} />
                            : null
                        }
                      </div>
                    : null
                }
              </div>
              <div className="gladechannel__messageinfo-wrapper" onClick={() => setMoreInfo({ visible: false })}/>
            </>
          )
          : null
      }
      <DialogComponent
        title='Удаление сообщения'
        classes='dialog_fit'
        submitbtn='Удалить'
        visible={dialogDeleteMessage.visible}
        onClose={() => setDialogDeleteMessage({ visible: false, id: '' })}
        onApply={handleDeleteMessage}
      >
        <p className='dialog__text dialog__text_question'>Вы действительно хотите удалить сообщение?</p>
      </DialogComponent>
      <DialogComponent
        title='Восстановление сообщения'
        classes='dialog_fit'
        submitbtn='Восстановить'
        visible={dialogRestoreMessage.visible}
        onClose={() => setDialogRestoreMessage({ visible: false, id: '' })}
        onApply={handleRestoreMessage}
      >
        <p className='dialog__text dialog__text_question'>Вы действительно хотите восстановить сообщение?</p>
      </DialogComponent>
      <DialogComponent
        title='Удалить без возможности восстановления'
        classes='dialog_fit'
        submitbtn='Удалить'
        visible={dialogDeleteForeverMessage.visible}
        onClose={() => setDialogDeleteForeverMessage({ visible: false, id: '' })}
        onApply={handleDeleteForeverMessage}
      >
        <p className='dialog__text dialog__text_question'>
          Вы действительно хотите удалить сообщение без возможности восстановления?
          <br />
          Это действие невозможно отменить
        </p>
      </DialogComponent>
      <DialogComponent
        title='Список пользователей'
        classes='dialog_fit'
        submitbtn='Удалить'
        visible={dialogUserList}
        onClose={() => setDialogUserList(false)}
        noActions={true}
      >
        {
          renderChannelUsers()
        }
      </DialogComponent>
    </div>
  )
}