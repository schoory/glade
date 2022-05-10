
const defaultState = {
  messages: [],
  messagesTotal: 0,
  messageNotifications: {},
  minIndex: -1,
  maxIndex: -1,
  status: "idle" | "pending" | "success" | "failed" 
}

export const FETCH_MESSAGES_PENDING = 'FETCH_MESSAGES_PENDING'
export const FETCH_MESSAGES_SUCCESS = 'FETCH_MESSAGES_SUCCESS'
export const FETCH_MESSAGES_ERROR = 'FETCH_MESSAGES_ERROR'
export const FETCH_UNREADED_PENDING = 'FETCH_UNREADED_PENDING'
export const FETCH_UNREADED_SUCCESS = 'FETCH_UNREADED_SUCCESS'
export const FETCH_UNREADED_ERROR = 'FETCH_UNREADED_ERROR'
export const FETCH_ALL_UNREADED_PENDING = 'FETCH_ALL_UNREADED_PENDING'
export const FETCH_ALL_UNREADED_SUCCESS = 'FETCH_ALL_UNREADED_SUCCESS'
export const FETCH_ALL_UNREADED_ERROR = 'FETCH_ALL_UNREADED_ERROR'
export const STATUS_IDLE = 'STATUS_IDLE'

export default function messagesReducer(state = defaultState, action) {
  switch (action.type) {
    case FETCH_MESSAGES_PENDING:
      if (action.payload.cleanOnFetch) {
        return { ...state, status: 'pending', messages: [] }
      } else {
        return { ...state, status: 'pending' }
      }
    case FETCH_MESSAGES_SUCCESS:
      return { 
        ...state, 
        status: 'success', 
        messages: [ ...action.payload.messages ], 
        messagesTotal: action.payload.total, 
        minIndex: action.payload.minIndex, 
        maxIndex: action.payload.maxIndex 
    }
    case FETCH_MESSAGES_ERROR:
      return { ...state, status: 'failed', messages: [], minIndex: -1, maxIndex: -1 }
    case FETCH_UNREADED_PENDING:
      return { ...state, status: 'pending' }
    case FETCH_UNREADED_SUCCESS:
      return { ...state, status: 'success', messageNotifications: { ...state.messageNotifications, [action.payload.channel]: action.payload.count } }
    case FETCH_UNREADED_ERROR:
      return { ...state, status: 'failed', messageNotifications: [] }
    case FETCH_ALL_UNREADED_PENDING:
      return { ...state, status: 'pending' }
    case FETCH_ALL_UNREADED_SUCCESS:
      return { ...state, status: 'success', messageNotifications: { ...action.payload } }
    case FETCH_ALL_UNREADED_ERROR:
      return { ...state, status: 'failed', messageNotifications: [] }
    case STATUS_IDLE: 
      return { ...state, status: 'idle' }
    default:
      return state
  }
}

export const fetchMessagesPending = payload => ({ type: FETCH_MESSAGES_PENDING, payload })
export const fetchMessagesSuccess = payload => ({ type: FETCH_MESSAGES_SUCCESS, payload })
export const fetchMessagesError = () => ({ type: FETCH_MESSAGES_ERROR, payload: null })
export const fetchUnreadedPending = () => ({ type: FETCH_UNREADED_PENDING, payload: null })
export const fetchUnreadedSuccess = payload => ({ type: FETCH_UNREADED_SUCCESS, payload })
export const fetchUnreadedError = () => ({ type: FETCH_UNREADED_ERROR, payload: null })
export const fetchAllUnreadedPending = () => ({ type: FETCH_ALL_UNREADED_PENDING, payload: null })
export const fetchAllUnreadedSuccess = payload => ({ type: FETCH_ALL_UNREADED_SUCCESS, payload })
export const fetchAllUnreadedError = () => ({ type: FETCH_ALL_UNREADED_ERROR, payload: null })
export const statusIdle = () => ({ type: STATUS_IDLE, payload: null })
