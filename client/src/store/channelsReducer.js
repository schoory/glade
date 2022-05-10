
const defaultState = {
  channels: [],
  sections: [],
  status: "idle" | "pending" | "success" | "failed"
}

export const FETCH_CHANNELS_PENDING = 'FETCH_CHANNELS_PENDING'
export const FETCH_CHANNELS_SUCCESS = 'FETCH_CHANNELS_SUCCESS'
export const FETCH_CHANNELS_ERROR = 'FETCH_CHANNELS_ERROR'
export const FETCH_SECTIONS_PENDING = 'FETCH_SECTIONS_PENDING'
export const FETCH_SECTIONS_SUCCESS = 'FETCH_SECTIONS_SUCCESS'
export const FETCH_SECTIONS_ERROR = 'FETCH_SECTIONS_ERROR'
export const STATUS_IDLE = 'STATUS_IDLE'

export default function userReducer(state = defaultState, action) {
  switch (action.type) {
    case FETCH_CHANNELS_PENDING:
      return { ...state, status: 'pending' }
    case FETCH_CHANNELS_SUCCESS:
      return { ...state, status: 'success', channels: [ ...action.payload ] }
    case FETCH_CHANNELS_ERROR:
      return { ...state, status: 'failed', channels: [] }
    case FETCH_SECTIONS_PENDING:
      return { ...state, status: 'pending' }
    case FETCH_SECTIONS_SUCCESS:
      return { ...state, status: 'success', sections: [ ...action.payload ] }
    case FETCH_SECTIONS_ERROR:
      return { ...state, status: 'failed', sections: [] }
    case STATUS_IDLE: 
      return { ...state, status: 'idle' }
    default:
      return state
  }
}

export const fetchChannelsPending = () => ({ type: FETCH_CHANNELS_PENDING, payload: null })
export const fetchChannelsSuccess = payload => ({ type: FETCH_CHANNELS_SUCCESS, payload })
export const fetchChannelsError = () => ({ type: FETCH_CHANNELS_ERROR, payload: null })
export const fetchSectionsPending = () => ({ type: FETCH_SECTIONS_PENDING, payload: null })
export const fetchSectionsSuccess = payload => ({ type: FETCH_SECTIONS_SUCCESS, payload })
export const fetchSectionsError = () => ({ type: FETCH_SECTIONS_ERROR, payload: null })
export const statusIdle = () => ({ type: STATUS_IDLE, payload: null })
