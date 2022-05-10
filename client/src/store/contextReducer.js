
const defaultState = {
  visible: false,
  pos: { left: 0, top: 0 },
  controls: [],
  actions: [],
  fixedHeight: false,
  horizontalOffset: '',
  verticalOffset: ''
}

export const SET_CONTEXT_VISIBLE = 'SET_CONTEXT_VISIBLE'
export const SET_CONTEXT_HIDDEN = 'SET_CONTEXT_HIDDEN'

export default function contextReducer(state = defaultState, action) {
  switch (action.type) {
    case SET_CONTEXT_VISIBLE:
      return { 
        ...state, 
        visible: true, 
        pos: action.payload.pos, 
        controls: action.payload.controls, 
        actions: action.payload.actions,
        fixedHeight: action.payload.fixedHeight && action.payload.fixedHeight === true ? true : false,
        horizontalOffset: action.payload.horizontalOffset ? action.payload.horizontalOffset : '',
        verticalOffset: action.payload.verticalOffset ? action.payload.verticalOffset : ''
      }
    case SET_CONTEXT_HIDDEN:
      return { ...state, visible: false, pos: { left: 0, top: 0 }, controls: [], actions: [], fixedHeight: false, horizontalOffset: '', verticalOffset: '' }
    default:
      return state
  }
}

export const setContextMenuVisible = (payload) => ({ type: SET_CONTEXT_VISIBLE, payload: payload })
export const setContextMenuHidden = () => ({ type: SET_CONTEXT_HIDDEN, payload: null })