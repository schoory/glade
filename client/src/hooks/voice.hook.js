
import { useCallback, useRef, useState, useEffect } from "react"

export const useVoice = (socket, voiceSettings, { channelId, userId }) => {

  const voiceChunks = useRef([])
  const recorder = useRef(null)
  const timeout = useRef(null)
  const isResume = useRef(false)
  const [isRecording, setIsRecording] = useState(false)
  const VOICE_DELAY = 500

  useEffect(() => {
    if (recorder.current) recorder.current.onstop = voiceStop
  }, [voiceSettings, channelId, userId])

  const voiceDataAvailable = (event) => {
    voiceChunks.current.push(event.data)
  }

  const voiceStop = () => {
    const voiceBlob = new Blob(voiceChunks.current, { type: 'audio/webm; codecs=opus' })
    voiceChunks.current = []
    const fileReader = new FileReader()
    fileReader.readAsDataURL(voiceBlob)
    fileReader.onloadend = () => {
      if (voiceSettings.mic && socket) { socket.emit('voice-media', 'v-ch/' + channelId, userId, fileReader.result) }
    }
    if (isResume.current) {
      recorder.current.start()
      timeout.current = setTimeout(() => {
        if (recorder.current && recorder.current.state !== 'inactive') {
          recorder.current.stop()
        }
        clearTimeout(timeout.current)
      }, VOICE_DELAY)
    }
  }
  
  const voiceActivate = () => {
    if (navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia({ 
        audio: {
          autoGainControl: false,
          echoCancellation: false,
          noiseSuppression: false
        }
      }).then(stream => {
        setIsRecording(true)
        isResume.current = true
        recorder.current = new MediaRecorder(stream)
        recorder.current.start()
        recorder.current.ondataavailable = voiceDataAvailable
        recorder.current.onstop = voiceStop
        timeout.current = setTimeout(() => {
          if (recorder.current && recorder.current.state !== 'inactive') recorder.current.stop()
          clearTimeout(timeout.current)
        }, VOICE_DELAY)
      })
    }
  }

  const voiceDeactivate = () => {
    isResume.current = false
    setIsRecording(false)
    if (recorder.current.state !== 'inactive') { recorder.current.stop() }
    recorder.current.stream.getTracks().forEach(track => track.stop())
  }

  return { voiceActivate, voiceDeactivate, isRecording } 
}