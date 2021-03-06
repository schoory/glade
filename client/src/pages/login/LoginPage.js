
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchUser } from '../../asyncActions/user';
import './LoginPage.scss'

export const LoginPage = () => {

  const loginStatus = useSelector(state => state.user.status)

  const dispatch = useDispatch()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassowrd] = useState('')

  // * переадресация на страницу каналов
  useEffect(() => {
    if (loginStatus === 'loggedin') {
      navigate('/channels')
    }
  }, [loginStatus])

  // * логин через инпуты
  const handleKeyDown = ({ key }) => {
    if (key === 'Enter' && email && password) {
      handleLogin()
    }
  }

  // * вход в систему
  const handleLogin = () => {
    dispatch(fetchUser({ email, password }))
  }

  return (
    <div className="login">

      <div className="login__form">
        <div className="login__logo">
          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M32 6C33.6569 6 35 4.65685 35 3C35 1.34315 33.6569 0 32 0C30.3431 0 29 1.34315 29 3C29 4.65685 30.3431 6 32 6ZM32 64C33.6569 64 35 62.6569 35 61C35 59.3431 33.6569 58 32 58C30.3431 58 29 59.3431 29 61C29 62.6569 30.3431 64 32 64ZM13.6152 9.37258C14.7868 10.5442 14.7868 12.4437 13.6152 13.6152C12.4436 14.7868 10.5442 14.7868 9.37258 13.6152C8.20101 12.4437 8.20101 10.5442 9.37258 9.37258C10.5442 8.20101 12.4436 8.20101 13.6152 9.37258ZM54.6274 54.6274C55.799 53.4558 55.799 51.5563 54.6274 50.3848C53.4558 49.2132 51.5564 49.2132 50.3848 50.3848C49.2132 51.5563 49.2132 53.4558 50.3848 54.6274C51.5564 55.799 53.4558 55.799 54.6274 54.6274ZM3 29C4.65685 29 6 30.3431 6 32C6 33.6569 4.65685 35 3 35C1.34315 35 0 33.6569 0 32C0 30.3431 1.34315 29 3 29ZM64 32C64 30.3431 62.6569 29 61 29C59.3431 29 58 30.3431 58 32C58 33.6569 59.3431 35 61 35C62.6569 35 64 33.6569 64 32ZM27 13C27 10.2386 29.2386 8 32 8C34.7614 8 37 10.2386 37 13V15.7472C38.0305 16.0639 39.0193 16.4758 39.9561 16.9728L41.8995 15.0294C42.6956 14.2334 43.6933 13.7618 44.7283 13.6149L36.4194 21.9238C35.3569 21.4571 34.2065 21.1536 33 21.0448V19C33 18.4477 32.5523 18 32 18C31.4477 18 31 18.4477 31 19V21.0448C28.7132 21.2509 26.6283 22.1568 24.9609 23.5467L23.5147 22.1005C23.1242 21.71 22.491 21.71 22.1005 22.1005C21.71 22.491 21.71 23.1242 22.1005 23.5147L23.5467 24.9609C22.1568 26.6283 21.2509 28.7132 21.0448 31H19C18.4477 31 18 31.4477 18 32C18 32.5523 18.4477 33 19 33H21.0448C21.1536 34.2065 21.4571 35.3569 21.9238 36.4194L13.6149 44.7283C13.7618 43.6933 14.2334 42.6956 15.0294 41.8995L16.9728 39.9561C16.4758 39.0193 16.0639 38.0305 15.7472 37H13C10.2386 37 8 34.7614 8 32C8 29.2386 10.2386 27 13 27H15.7472C16.0639 25.9695 16.4758 24.9807 16.9728 24.0439L15.0294 22.1005C13.0768 20.1479 13.0768 16.9821 15.0294 15.0294C16.9821 13.0768 20.1479 13.0768 22.1005 15.0294L24.0439 16.9728C24.9807 16.4758 25.9695 16.0639 27 15.7472V13ZM19.2717 50.3851L27.5806 42.0762C28.6431 42.5429 29.7935 42.8464 31 42.9552V45C31 45.5523 31.4477 46 32 46C32.5523 46 33 45.5523 33 45V42.9552C35.2868 42.7491 37.3717 41.8432 39.0391 40.4533L40.4853 41.8995C40.8758 42.29 41.509 42.29 41.8995 41.8995C42.29 41.509 42.29 40.8758 41.8995 40.4853L40.4533 39.0391C41.8432 37.3717 42.7491 35.2868 42.9552 33H45C45.5523 33 46 32.5523 46 32C46 31.4477 45.5523 31 45 31H42.9552C42.8464 29.7935 42.5429 28.6431 42.0762 27.5806L50.3851 19.2717C50.2382 20.3067 49.7666 21.3044 48.9706 22.1005L47.0272 24.0439C47.5242 24.9807 47.9361 25.9695 48.2528 27H51C53.7614 27 56 29.2386 56 32C56 34.7614 53.7614 37 51 37H48.2528C47.9361 38.0305 47.5242 39.0193 47.0272 39.9561L48.9706 41.8995C50.9232 43.8521 50.9232 47.0179 48.9706 48.9706C47.0179 50.9232 43.8521 50.9232 41.8995 48.9706L39.9561 47.0272C39.0193 47.5242 38.0305 47.9361 37 48.2528V51C37 53.7614 34.7614 56 32 56C29.2386 56 27 53.7614 27 51V48.2528C25.9695 47.9361 24.9807 47.5242 24.0439 47.0272L22.1005 48.9706C21.3044 49.7666 20.3067 50.2382 19.2717 50.3851Z"/>
          </svg>
          <p>Glade</p>
        </div>
        {
          loginStatus === 'failed'
            ? (
              <div className='login__message-wrapper'>
                <div className="login__message">
                  Пожалуйста введите верный логин и пароль. <br /> Если у вас есть проблемы со входом в ваш аккаунт, обратитесь к администратору системы.
                </div>
              </div>
            )
            : <></>
        }
        <div className="login__title">
          Войдите в учетную запись
        </div>  
        <div className="login__controls">
          <div className="control">
            <p className="control-label">Логин</p>
            <input 
              type="text" 
              className='control-input' 
              value={email}
              onKeyDown={handleKeyDown}     
              onChange={({ target: { value } }) => setEmail(value)}         
            />
          </div>
          <div className="control">
            <p className="control-label">Пароль</p>
            <input 
              type="password" 
              className='control-input' 
              value={password}
              onKeyDown={handleKeyDown}
              onChange={({ target: { value } }) => setPassowrd(value)}
            />
          </div>
        </div>
        <div className="login__actions">
          <button 
            className='btn'
            onClick={() => {
              handleLogin()
            }}
            disabled={ (loginStatus === 'pending' || (!email || !password)) }
          >
            Войти
          </button>
        </div>
      </div>

      <div className="login__preview">

      </div>
      
    </div>
  )
}