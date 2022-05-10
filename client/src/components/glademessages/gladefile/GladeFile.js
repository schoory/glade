
import { forwardRef } from "react"
import { downloadMessageFile } from "../../../api/files.api"
import { GladeAudio } from "../gladeaudio/GladeAudio"
import { saveAs } from 'file-saver'

export const GladeFile = forwardRef((props, ref) => {

  const channelsFilesPath = document.location.origin + "/ch/" + props.channelId + '/f/'

  const handleDownloadFile = () => {
    downloadMessageFile({ channelId: props.channelId, fileName: props.file.name, token: props.user.token, refreshToken: props.user.refreshToken }).then(data => 
      data.blob().then(blob => {
        saveAs(blob, props.file.original_name)
      })
    )
  }

  const renderImage = () => {
    return (
      <div className="glademessage__file">
        <img src={ channelsFilesPath + props.file.name } alt="" className="glademessage__file-img" />
      </div>
    )
  }

  const renderVideo = () => {
    return (
      <div className="glademessage__file">
        <video src={channelsFilesPath + props.file.name} className='glademessage__file-video' controls/>
      </div>
    )
  }
  
  const renderFile = () => {
    return (
      <div className="glademessage__file glademessage__file_file">
        <svg viewBox="0 0 24 24" className="glademessage__file-icon">
          <path fill="currentColor" d="M13,9V3.5L18.5,9M6,2C4.89,2 4,2.89 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2H6Z" />
        </svg>
        <div className="glademessage__file-info">
          <p className="glademessage__file-name">{props.file.original_name}</p>
          <p className="glademessage__file-size">
          { Math.trunc(props.file.size / (1024*1024)) + '.' + Math.ceil((props.file.size / (1024*1024)).toString().split('.')[1]).toString().slice(0, 2) + " MB" }
          </p>
        </div>
        <button className="glademessage__file-download btn-icon" onClick={handleDownloadFile}>
          <svg viewBox="0 0 24 24">
            <path fill="currentColor" d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z" />
          </svg>
        </button>
      </div>
    )
  }
  
  return (
    <>
      {
        props.file.mimetype.indexOf('image/') !== -1
          ? renderImage()
          : null
      }
      {
        props.file.mimetype.indexOf('audio/') !== -1
          ? <GladeAudio audioMessagePath={channelsFilesPath + props.file.name} duration={props.file.duration ? props.file.duration : 'загрузка'} />
          : null
      }
      {
        props.file.mimetype.indexOf('video/') !== -1
          ? renderVideo()
          : null
      }
      {
        props.file.mimetype.indexOf('image/') === -1 && props.file.mimetype.indexOf('audio/') === -1 && props.file.mimetype.indexOf('video/') === -1
          ? renderFile()
          : null
      }
    </>
  )
})