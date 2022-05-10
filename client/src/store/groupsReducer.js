
const defaultState = {
  groups: [],
  status: "idle" | "pending" | "success" | "failed" 
}

export const FETCH_GROUPS_PENDING = 'FETCH_GROUPS_PENDING'
export const FETCH_GROUPS_SUCCESS = 'FETCH_GROUPS_SUCCESS'
export const FETCH_GROUPS_ERROR = 'FETCH_GROUPS_ERROR'
export const STATUS_IDLE = 'STATUS_IDLE'

export default function groupsReducer(state = defaultState, action) {
  switch (action.type) {
    case FETCH_GROUPS_PENDING:
      return { ...state, status: 'pending' }
    case FETCH_GROUPS_SUCCESS:
      return { ...state, status: 'success', groups: [ ...action.payload ] }
    case FETCH_GROUPS_ERROR:
      return { ...state, status: 'failed', groups: [] }
    case STATUS_IDLE: 
      return { ...state, status: 'idle' }
    default:
      return state
  }
}

export const fetchGroupsPending = () => ({ type: FETCH_GROUPS_PENDING, payload: null })
export const fetchGroupsSuccess = payload => ({ type: FETCH_GROUPS_SUCCESS, payload })
export const fetchGroupsError = () => ({ type: FETCH_GROUPS_ERROR, payload: null })
export const statusIdle = () => ({ type: STATUS_IDLE, payload: null })
