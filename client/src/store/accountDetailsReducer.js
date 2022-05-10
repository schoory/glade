
const defaultState = {
  visible: false,
  pos: { left: 0, top: 0 },
  profile: null
}

export const SET_ACCOUNT_DETAILS_VISIBLE = 'SET_ACCOUNT_DETAILS_VISIBLE'
export const SET_ACCOUNT_DETAILS_HIDDEN = 'SET_ACCOUNT_DETAILS_HIDDEN'

export default function accountDetailsReducer(state = defaultState, action) {
  switch (action.type) {
    case SET_ACCOUNT_DETAILS_VISIBLE:
      return { ...state, visible: true, pos: action.payload.pos, profile: action.payload.profile }
    case SET_ACCOUNT_DETAILS_HIDDEN:
      return { ...state, visible: false, pos: { left: 0, top: 0 }, profile: null }
    default:
      return state
  }
}

export const setAccountDetailsVisible = (payload) => ({ type: SET_ACCOUNT_DETAILS_VISIBLE, payload: payload })
export const setAccountDetailsHidden = () => ({ type: SET_ACCOUNT_DETAILS_HIDDEN, payload: null })