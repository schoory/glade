
const defaultState = {
  visible: false,
  delay: 3000,
  text: '',
  style: ''
}

export const SET_ALERT_VISIBLE = 'SET_ALERT_VISIBLE'
export const SET_ALERT_HIDDEN = 'SET_ALERT_HIDDEN'

export default function alertReducer(state = defaultState, action) {
  switch (action.type) {
    case SET_ALERT_VISIBLE:
      return { ...state, visible: true, text: action.payload.text, style: action.payload.style, delay: action.payload.delay }
    case SET_ALERT_HIDDEN:
      return { ...state, visible: false, text: '', style: '', delay: 3000 }
    default:
      return state
  }
}

export const setAlertVisible = (payload) => ({ type: SET_ALERT_VISIBLE, payload: payload })
export const setAlertHidden = () => ({ type: SET_ALERT_HIDDEN })
