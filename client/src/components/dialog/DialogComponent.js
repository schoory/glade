
import { useState, useEffect, useRef } from 'react'

import './DialogComponent.scss'

export default function DialogComponent(props) {

  const component = useRef(null)
  let timer = useRef(null)

  const [visible, setVisible] = useState(false)

  // * открытие диалога
  useEffect(() => {
    if (props.visible) {
      timer = setTimeout(() => {
        setVisible(true)
        clearTimeout(timer)
      }, 150)
    } 
  }, [props])

  // * закрытие диалога
  const handleClose = () => {
    setVisible(false)  
    timer = setTimeout(() => {
      props.onClose()
      clearTimeout(timer)
    }, 150)
  }

  // * подтверждение диалога
  const handleApply = () => {
    setVisible(false)
    timer = setTimeout(() => {
      props.onApply()
      clearTimeout(timer)
    }, 150)
  }

  if (!props.visible) {
    return <></>
  }

  return (
    <>
      <div className="dialog-wrapper" ref={component} data-visible={visible} onClick={handleClose}/>
      <div className={ props.classes ? 'dialog ' + props.classes : 'dialog'} data-visible={visible}>
        <div className="dialog__header">
          <p className="dialog__title">{ props.title }</p>
          <button className='btn-icon' onClick={handleClose}>
            <svg viewBox="0 0 24 24">
              <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
            </svg>
          </button>
        </div>
        <div className="dialog__content">
          {
            props.children
          }
        </div>
        {
          props.noActions
            ? <></>
            : <div className="dialog__actions">
                <button className='btn' onClick={handleClose}>Отмена</button>
                <button className='btn' onClick={handleApply}>{ props.submitbtn }</button>
              </div>
        }
      </div>
    </>
  )
}