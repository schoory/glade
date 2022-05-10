
import { useState } from 'react'
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

import './TabComponent.scss'

export default function TabComponent(props) {

  const navigate = useNavigate()
  const breakpoints = useSelector(state => state.breakpoints)

  const [tabNames, setTabNames] = useState(
    props.tabs.reduce((prev, item) => {
      prev.push(item.name)
      return prev
    }, [])
  )
  const [currentTab, setCurrentTab] = useState(tabNames[0])
  const [currentWindow, setCurrentWindow] = useState('menu')

  // * смена вкладки меню
  const handleTabChange = (currentTarget) => {
    const tab = currentTarget.getAttribute('data-name')
    setCurrentTab(tab)
    setCurrentWindow('tab')
  }

  // * нажатие на кнопку Сохранить
  const handleApply = () => {
    props.onApply()
  }

  // * нажатие на кнопку Отмена
  const handleClose = () => {
    if (props.onClose) {
      props.onClose()
    } else {
      navigate('/channels')
    }
  }

  return (
    <div className="tabs"> 
      {
        // отображение меню 
        // если экраны sm или xs и пользователь выбирает раздел меню
        // или если экраны больше sm и xs
        ((breakpoints.sm || breakpoints.xs) && currentWindow === 'menu') || (!breakpoints.sm && !breakpoints.xs)
          ? (
            <div className="tabs__menu">
              {
                props.title
                  ? <p className='tabs__menu-title'>{props.title}</p> : <></>
              }
              {
                props.tabs.map((item, index) => {
                  return (
                    <button 
                      className={
                        currentTab === item.name
                          ? "tabs__menu-item tabs__menu-item_active"
                          : "tabs__menu-item" 
                      }
                      data-name={item.name} 
                      key={index}
                      onClick={({ currentTarget }) => { 
                        if (item.onclick) {
                          item.onclick()
                        } else {
                          handleTabChange(currentTarget)
                        }
                      }}
                    >
                      {item.label}
                    </button>
                  )
                })
              }
              {
                // отображение кнопки сохранения в меню, если экраны lg, md, sm, xs
                breakpoints.lg || breakpoints.md || breakpoints.sm || breakpoints.xs
                  ? (
                    <div className="tabs__menu-controls">
                      {
                        // кнопка Отмена пропадает при экранах меньше md
                        breakpoints.lg || breakpoints.md
                          ? (
                            <button className="btn" onClick={handleClose}>Отмена</button>
                          )
                          : <></>
                      }
                      <button className={breakpoints.sm || breakpoints.xs ? "btn-icon" : "btn"} onClick={handleApply}>
                        {
                          // при экранах lg или md отображается кнопка Сохранить
                          breakpoints.lg || breakpoints.md
                            ? 'Сохранить'
                            // при экранах sm или xs отображается иконка сохранения
                            : breakpoints.sm || breakpoints.xs 
                              ? (
                                <svg viewBox="0 0 24 24">
                                  <path fill="currentColor" d="M15,9H5V5H15M12,19A3,3 0 0,1 9,16A3,3 0 0,1 12,13A3,3 0 0,1 15,16A3,3 0 0,1 12,19M17,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V7L17,3Z" />
                                </svg>
                              )
                              : <></>
                        }
                      </button>
                    </div>
                  )
                  : <></>
              }
            </div>
          )
          : <></>
      }
      
      <div className="tabs__tab">
        {
          // при экрана sm или xs отображение кнопки Назад
          breakpoints.sm || breakpoints.xs
            ? (
              <button className="tabs__tab-back btn-icon" onClick={() => setCurrentWindow('menu')}>
                <svg viewBox="0 0 24 24">
                  <path fill="currentColor" d="M15.41,16.58L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.58Z" />
                </svg>
              </button>
            )
            : <></>
        }
        <div className="tabs__tab-wrapper">
          { props[currentTab]() } 
          {
            // при экранах xxl или xl отображение кнопок на вкладке
            breakpoints.xxl || breakpoints.xl 
              ? (
                <div className="tabs__controls">
                  <button className="btn" onClick={handleClose}>Отмена</button>
                  <button className="btn" onClick={handleApply}>Сохранить</button>
                </div>
              )
              : <></>
          }
        </div>
      </div>
    </div>
  )
}