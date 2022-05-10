
const defaultState = {
  xs: false,
  sm: false,
  md: false,
  lg: false,
  xl: false,
  xxl: true
}

export const SET_XS = 'SET_XS'
export const SET_SM = 'SET_SM'
export const SET_MD = 'SET_MD'
export const SET_LG = 'SET_LG'
export const SET_XL = 'SET_XL'
export const SET_XXL = 'SET_XXL'

export default function breakpointsReducer(state = defaultState, action) {
  switch (action.type) {
    case SET_XS:
      return { ...state, xs: true, sm: false, md: false, lg: false, xl: false, xxl: false }
    case SET_SM:
      return { ...state, xs: false, sm: true, md: false, lg: false, xl: false, xxl: false }
    case SET_MD:
      return { ...state, xs: false, sm: false, md: true, lg: false, xl: false, xxl: false }
    case SET_LG:
      return { ...state, xs: false, sm: false, md: false, lg: true, xl: false, xxl: false }
    case SET_XL:
      return { ...state, xs: false, sm: false, md: false, lg: false, xl: true, xxl: false }
    case SET_XXL: 
      return { ...state, xs: false, sm: false, md: false, lg: false, xl: false, xxl: true }
    default:
      return state
  }
}

export const setXS = () => ({ type: SET_XS })
export const setSM = () => ({ type: SET_SM })
export const setMD = () => ({ type: SET_MD })
export const setLG = () => ({ type: SET_LG })
export const setXL = () => ({ type: SET_XL })
export const setXXL = () => ({ type: SET_XXL })
