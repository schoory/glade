import { format } from "date-fns"
import { useEffect, useState } from "react"
import { useDispatch } from "react-redux"
import { setAccountDetailsHidden } from "../../store/accountDetailsReducer"

import './AccountDetails.scss'
import { GladeAvatarStatus } from './../avatarstatus/GladeAvatarStatus';


export const AccountDetail = (props) => {

  const [visible, setVisible] = useState(false)

  const dispatch = useDispatch()

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
    dispatch(setAccountDetailsHidden())
  }

  return (
    <>
      <div className="account-details-wrapper" onClick={handleSetHidden} />
      <div className='account-details' data-visible={visible} style={{ left: props.pos.left, top: props.pos.top }}>
        <div className="account-details__header">
          <GladeAvatarStatus profile={props.profile} width={'30px'} height={'30px'} statusWidth={'15px'} statusHeight={'15px'} />
          <div className="account-details__name">{ `${props.profile.first_name} ${props.profile.last_name}` }</div>
        </div>
        <div className="account-details__list">
          <div className="account-details__item">
            <p className="account-details__item-label">Электронная почта</p>
            <p className="account-details__item-value">{props.profile.email ? props.profile.email : 'Скрыто'}</p>
          </div>
          <div className="account-details__item">
            <p className="account-details__item-label">Номер телефона</p>
            <p className="account-details__item-value">{props.profile.phone ? props.profile.phone : 'Скрыто'}</p>
          </div>
          <div className="account-details__item">
            <p className="account-details__item-label">Дата рождения</p>
            <p className="account-details__item-value">{ props.profile.birth_date ? format(new Date(props.profile.birth_date), 'dd.MM.yyyy') : 'Скрыто' }</p>
          </div>
        </div>
      </div>
    </>
  )
}