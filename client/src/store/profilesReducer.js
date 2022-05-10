
const defaultState = {
  profiles: [],
  status: "idle" | "pending" | "success" | "failed" 
}

export const FETCH_PROFILES_PENDING = 'FETCH_PROFILES_PENDING'
export const FETCH_PROFILES_SUCCESS = 'FETCH_PROFILES_SUCCESS'
export const FETCH_PROFILES_FAILED = 'FETCH_PROFILES_FAILED'
export const STATUS_IDLE = 'STATUS_IDLE'

export default function profilesReducer(state = defaultState, action) {
  switch (action.type) {
    case FETCH_PROFILES_PENDING:
      return { ...state, status: 'pending' }
    case FETCH_PROFILES_SUCCESS:
      return { ...state, status: 'success', profiles: [ ...action.payload ] }
    case FETCH_PROFILES_FAILED:
      return { ...state, status: 'failed', profiles: [] }
    case STATUS_IDLE: 
      return { ...state, status: 'idle' }
    default:
      return state
  }
}

export const fetchProfilesPending = () => ({ type: FETCH_PROFILES_PENDING, payload: null })
export const fetchProfilesSuccess = payload => ({ type: FETCH_PROFILES_SUCCESS, payload })
export const fetchProfilesError = () => ({ type: FETCH_PROFILES_FAILED, payload: null })
export const statusIdle = () => ({ type: STATUS_IDLE, payload: null })
