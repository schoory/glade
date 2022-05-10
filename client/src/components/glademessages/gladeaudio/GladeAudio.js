
import { forwardRef, useRef, useState, useLayoutEffect } from "react"
import { setContextMenuHidden, setContextMenuVisible } from "../../../store/contextReducer";
import { useDispatch } from 'react-redux';

export const GladeAudio = forwardRef((props, ref) => {

  const [isPlayed, setIsPlayed] = useState(false)
  const [audioTimeline, setAudioTimeline] = useState(0)
  const [timelineWidth, setTimelineWidth] = useState(0)
  const [audioRange, setAudioRange] = useState({ start: 0, end: !isNaN(Math.round(props.duration)) ? Math.round(props.duration) : 'загрузка' })
  const [audioSpeed, setAudioSpeed] = useState(1)

  const dispatch = useDispatch()

  const audioEl = useRef(null)
  const timelineEl = useRef(null)

  useLayoutEffect(() => {
    if (timelineEl.current) {
      setTimelineWidth(timelineEl.current.offsetWidth / 100)
    }
  }, [])

  const handleTogglePlay = () => {
    if (audioEl.current) {
      if (audioEl.current.paused) {
        audioEl.current.play()
      } else {
        audioEl.current.pause()
      }
      setIsPlayed(value => !value)
    }
  }

  const handleAudioEnds = () => {
    setIsPlayed(false)
  }

  const handlePlaying = ({ target }) => {
    const duration = isNaN(target.duration) || target.duration === Infinity 
      ? !isNaN(Math.round(props.duration)) ? Math.round(props.duration) : 'загрузка'
      : Math.round(target.duration)
    setAudioTimeline(Math.round(Math.round(target.currentTime) * 100 / duration))
    setAudioRange({ start: Math.round(target.currentTime), end: duration })
  }

  const handleMetadataLoaded = ({ target }) => {
    
  }

  const handleChangeTimeline = ({ target }) => {
    setAudioTimeline(target.value)
    if (audioEl.current) {
      setIsPlayed(false)
      audioEl.current.pause()
      const duration = audioEl.current.duration === Infinity ? Math.round(props.duration) : Math.round(audioEl.current.duration)
      audioEl.current.currentTime = duration  * target.value / 100
    }
  }

  const handleChangeSpeed = (speed) => {
    if (audioEl.current) {
      setAudioSpeed(+speed)
    }
  }

  const handleOpenItemContext = ({ currentTarget }) => {
    dispatch(setContextMenuVisible({ 
      pos: { left: currentTarget.getBoundingClientRect().left, top: currentTarget.getBoundingClientRect().top },
      controls: ['0.25x', '0.5x', '1x', '1.5x', '2x'],
      actions: [
        () => { dispatch(setContextMenuHidden()); handleChangeSpeed(.25); },
        () => { dispatch(setContextMenuHidden()); handleChangeSpeed(.5); },
        () => { dispatch(setContextMenuHidden()); handleChangeSpeed(1); },
        () => { dispatch(setContextMenuHidden()); handleChangeSpeed(1.5); },
        () => { dispatch(setContextMenuHidden()); handleChangeSpeed(2); },
      ],
      fixedHeight: true
    }))
  }

  return (
    <div className="glademessage__audio" data-play={isPlayed}>
      <button className="glademessage__audio-play" onClick={handleTogglePlay}>
      {
        !isPlayed  
          ? (
            <svg viewBox="0 0 24 24">
              <path fill="currentColor" d="M8,5.14V19.14L19,12.14L8,5.14Z" />
            </svg>
          )
          : (
            <svg viewBox="0 0 24 24">
              <path fill="currentColor" d="M14,19H18V5H14M6,19H10V5H6V19Z" />
            </svg>
          )
      }
      </button>
      <div className="glademessage__audio-container">
        <div className="glademessage__audio-timeline" ref={timelineEl} style={{ "--width": `calc(${timelineWidth}px * ${audioTimeline})` }}>
          <input type="range" max="100" value={audioTimeline} onChange={handleChangeTimeline} />
        </div>
        <div className="glademessage__audio-container glademessage__audio-container_row">
          <div className="glademessage__audio-range">
            <p className="glademessage__audio-range-start">
              { `${Math.trunc(audioRange.start / 60).toString().padStart(2, '0')}:${(audioRange.start - (Math.trunc(audioRange.start / 60) * 60)).toString().padStart(2, 0)}` }
            </p>
            <p className="glademessage__audio-range-divider">/</p>
            <p className="glademessage__audio-range-end">
              { `${ audioRange.end !== 'загрузка' ? Math.trunc(audioRange.end / 60).toString().padStart(2, '0') + ':' + (audioRange.end - (Math.trunc(audioRange.end / 60) * 60)).toString().padStart(2, 0) : audioRange.end}` }
            </p>
          </div>
          <button className="glademessage__audio-btn glademessage__audio-btn_speed" onClick={handleOpenItemContext}>{audioSpeed.toString() + 'x'}</button>
        </div>
        </div>
      <audio src={ props.audioMessagePath } ref={audioEl} onEnded={handleAudioEnds} onLoadedMetadata={handleMetadataLoaded} onTimeUpdate={handlePlaying}/>
    </div>
  )
})