
const defaultState = {
  user: null, 
  status: "idle" | "pending" | "failed" | "loggedin" | "loggedout"
}

export const FETCH_USER_PENDING = 'FETCH_USER_PENDING'
export const FETCH_USER_SUCCESS = 'FETCH_USER_SUCCESS'
export const FETCH_USER_ERROR = 'FETCH_USER_ERROR'
export const LOGOUT_USER = 'LOGOUT_USER'
export const STATUS_IDLE = 'STATUS_IDLE'

export default function userReducer(state = defaultState, action) {
  switch (action.type) {
    case FETCH_USER_PENDING:
      return { ...state, status: 'pending' }
    case FETCH_USER_SUCCESS:
      return { ...state, status: 'loggedin', user: { ...action.payload } }
    case FETCH_USER_ERROR:
      return { ...state, status: 'failed', user: null }
    case LOGOUT_USER:
      return { ...state, status: 'loggedout', user: null }
    case STATUS_IDLE: 
      return { ...state, status: 'idle' }
    default:
      return state
  }
}

export const fetchUserPending = () => ({ type: FETCH_USER_PENDING, payload: null })
export const fetchUserSuccess = payload => ({ type: FETCH_USER_SUCCESS, payload })
export const logoutUser = () => ({ type: LOGOUT_USER, payload: null })
export const fetchUserError = () => ({ type: FETCH_USER_ERROR, payload: null })
export const statusIdle = () => ({ type: STATUS_IDLE, payload: null })
