
import { forwardRef, useState, useEffect } from "react"
import { GladeAudio } from '../gladeaudio/GladeAudio'
import { isMobile } from "react-device-detect"
import { GladeFile } from "../gladefile/GladeFile"
import { replaceWithComponent } from './../../../modules/index';

export const GladeMessage = forwardRef((props, ref) => {

  const { 
    currentUser, 
    currentUserGroup, 
    profile, 
    profileGroup, 
    message, 
    repliedMessage, 
    standartAvatar, 
    usersAvatarPath, 
    audioMessagePath,
    onReply, 
    onScrollToReply, 
    onEdit, 
    onMoreInfo, 
    onDelete,
    onRestore,
    onDeleteForever
  } = props
  const messageDate = new Date(message.creation_date)
  const targeted = message.text.indexOf('@'+currentUser.login) !== -1 || (currentUserGroup && message.text.indexOf('@'+currentUserGroup.name) !== -1) ? true : false
  const appealPart = '@'+currentUser.login
  const appealGroupPart = currentUserGroup ? '@'+currentUserGroup.name : ''

  const [mouseEnter, setMouseEnter] = useState(false)
  const [viewDeleted, setViewDeleted] = useState(false)

  useEffect(() => {
    setMouseEnter(false)
  }, [])

  // * на мобильной версии отображение дополнительной информации
  const handleMobileViewDetails = () => {
    if (isMobile) {
      setMouseEnter(value => !value)
    }
  }

  // * на десктопной версии отображение дополнительной информации
  const handleDesktopViewDetails = () => {
    if (!isMobile) {
      setMouseEnter(value => !value)
    }
  }

  // * ответ на сообщение
  const handleReply = ({ currentTarget }) => {
    if (onReply) {
      const messageRef = currentTarget.parentNode.parentNode
      const index = messageRef.getAttribute('data-index')
      onReply(index)
    }
  }

  // * прокрутка до сообщения, на которое был дан ответ
  const handleScrollToReply = ({ currentTarget }) => {
    if (onScrollToReply && repliedMessage) {
      onScrollToReply(repliedMessage.index)
    }
  }

  // * изменение сообщения
  const handleEdit = () => {
    if (onEdit) {
      onEdit(message.id)
    }
  }

  // * дополнительная информация о сообщении
  const handleMoreInfo = () => {
    if (onMoreInfo) {
      onMoreInfo(message.id)
    }
  }

  // * удаление сообщения
  const handleDelete = () => {
    if (onDelete) {
      onDelete(message.id)
    }
  }

  // * восстановление сообщения
  const handleRestore = () => {
    if (onRestore) {
      onRestore(message.id)
    }
  }

  // * удаление сообщения без возможности восстановления
  const handleDeleteForever = () => {
    if (onDeleteForever) {
      onDeleteForever(message.id)
    }
  }

  // * рендер сообщения
  const renderMessage = () => {
    const renderItems = []
    if (message.text) {
      renderItems.push(
        ...message.text.split(`\n`).reduce((prev, item, index, textArray) => {
          const row = replaceWithComponent(item, [appealPart, appealGroupPart, /([-a-zA-Z0-9@:%_\+.~#?&\/=]{2,256}\.[a-z]{2,4}\b)(\/[-a-zA-Z0-9@:%_\+.~#?&\/=]*)?/gi], (element, index) => {
            if (element === appealPart || element === appealGroupPart) {
              return <span key={element+index}>{element}</span>
            } else {
              return <a key={element+index} href={element.indexOf('http') === -1 ? 'http://' + element : element}>{element}</a>
            }
          })
          if (index === textArray.length - 1) {
            prev.push(
              <p key={index}>
                {
                  row
                }
              </p>
            )
            return prev
          } else {
            prev.push(
              <p key={index}>
                { 
                  row
                }
                <br />
              </p>
            )
            return prev
          }
        }, [])
      )
    } else {
      if (message.attachments && message.attachments.audio) {
        const attachments = message.attachments
        return (
          <GladeAudio
            audioMessagePath={audioMessagePath + attachments.audio.name}
            duration={attachments.audio.duration}
          />
        )
      }
    }
    if (message.attachments && message.attachments.file) {
      renderItems.push(
        <GladeFile file={message.attachments.file} channelId={message.channel_id} key={renderItems.length + 1} user={currentUser}/>
      )
    }
    return renderItems
  }

  // * открытие дополнительной информации об аккаунте
  const handleOpenAccountDetails = ({ currentTarget }) => {
    if (props.onOpenAccountDetails) {
      props.onOpenAccountDetails(currentTarget)
    }
  }

  return (
    <div className={ profile ? "glademessage glademessage-groupstart" : "glademessage"} 
      ref={ref} 
      data-index={message.index} 
      onClick={handleMobileViewDetails}
      onMouseEnter={handleDesktopViewDetails}
      onMouseLeave={handleDesktopViewDetails}
    >
      {
        profile
          ? (
            <>
              <img className="glademessage__avatar" src={ profile.avatar ? usersAvatarPath + profile.avatar : standartAvatar } />
              <div className="glademessage__content">
                <div className="glademessage__title">
                  <div 
                    className="glademessage__name" 
                    style={{ color: `${profileGroup ? profileGroup.color : '#343A40'}` }}
                    data-id={profile.id}
                    onClick={handleOpenAccountDetails}
                  >
                    { `${profile.first_name} ${profile.last_name}` }
                  </div>
                  <div className="glademessage__title-date">
                    {`${messageDate.toLocaleDateString()} ${messageDate.getHours().toString().padStart(2, '0')}:${messageDate.getMinutes().toString().padStart(2, '0')}`}
                  </div>
                  { 
                    message.edited && !isMobile
                      ? <div className="glademessage__edited">изменено</div>
                      : null
                  }
                </div>
                {
                  message.reply_to && !message.deleted
                    ? <div 
                        className="glademessage__text-reply" 
                        data-index={repliedMessage ? repliedMessage.index : -1}
                        onClick={handleScrollToReply}
                      >
                        { 
                          repliedMessage && repliedMessage.deleted
                            ? 'В ответ на "Сообщение удалено администратором"'
                            : repliedMessage 
                              ? 'В ответ на "' + repliedMessage.text + '"' 
                              : 'В ответ на сообщение' 
                        }
                      </div>
                    : null
                }
                <div className={targeted ? "glademessage__text glademessage__text_targeted" : "glademessage__text"}>
                  {
                    message.deleted 
                      ? (
                        <div className="glademessage__content">
                          <p className="glademessage__deleted">Сообщение удалено модератором</p>
                          {
                            !isMobile && (currentUser.role === 'administrator' || currentUserGroup.role === 'administrator')
                              ? (
                                <>
                                  <p className="glademessage__viewdeleted" onClick={() => setViewDeleted(value => !value)}>
                                    {
                                      !viewDeleted
                                        ? 'показать сообщение'
                                        : 'скрыть сообщение'
                                    }
                                  </p>
                                  <div className="glademessage__deletedmessage">
                                    {
                                      viewDeleted
                                        ? renderMessage()
                                        : null
                                    }
                                  </div>
                                </>
                              )
                              : null
                          }
                        </div>
                      )
                      : renderMessage()
                  }
                </div>
              </div>
            </>
          )
          : (
            <>
              <div className="glademessage__content">
                {
                  message.reply_to && !message.deleted
                    ? <div 
                        className="glademessage__text-reply" 
                        onClick={handleScrollToReply}
                      >
                        { 
                          repliedMessage && repliedMessage.deleted
                            ? 'В ответ на "Сообщение удалено администратором"'
                            : repliedMessage 
                              ? 'В ответ на "' + repliedMessage.text + '"' 
                              : 'В ответ на сообщение' 
                        }
                      </div>
                    : null
                }
                <div className={targeted ? "glademessage__text glademessage__text_targeted" : "glademessage__text"}>
                  {
                    message.deleted 
                      ? (
                        <div className="glademessage__content">
                          <p className="glademessage__deleted">Сообщение удалено модератором</p>
                          {
                            !isMobile && (currentUser.role === 'administrator' || (currentUserGroup && currentUserGroup.role === 'administrator'))
                              ? (
                                <>
                                  <p className="glademessage__viewdeleted" onClick={() => setViewDeleted(value => !value)}>
                                    {
                                      !viewDeleted
                                        ? 'показать сообщение'
                                        : 'скрыть сообщение'
                                    }
                                  </p>
                                  <div className="glademessage__deletedmessage">
                                    {
                                      viewDeleted
                                        ? renderMessage()
                                        : null
                                    }
                                  </div>
                                </>
                              )
                              : null
                          }
                        </div>
                      )
                      : renderMessage()
                  }
                </div>
              </div>
              {
                mouseEnter
                  ? (
                    <div className="glademessage__date">
                      {`${messageDate.getHours().toString().padStart(2, '0')}:${messageDate.getMinutes().toString().padStart(2, '0')}`}
                    </div>
                  )
                  : null
              }
            </>
          )
      }
      {
        mouseEnter
          ? (
          <>
            <div className="glademessage__context">
              {
                message.deleted && (currentUser.role === 'administrator' || currentUserGroup.role === 'administrator')
                  ? (
                    <>
                      <button className="glademessage__context-btn" onClick={handleRestore}>
                        <svg viewBox="0 0 24 24">
                          <path fill="currentColor" d="M14,14H16L12,10L8,14H10V18H14V14M6,7H18V19C18,19.5 17.8,20 17.39,20.39C17,20.8 16.5,21 16,21H8C7.5,21 7,20.8 6.61,20.39C6.2,20 6,19.5 6,19V7M19,4V6H5V4H8.5L9.5,3H14.5L15.5,4H19Z" />
                        </svg>
                      </button>
                      <button className="glademessage__context-btn" onClick={handleDeleteForever}>
                        <svg viewBox="0 0 24 24">
                          <path fill="currentColor" d="M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19M8.46,11.88L9.87,10.47L12,12.59L14.12,10.47L15.53,11.88L13.41,14L15.53,16.12L14.12,17.53L12,15.41L9.88,17.53L8.47,16.12L10.59,14L8.46,11.88M15.5,4L14.5,3H9.5L8.5,4H5V6H19V4H15.5Z" />
                        </svg>
                      </button>
                    </>
                  )
                  : null
              }
              {
                !message.deleted
                  ? (
                    <button className="glademessage__context-btn" onClick={handleReply}>
                      <svg viewBox="0 0 24 24">
                        <path d="M10,9V5L3,12L10,19V14.9C15,14.9 18.5,16.5 21,20C20,15 17,10 10,9Z" />
                      </svg>
                    </button>
                  )
                  : null
              }
              {
                currentUser.id === message.user_id && !message.deleted && !message.attachments
                  ? (
                    <button className="glademessage__context-btn" onClick={handleEdit}>
                      <svg viewBox="0 0 24 24">
                        <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z" />
                      </svg>
                    </button>
                  )
                  : null
              }
              {
                !message.deleted && (currentUser.role === 'administrator' || (currentUserGroup && currentUserGroup.role === 'administrator') || message.user_id === currentUser.id)
                  ? (
                    <button className="glademessage__context-btn" onClick={handleDelete}>
                      <svg viewBox="0 0 24 24">
                        <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
                      </svg>
                    </button>
                  )
                  : null
              }
              {
                isMobile
                  ? (
                    <button className="glademessage__context-btn" onClick={handleMoreInfo}>
                      <svg viewBox="0 0 24 24">
                        <path fill="currentColor" d="M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
                      </svg>
                    </button>
                  )
                  : null
              }
            </div>
          </>
          )
          : null
      }
    </div>
  )
})