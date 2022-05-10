
import { useRef, useEffect } from 'react';
import { io } from 'socket.io-client'
import { useDispatch, useSelector } from 'react-redux';
import { fetchProfiles } from './../asyncActions/profiles';
import { fetchChannels } from './../asyncActions/channels';
import { fetchGroups } from './../asyncActions/groups';
import { fetchUser } from './../asyncActions/user';
import { fetchMessages } from '../asyncActions/messages';

export const useSocket = () => {

  const dispatch = useDispatch()

  const socket = useSelector(state => state.socket.socket)
  const user = useSelector(state => state.user.user)
  const rooms = useRef([])

  // LISTENERS

  const usersListener = () => {
    dispatch(fetchUser({ token: user.token, refreshToken: user.refreshToken }))
    dispatch(fetchProfiles({ token: user.token, refreshToken: user.refreshToken }))
  }

  const channelsListener = () => {
    dispatch(fetchChannels({ userId: user.id, token: user.token, refreshToken: user.refreshToken }))
  }

  const groupsListener = () => {
    dispatch(fetchUser({ token: user.token, refreshToken: user.refreshToken }))
    dispatch(fetchChannels({ userId: user.id, token: user.token, refreshToken: user.refreshToken }))
    dispatch(fetchGroups({ token: user.token, refreshToken: user.refreshToken }))
  }

  // CONNECTION

  // * подключение к комнате
  const joinRoom = (roomId) => {
    if (socket) {
      socket.emit('join-room', roomId)
      rooms.current.push(roomId)
    }
  }
  
  // * отключение от комнаты
  const leaveRoom = (roomId) => {
    if (socket) {
      socket.emit('leave-room', roomId)
      rooms.current.splice(rooms.current.indexOf(roomId), 1)
    }
  }

  // * добавление обработчиков событий
  const addHandlers = () => {
    socket.on('users-update', usersListener)
    socket.on('channels-update', channelsListener)
    socket.on('groups-update', groupsListener)
  }

  // * отключение обработчиков событий
  const removeHandlers = () => {
    socket.removeListener('users-update', usersListener)
    socket.removeListener('channels-update', channelsListener)
    socket.removeListener('groups-update', groupsListener)
  }

  // EMITTERS

  // * отправка сообщения о изменениях в списке пользователей
  const usersChanged = (roomId) => {
    if (socket.current) {
      socket.current.emit('users-changed', roomId)
    }
  }

  // * отправка сообщения о изменениях в списке каналов
  const channelsChanged = (roomId) => {
    if (socket.current) {
      socket.current.emit('channels-changed', roomId)
    }
  }

  // * отправка сообщения о изменениях в списке групп
  const groupsChanged = (roomId) => {
    if (socket.current) {
      socket.current.emit('groups-changed', roomId)
    }
  }

  return { 
    socket, 
    usersChanged, 
    channelsChanged, 
    groupsChanged,
    joinRoom,
    leaveRoom,
    addHandlers,
    removeHandlers
  }

}