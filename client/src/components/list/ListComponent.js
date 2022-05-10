
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { HexColorInput, HexColorPicker } from 'react-colorful'
import DialogComponent from '../dialog/DialogComponent';

import './ListComponent.scss'
import { setContextMenuHidden, setContextMenuVisible } from '../../store/contextReducer';

export default function TabComponent(props) {

  const navigate = useNavigate()
  const dispatch = useDispatch()
  const breakpoints = useSelector(state => state.breakpoints)

  const [mouseOverItem, setMouseOverItem] = useState({ visible: false, id: '' })
  const [dialogPalette, setDialogPalette] = useState({ visible: false, color: '', itemId: '' }) // диалоговое окно выбора цвета группы

  const [items, setItems] = useState([])

  useEffect(() => {
    setItems([ ...props.items ])
  }, [props])

  // * изменение цвета элемента
  const handleColorChange = (itemId, color) => {
    const array = [...items]
    if (itemId && color) {
      array.find(currentItem => currentItem.id === itemId).color = color
    } else {
      array.find(currentItem => currentItem.id === dialogPalette.itemId).color = dialogPalette.color
    }
    setDialogPalette({ visible: false, itemId: '', color: '' })
    props.onColorChange(array) 
  }

  const handleMouseEnterItem = (event) => {
    const id = event.currentTarget.getAttribute('data-id')
    setMouseOverItem({ visible: true, id: id })
  }

  const handleMouseLeaveItem = () => {
    setMouseOverItem({ visible: false, id: '' })
  }

  // * открытие контекста элемента
  const handleOpenItemContext = ({ currentTarget }) => {
    const itemId = currentTarget.getAttribute('data-id')
    let controls = []
    let actions = []
    props.itemControls.context.forEach((item, index) => {
      controls.push(item)
      actions.push(() => props.itemControls.contextActions[index](itemId))
    })
    dispatch(setContextMenuVisible({ 
      pos: { left: currentTarget.getBoundingClientRect().left, top: currentTarget.getBoundingClientRect().top },
      controls: controls,
      actions: actions,
      horizontalOffset: currentTarget.getBoundingClientRect().width
    }))
  }

  return (
    <>
      <div className="list">
        <div className="list__controls">
          {
            props.search 
              ? <input 
                type="text" 
                placeholder={props.searchPlaceholder ? props.searchPlaceholder : 'Поиск ...'} 
                className="control-input" 
                onChange={({ target: { value } }) => {
                  setItems([ ...props.items.filter(item => item.name.toLowerCase().indexOf(value.toLowerCase()) !== -1 ) ])
                }}
              />
              : <></>
          }
          {
            props.controls.map((item, index) => {
              return <button className='btn btn_contained' key={index} onClick={props[item.name]}>{item.label}</button>
            })
          }
        </div>
        <div className="list__title">
          <p>{props.title}</p>
        </div>
        <div className="list__items">
          {
            items.length === 0 
              ? <p className='list__empty'>{props.itemsEmptyString}</p>
              : (
                <>
                {
                  items.map((item, index) => {
                    return (
                      <div className="list__item" style={props.itemStyle} key={index} data-id={item.id} onMouseEnter={handleMouseEnterItem} onMouseLeave={handleMouseLeaveItem}>
                        {
                          'avatar' in item
                            ? <img 
                                src={item.avatar ? `${document.location.origin}/i/${item.avatar}` : `${document.location.origin}/i/avatar-sample.jpg`} 
                                alt="" 
                                className='list__item-avatar' 
                              />
                            : <></>
                        }
                        <p className='list__item-name'>{item.name}</p>
                        {
                          props.quantity
                            ? <p className="list__item-quantity">{props.quantity[index]}</p>
                            : <></>
                        }
                        {
                          props.coloredItems // если элемент с возможностью изменения цвета вывод пикера цвета
                            ? (
                              <div className='list__item-color'>
                                <div 
                                  className="list__item-color-preview" 
                                  data-color={item.color ? item.color : '#000'}
                                  style={{ background: item.color ? item.color : '#000' }} // вывод квадрата с цветом элемента
                                  onClick={({ currentTarget }) => { // при клике на элемент выводится диалоговое окно с палитрой цветов
                                    const color = currentTarget.getAttribute('data-color')
                                    const itemId = currentTarget.parentNode.parentNode.getAttribute('data-id')
                                    setDialogPalette({ visible: true, color: color, itemId: itemId })
                                  }} 
                                />
                                <HexColorInput  // input для ввода цвета
                                  className='control-input control-input_color' 
                                  placeholder='000' 
                                  color={item.color ? item.color : '#000'}
                                  onChange={(value) => { 
                                    const itemId = item.id
                                    handleColorChange(itemId, value) 
                                  }} 
                                />
                              </div>
                            )
                            : <></>
                        }
                        <div className="list__item-controls">
                        {
                          (mouseOverItem.visible && mouseOverItem.id === item.id.toString()) || (breakpoints.md || breakpoints.sm || breakpoints.xs)
                            ? (
                              props.itemControls
                                ? props.itemControls.context 
                                  ? <button className='btn-icon' data-id={item.id} onClick={handleOpenItemContext}>{props.itemControls.control}</button>
                                  : <button className='btn-icon'>{ props.itemControls.control }</button>
                                : <></>
                            )
                            : <></>
                        }
                        </div>
                      </div>
                    )
                  })
                }
                </>
              )
          }
        </div>
        
      </div>

      {/* Диалог палитры цветов */}
      <DialogComponent
        title='Выберите цвет группы'
        classes='dialog_fit'
        submitbtn='Сохранить'
        visible={dialogPalette.visible}
        onClose={() => setDialogPalette({ visible: false, color: '' })}
        onApply={handleColorChange}
      >
        <div className='dialog__colorpicker'>
          <HexColorPicker color={dialogPalette.color} onChange={(value) => setDialogPalette({ ...dialogPalette, color: value })} />
        </div>
      </DialogComponent>
    </>
  )
}