import { fetchGroupsError, fetchGroupsPending, fetchGroupsSuccess } from '../store/groupsReducer';
import { getGroups } from './../api/groups.api';

export const fetchGroups = (payload) => {
  return dispatch => {
    
    dispatch(fetchGroupsPending())

    getGroups({ ...payload }).then(channels => {
      if (!channels || channels.length === 0) {
        return dispatch(fetchGroupsError())
      }

      dispatch(fetchGroupsSuccess(channels))
    })
  }
}