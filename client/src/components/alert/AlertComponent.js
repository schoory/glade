
import { useEffect, useRef, useState } from 'react';

import './AlertComponent.scss'


export default function AlertComponent(props) {

  const component = useRef(null)
  let timer = useRef(null)

  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (props.visible) {
      setVisible(true)
      timer = setTimeout(() => {
        setVisible(false)
        clearTimeout(timer)
      }, props.delay - 150 || 2850 )
    } 
  }, [props])

  if (!props.visible) {
    return <></>
  }

  return (
    <div className={`alert alert__${props.style || 'success'}`} ref={component} data-visible={visible}>
      {
        props.children
      }
    </div>
  )

}