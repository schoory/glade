
import { lazy, useEffect, useRef, useState } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { useRoutes } from './routes';
import { useSelector, useDispatch } from 'react-redux';
import { statusIdle } from './store/userReducer';
import { fetchUser } from './asyncActions/user';
import AlertComponent from './components/alert/AlertComponent';
import { setXS, setSM, setMD, setLG, setXL, setXXL } from './store/breakpointsReducer';
import { useSocket } from './hooks/socket.hook';
import { socketConnect, socketDisconnect } from './store/socketReducer';
import { leftVoiceChannel, saveVoiceChannelsInfo, saveVoiceSettings } from './store/voiceReducer';
import { useCallback } from 'react';
import { useVoice } from './hooks/voice.hook';
import { AccountDetail } from './components/account/AccountDetail';
import { GladeContextMenu } from './components/contextmenu/GladeContextMenu';

function App() {

  const routes = useRoutes()
  const loginStatus = useSelector(state => state.user.status)
  const user = useSelector(state => state.user.user)
  const alert = useSelector(state => state.alert)
  const breakpoints = useSelector(state => state.breakpoints)
  const voices = useSelector(state => state.voices)
  const inVoiceChannel = useSelector(state => state.voices.inVoiceChannel)
  const voiceSettings = useSelector(state => state.voices.voiceSettings)
  const socketEl = useSelector(state => state.socket.socket)
  const accountDetails = useSelector(state => state.accountDetails)
  const context = useSelector(state => state.context)
  const { socket, addHandlers, removeHandlers, joinRoom, leaveRoom } = useSocket()

  const { voiceActivate, voiceDeactivate, isRecording } = useVoice(socket, voiceSettings, { channelId: voices.voiceChannelId, userId: user ? user.id : null })

  const dispatch = useDispatch()

  const onlineInterval = useRef(null)

  // * при входе в систему сохранение в локальное хранилище токена при логине
  useEffect(() => {
    if (loginStatus === 'loggedin') {
      localStorage.setItem('user', JSON.stringify({ token: user.token, refresh: user.refreshToken, status: user.status ? user.status : 'online' }))
      dispatch(statusIdle()) // перевод статуса в состояние по умолчанию
    }
  }, [loginStatus])

  // * при открытии страницы получение информации о пользователе из локального хранилища
  useEffect(() => {
    if (loginStatus === 0) {
      const storage = JSON.parse(localStorage.getItem('user'))
      if (!user && storage) {
        dispatch(fetchUser({ token: storage.token, refreshToken: storage.refresh, status: storage.status ? storage.status : 'online' }))
      }
    }
  }, [loginStatus])

  // * установка breakpoint при загрузке страницы
  useEffect(() => {
    handleWindowResize()
  }, [])

  // * установка breakpoint
  const handleWindowResize = () => {
    const xs = window.matchMedia("(max-width: 450px)").matches
    const sm = window.matchMedia("(min-width: 451px) and (max-width: 650px)").matches
    const md = window.matchMedia("(min-width: 651px) and (max-width: 900px)").matches
    const lg = window.matchMedia("(min-width: 901px) and (max-width: 1024px)").matches
    const xl = window.matchMedia("(min-width: 1025px) and (max-width: 1400px)").matches
    const xxl = window.matchMedia("(min-width: 1401px)").matches
    if (xs && xs !== breakpoints.xs) return dispatch(setXS())
    if (sm && sm !== breakpoints.sm) return dispatch(setSM())
    if (md && md !== breakpoints.md) return dispatch(setMD())
    if (lg && lg !== breakpoints.lg) return dispatch(setLG())
    if (xl && xl !== breakpoints.xl) return dispatch(setXL())
    if (xxl && xxl !== breakpoints.xxl) return dispatch(setXXL())
  }

  // * подключение сокета, установка голосовых параметров
  useEffect(() => {
    dispatch(socketConnect())

    // параметры госового ввода
    if (!localStorage.getItem('voice-settings')) {
      localStorage.setItem('voice-settings', JSON.stringify({ mic: true, mute: false }))
    }
    const voiceSettings = JSON.parse(localStorage.getItem('voice-settings'))
    dispatch(saveVoiceSettings({ mic: voiceSettings.mic, mute: voiceSettings.mute }))
  }, [])

  
  useEffect(() => {
    if (socket && user) {
      
      joinRoom('server')
      socket.on('voice-channels-get', handleGetVoiceChannelsInfo)
      socket.emit('request-voice-channels')

      addHandlers() // добавление обработчиков событий сокета

      // первоначальная отправка статуса пользователя
      socket.emit('user-still-online', user.id)

      // отправка статуса пользователя каждую минуту
      onlineInterval.current = setInterval(() => {
        socket.emit('user-still-online', user.id)
      }, 60000)
    }
    return () => {
      if (socket && user) {
        leaveRoom('server')
        socket.removeListener('voice-channels-get', handleGetVoiceChannelsInfo)
        removeHandlers() // удаление обработчиков событий сокета
        clearInterval(onlineInterval.current)
      }
    }
  }, [socket, user])
  
  // * прослушиватель изменения размера окна
  useEffect(() => {
    window.addEventListener('resize', handleWindowResize)
    return () => {
      window.removeEventListener('resize', handleWindowResize)
    }
  }, [breakpoints])

  
  useEffect(() => {
    if (socketEl) {
      socketEl.on('voice-media-get', handleReceiveVoice) // слушатель получения аудио данных в голосовом канале
    }
    if (inVoiceChannel && !isRecording) {
      voiceActivate() // активация голосового чата
    }
    if (!inVoiceChannel && isRecording) {
      voiceDeactivate() // деактивация голсоового чата
    }
    return () => {
      if (socketEl) {
        socketEl.removeListener('voice-media-get', handleReceiveVoice)
      }
    }
  }, [inVoiceChannel, isRecording, socketEl, voiceSettings])

  useEffect(() => {
    if (inVoiceChannel) {
      socket.emit('voice-settings-changed', voices.voiceChannelId, user.id, voiceSettings)
    }
  }, [voiceSettings, inVoiceChannel])

  // * увеличение громкости звука в x раз
  const amplifyMedia = (media, multiplier) => {
    const context = new (window.AudioContext || window.webkitAudioContext),
    result = {
      context: context,
      source: context.createMediaElementSource(media),
      gain: context.createGain(),
      media: media,
      amplify: function(multiplier) { result.gain.gain.value = multiplier; },
      getAmpLevel: function() { return result.gain.gain.value; }
    };
    result.source.connect(result.gain);
    result.gain.connect(context.destination);
    result.amplify(multiplier);
    return result
  }

  // * получение настроек собеседника
  const getCompanionSettings = (userId) => {
    const vs = JSON.parse(localStorage.getItem('voice-settings'))
    if (vs[userId]) {
      return vs[userId]
    } else {
      return null
    }
  }

  // * получение информации о голосовых каналах
  const handleGetVoiceChannelsInfo = (voiceChannels) => {
    dispatch(saveVoiceChannelsInfo(voiceChannels))
  }

  // * получение аудио-данных
  const handleReceiveVoice = (userId, data) => {
    if (!voiceSettings.mute) {
      const audio = new Audio(data)
      const companionSettings = getCompanionSettings(userId)
      if (companionSettings) {
        amplifyMedia(audio, companionSettings.volume)
      } 
      audio.play()
    }
  }
  

  return (
    <>
      <Router>
        {
          routes
        }
      </Router>

      <GladeContextMenu
        visible={context.visible}
        position={context.pos}
        controls={context.controls}
        actions={context.actions}
        horizontalOffset={context.horizontalOffset}
        verticalOffset={context.verticalOffset}
      />
      
      <AccountDetail visible={accountDetails.visible} profile={accountDetails.profile} pos={accountDetails.pos} />

      <AlertComponent visible={alert.visible} style={alert.style} delay={alert.delay}>
        {alert.text}
      </AlertComponent>
    </>
  )
}

export default App;
