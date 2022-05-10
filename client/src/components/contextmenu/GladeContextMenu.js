
import { useState, useEffect, useRef } from "react"
import { useDispatch } from "react-redux"
import { setContextMenuHidden } from "../../store/contextReducer"

import './GladeContextMenu.scss'

export const GladeContextMenu = (props) => {

  const [controls, setControls] = useState([])
  const [actions, setActions] = useState([])
  const [styles, setStyles] = useState({ })
  
  const [visible, setVisible] = useState(false)

  const dispatch = useDispatch()

  useEffect(() => {
    setControls(props.controls)
    setActions(props.actions)
    const notEnoughtXSpace = window.innerWidth <= +props.position.left + 250 + (props.horizontalOffset ? +props.horizontalOffset : 0)
    const notEnoughtYSpace = window.innerHeight <= +props.position.top + (props.fixedHeight === true ? 200 : 51 * props.controls.length) + (props.verticalOffset ? +props.verticalOffset : 0)
    setStyles({ 
      left: props.position.left,
      top: props.position.top,
      height: `${props.fixedHeight === true ? '200px' : `calc(51px * ${props.controls.length })` }`,
      transform: `
        ${
          props.horizontalOffset 
            ? notEnoughtXSpace
              ? `translateX(-100%)`
              : `translateX(${props.horizontalOffset}px)` 
            : notEnoughtXSpace
              ? `translateX(-100%)`
              : ''
        } 
        ${
          props.verticalOffset 
            ? notEnoughtYSpace
              ? `translateY(-100%)`
              : `translateY(${props.verticalOffset}px)` 
            : notEnoughtYSpace
              ? `translateY(-100%)`
              : ''
        }
      `,
      overflow: `${props.fixedHeight === true ? 'auto' : 'hidden' }`
    })
  }, [props])

  useEffect(() => {
    if (props.visible) {
      setTimeout(() => setVisible(true), 50)
    } else {
      setVisible(false)
    } 
  }, [props])

  if (!props.visible) {
    return <></>
  }

  const handleSetHidden = () => {
    dispatch(setContextMenuHidden())
  }

  return (
    <>
      <div className="gladecontext-wrapper" onClick={handleSetHidden} />
      <div className='gladecontext-popup' data-visible={visible} style={styles}>
        {
          controls && controls.length > 0
            ? controls.map((item, index) => {
              return <p className="gladecontext-popup__control" key={index} onClick={actions[index]}>{ item }</p>
            })
            : null
        }
      </div>
    </>
  )
}