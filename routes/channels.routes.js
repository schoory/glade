
const { Router } = require('express')
const router = Router()

const auth = require('../middleware/auth.middleware')

const client = require('../postgre')
const { response } = require('express')

// * получение всех каналов
router.post(
  '/getchannels',
  auth,
  async (req, res) => {
    try {
      const { userId } = req.body

      // проверка роли пользователя
      const userRole = (await client.query(
        `SELECT
          roles.name as role_name, users.group_id as group_id
        FROM 
          users
        LEFT JOIN roles ON users.role_id = roles.id
        WHERE users.id = ${userId}`
      )).rows[0]
      
      let isAdmin = (userRole.role_name === 'administrator')
      const groupId = userRole.group_id

      if (groupId) {
        const groupRole = (await client.query(
          `SELECT
            roles.name as role_name
          FROM 
            groups
          LEFT JOIN roles ON groups.role_id = roles.id
          WHERE groups.id = ${groupId}`
        )).rows[0]
        if (groupRole.role_name) {
          isAdmin = (userRole.role_name === 'administrator' || groupRole.role_name === 'administrator')
        }
      }
      
      let query = ''

      if (isAdmin) { // если администратор то вывод всех каналов
        query = 
        `
        SELECT
          channels.id, channels.name, channels.visibility_id AS visibility_id, visibility.name AS visibility,
          channels.group_ids, channels.channel_type_id AS type_id, channel_types.name AS type, 
          sections.name AS section, channels.section_id AS section_id, sections.position AS section_position
        FROM 
          channels
        LEFT JOIN visibility ON channels.visibility_id = visibility.id
        LEFT JOIN channel_types ON channels.channel_type_id = channel_types.id
        LEFT JOIN sections ON channels.section_id = sections.id
        `
      } else { 
        if (groupId) { // если пользователь, вывод всех публичных и приватных каналов, и тех, к которым есть доступ у группы пользователя
          query =
          `
          SELECT
            channels.id, channels.name, channels.visibility_id AS visibility_id, visibility.name AS visibility,
            channels.group_ids, channels.channel_type_id AS type_id, channel_types.name AS type,
            sections.name AS section, channels.section_id AS section_id, sections.position AS section_position
          FROM 
            channels
          LEFT JOIN visibility ON channels.visibility_id = visibility.id
          LEFT JOIN channel_types ON channels.channel_type_id = channel_types.id
          LEFT JOIN sections ON channels.section_id = sections.id
          WHERE visibility.name = 'public' OR visibility.name = 'private' OR ${groupId} = ANY(channels.group_ids)
          `
        } else { // если группы нет, вывод только публичных и приватных каналов 
          query = 
          `
          SELECT
            channels.id, channels.name, channels.visibility_id AS visibility_id, visibility.name AS visibility,
            channels.group_ids, channels.channel_type_id AS type_id, channel_types.name AS type,
            sections.name AS section, channels.section_id AS section_id, sections.position AS section_position
          FROM 
            channels
          LEFT JOIN visibility ON channels.visibility_id = visibility.id
          LEFT JOIN channel_types ON channels.channel_type_id = channel_types.id
          LEFT JOIN sections ON channels.section_id = sections.id
          WHERE visibility.name = 'public' OR visibility.name = 'private'
          `
        }
      }

      const channels = (await client.query(query)).rows // получение списка каналов

      if (!channels || channels.length === 0) {
        return res.status(200).json([])
      }

      return res.status(200).json([ ...channels ])
    } catch(e) {
      console.log('e', e)
      return res.status(500).json({ error: true, msg: 'Ошибка сервера' })
    }
  }
)

// * получение всех разделов
router.post(
  '/getsections',
  auth,
  async (req, res) => {
    try {
      const { userId } = req.body

      // проверка роли пользователя
      const userRole = (await client.query(
        `SELECT
          roles.name as role_name, users.group_id as group_id
        FROM 
          users
        LEFT JOIN roles ON users.role_id = roles.id
        WHERE users.id = ${userId}`
      )).rows[0]
      
      let isAdmin = (userRole.role_name === 'administrator')
      const groupId = userRole.group_id

      if (groupId) {
        const groupRole = (await client.query(
          `SELECT
            roles.name as role_name
          FROM 
            groups
          LEFT JOIN roles ON groups.role_id = roles.id
          WHERE groups.id = ${groupId}`
        )).rows[0]
        if (groupRole.role_name) {
          isAdmin = (userRole.role_name === 'administrator' || groupRole.role_name === 'administrator')
        }
      }
      
      let query = ''

      if (isAdmin) { // если администратор то вывод всех разделов
        query = 
        `
        SELECT
          sections.id, sections.name, sections.position
        FROM 
          sections
        `
      } else { 
        // если пользователь получение только тех разделов, в которых есть видимые каналы
        query =
        `
        SELECT DISTINCT
          sections.id, sections.name, sections.position
        FROM 
          channels
        LEFT JOIN sections ON channels.section_id = sections.id
        LEFT JOIN visibility ON channels.visibility_id = visibility.id
        WHERE (visibility.name = 'public' OR visibility.name = 'private' OR ${groupId} = ANY(channels.group_ids)) AND sections.id = channels.section_id
        `
      }
      
      const sections = (await client.query(query)).rows // получение списка разделов
      
      if (!sections || sections.length === 0) {
        return res.status(200).json([])
      }

      return res.status(200).json([ ...sections ])
    } catch(e) {
      console.log('e', e)
      return res.status(500).json({ error: true, msg: 'Ошибка сервера' })
    }
  }
)

// * создание нового канала 
router.post(
  '/newchannel',
  auth,
  async (req, res) => {
    try {
      const { userId, values } = req.body

      // проверка роли пользователя
      const roleQuery = await client.query(
        `SELECT
          roles.name
        FROM 
          roles
        LEFT JOIN users ON users.role_id = roles.id
        WHERE users.id = ${userId}`
      )
      const role = roleQuery.rows[0] // получение информации о пользователе
      if (!role) {
        return res.status(400).json({ error: true, msg: 'Ошибка получения полномочий пользователя' })
      }
      if (role.name !== 'administrator') {
        return res.status(400).json({ error: true, msg: 'Пользователь не имеет достаточно полномочий' })
      }

      // если название канала больше 64 символов - ошибка
      if (values.name.length > 64) return res.status(400).json({ error: true, msg: 'Название канала не может быть больше 64 символов' })

      // проверка на доступность название канала
      const channelQuery = await client.query(`SELECT * FROM channels WHERE name = '${values.name}'`)
      const channel = channelQuery.rows[0]
      if (channel) return res.status(400).json({ error: true, msg: 'Канал с таким названием уже существует' })

      // получение id видимости канала
      const visibilityQuery = await client.query(`SELECT id FROM visibility WHERE name = '${values.permissions}'`)
      const visibility = visibilityQuery.rows[0]
      if (!visibility) return res.status(400).json({ error: true, msg: 'Несуществующий тип видимости канала' })

      // получение id типа канала
      const typeQuery = await client.query(`SELECT id FROM channel_types WHERE name = '${values.type}'`)
      const type = typeQuery.rows[0]
      if (!type) return res.status(400).json({ error: true, msg: 'Несуществующий тип канала' })

      let query = `
        INSERT INTO 
          channels (id, name, channel_type_id, visibility_id, group_ids) 
        VALUES 
          (${new Date().getTime()}, '${values.name}', ${type.id}, ${visibility.id}`

      // получение id групп
      if (values.permissions !== 'public' && values.groups.length > 0) {

        const groupsString = values.groups.reduce((prev, item, index, array) => {
          if (index === array.length - 1) {
            prev += `'${item}'`
          } else {
            prev += `'${item}', `
          }
          return prev
        }, '')
        const groupsQuery = await client.query(`SELECT id FROM groups WHERE name IN (${groupsString})`)
        const groups = groupsQuery.rows.reduce((prev, item) => {
          prev.push(`${item.id}`)
          return prev
        }, [])

        query += `, ARRAY[${groups.join(', ')}]` // добавление id групп к запросу

      } else {
        query += ', NULL'
      }

      query += ')'

      await client.query(query)

      return res.status(200).json({ msg: 'Канал успешно создан' })

    } catch (e) {
      return res.status(500).json({ error: true, msg: 'Ошибка сервера' })
    }
  }
)

// * сохранение изменений в канале
router.post(
  '/savechannelsettings',
  auth,
  async (req, res) => {
    try {
      const { userId, channelId, values } = req.body

      // проверка роли пользователя
      const roleQuery = await client.query(
        `SELECT
          roles.name
        FROM 
          roles
        LEFT JOIN users ON users.role_id = roles.id
        WHERE users.id = ${userId}`
      )
      const role = roleQuery.rows[0] // получение информации о пользователе
      if (!role) {
        return res.status(400).json({ error: true, msg: 'Ошибка получения полномочий пользователя' })
      }
      if (role.name !== 'administrator') {
        return res.status(400).json({ error: true, msg: 'Пользователь не имеет достаточно полномочий' })
      }

      // если название канала больше 64 символов - ошибка
      if (values.name.length > 64) return res.status(400).json({ error: true, msg: 'Название канала не может быть больше 64 символов' })

      // проверка на доступность название канала
      const channelQuery = await client.query(`SELECT * FROM channels WHERE name = '${values.name}' AND id != ${channelId}`)
      const channel = channelQuery.rows[0]
      if (channel) return res.status(400).json({ error: true, msg: 'Канал с таким названием уже существует' })

      // получение id видимости канала
      const visibilityQuery = await client.query(`SELECT id FROM visibility WHERE name = '${values.permissions}'`)
      const visibility = visibilityQuery.rows[0]
      if (!visibility) return res.status(400).json({ error: true, msg: 'Несуществующий тип видимости канала' })

      // получение id типа канала
      const typeQuery = await client.query(`SELECT id FROM channel_types WHERE name = '${values.type}'`)
      const type = typeQuery.rows[0]
      if (!type) return res.status(400).json({ error: true, msg: 'Несуществующий тип канала' })

      let query = `
        UPDATE 
          channels
        SET name = '${values.name}', channel_type_id = ${type.id}, visibility_id = ${visibility.id}`

      // получение id групп
      if (values.permissions !== 'public' && values.groups.length > 0) {

        const groupsString = values.groups.reduce((prev, item, index, array) => {
          if (index === array.length - 1) {
            prev += `'${item}'`
          } else {
            prev += `'${item}', `
          }
          return prev
        }, '')
        const groupsQuery = await client.query(`SELECT id FROM groups WHERE name IN (${groupsString})`)
        const groups = groupsQuery.rows.reduce((prev, item) => {
          prev.push(`${item.id}`)
          return prev
        }, [])

        query += `, group_ids = ARRAY[${groups.join(', ')}]` // добавление id групп к запросу

      } else {
        query += ', group_ids = NULL'
      }

      query += ` WHERE channels.id = ${channelId}`

      await client.query(query)

      return res.status(200).json({ msg: 'Канал успешно изменен' })

    } catch (e) {
      return res.status(500).json({ error: true, msg: 'Ошибка сервера' })
    }
  }
)

// * удаление канала
router.post(
  '/deletechannel',
  auth,
  async (req, res) => {
    try {
      const { userId, channelId } = req.body

      // проверка роли пользователя
      const roleQuery = await client.query(
        `SELECT
          roles.name
        FROM 
          roles
        LEFT JOIN users ON users.role_id = roles.id
        WHERE users.id = ${userId}`
      )
      const role = roleQuery.rows[0] // получение информации о пользователе
      if (!role) {
        return res.status(400).json({ error: true, msg: 'Ошибка получения полномочий пользователя' })
      }
      if (role.name !== 'administrator') {
        return res.status(400).json({ error: true, msg: 'Пользователь не имеет достаточно полномочий' })
      }

      await client.query(`DELETE FROM channels WHERE id = ${channelId}`)

      return res.status(200).json({ msg: 'Канал успешно удален' })

    } catch (e) {
      return res.status(500).json({ error: true, msg: 'Ошибка сервера' })
    }
  }
)

// * получение текущего канала
router.post(
  '/getcurrentchannel',
  auth,
  async (req, res) => {
    try {
      
      const { userId, channelId } = req.body

      // проверка роли пользователя
      const roleQuery = await client.query(
        `SELECT
          roles.name
        FROM 
          roles
        LEFT JOIN users ON users.role_id = roles.id
        WHERE users.id = ${userId}`
      )
      const role = roleQuery.rows[0] // получение информации о пользователе
      if (!role) {
        return res.status(400).json({ error: true, msg: 'Ошибка получения полномочий пользователя' })
      }
      if (role.name !== 'administrator') {
        return res.status(400).json({ error: true, msg: 'Пользователь не имеет достаточно полномочий' })
      }

      // получение списка id групп, у которых есть доступ к каналу
      const groupsQuery = await client.query(`SELECT group_ids FROM channels WHERE id = ${channelId}`)

      if (!groupsQuery.rows[0]) return res.status(400).json({ error: true, msg: 'Канал не найден' })

      const groups = groupsQuery.rows[0].group_ids

      const channelQuery = await client.query(
        `
        SELECT
          channels.id, channels.name, channels.visibility_id AS visibility_id, visibility.name AS visibility, 
          ${ groups 
            ? 'ARRAY(SELECT name FROM groups WHERE id IN (' + groups.join(', ') + ')) AS groups' // подзапрос получения поля name для групп, у которых есть доступ к каналу
            : 'NULL AS groups' // NULL если групп нет
          }, 
          channels.group_ids, channels.channel_type_id AS type_id, channel_types.name AS type
        FROM 
          channels
        LEFT JOIN visibility ON channels.visibility_id = visibility.id
        LEFT JOIN channel_types ON channels.channel_type_id = channel_types.id
        WHERE channels.id = ${channelId}
        `
      )
      const channel = channelQuery.rows[0]

      if (!channel) return response.status(400).json({ error: true, msg: 'Канал не найден' }) // если канал не найден - ошибка

      return res.status(200).json({ channel: channel })

    } catch (e) {
      return res.status(500).json({ error: true, msg: 'Ошибка сервера' })
    }
  }
)

// * создание нового раздела 
router.post(
  '/createsection',
  auth,
  async (req, res) => {
    try {
      
      const { userId, sectionName } = req.body

      // проверка роли пользователя
      const userRole = (await client.query(
        `SELECT
          roles.name as role_name, users.group_id as group_id
        FROM 
          users
        LEFT JOIN roles ON users.role_id = roles.id
        WHERE users.id = ${userId}`
      )).rows[0]
      
      let isAdmin = (userRole.role_name === 'administrator')
      const groupId = userRole.group_id

      if (groupId) {
        const groupRole = (await client.query(
          `SELECT
            roles.name as role_name
          FROM 
            groups
          LEFT JOIN roles ON groups.role_id = roles.id
          WHERE groups.id = ${groupId}`
        )).rows[0]
        if (groupRole.role_name) {
          isAdmin = (userRole.role_name === 'administrator' || groupRole.role_name === 'administrator')
        }
      }

      if (!isAdmin) return res.status(400).json({ error: true, msg: 'Пользователь не имеет полномочий' })

      const lastPosition = (await client.query(`SELECT position FROM sections ORDER BY position DESC LIMIT 1`)).rows[0] // получение последней позиции секции позиции 

      await client.query(`INSERT INTO sections (id, name, position) VALUES(${new Date().getTime()}, '${sectionName}', ${lastPosition && lastPosition.position ? +lastPosition.position + 1 : '1'})`)

      return res.status(200).json({ status: 'success' })
    } catch (e) {
      console.log('e', e)
      return res.status(500).json({ error: true, msg: 'Ошибка сервера' })
    }
  }
)

// * удаление раздела 
router.post(
  '/deletesection',
  auth,
  async (req, res) => {
    try {
      
      const { userId, sectionId } = req.body

      // проверка роли пользователя
      const userRole = (await client.query(
        `SELECT
          roles.name as role_name, users.group_id as group_id
        FROM 
          users
        LEFT JOIN roles ON users.role_id = roles.id
        WHERE users.id = ${userId}`
      )).rows[0]
      
      let isAdmin = (userRole.role_name === 'administrator')
      const groupId = userRole.group_id

      if (groupId) {
        const groupRole = (await client.query(
          `SELECT
            roles.name as role_name
          FROM 
            groups
          LEFT JOIN roles ON groups.role_id = roles.id
          WHERE groups.id = ${groupId}`
        )).rows[0]
        if (groupRole.role_name) {
          isAdmin = (userRole.role_name === 'administrator' || groupRole.role_name === 'administrator')
        }
      }

      if (!isAdmin) return res.status(400).json({ error: true, msg: 'Пользователь не имеет полномочий' })

      await client.query(`DELETE FROM sections WHERE id = ${sectionId}`)

      return res.status(200).json({ status: 'success' })
    } catch (e) {
      console.log('e', e)
      return res.status(500).json({ error: true, msg: 'Ошибка сервера' })
    }
  }
)

// * сохранение изменений раздела
router.post(
  '/editsection',
  auth,
  async (req, res) => {
    try {
      
      const { userId, sectionId, sectionName } = req.body

      // проверка роли пользователя
      const userRole = (await client.query(
        `SELECT
          roles.name as role_name, users.group_id as group_id
        FROM 
          users
        LEFT JOIN roles ON users.role_id = roles.id
        WHERE users.id = ${userId}`
      )).rows[0]
      
      let isAdmin = (userRole.role_name === 'administrator')
      const groupId = userRole.group_id

      if (groupId) {
        const groupRole = (await client.query(
          `SELECT
            roles.name as role_name
          FROM 
            groups
          LEFT JOIN roles ON groups.role_id = roles.id
          WHERE groups.id = ${groupId}`
        )).rows[0]
        if (groupRole.role_name) {
          isAdmin = (userRole.role_name === 'administrator' || groupRole.role_name === 'administrator')
        }
      }

      if (!isAdmin) return res.status(400).json({ error: true, msg: 'Пользователь не имеет полномочий' })

      await client.query(`UPDATE sections SET name = '${sectionName}' WHERE id = ${sectionId}`)

      return res.status(200).json({ status: 'success' })
    } catch (e) {
      console.log('e', e)
      return res.status(500).json({ error: true, msg: 'Ошибка сервера' })
    }
  }
)

// * перемещение канала в раздел 
router.post(
  '/movechannel',
  auth,
  async (req, res) => {
    try {
      
      const { userId, sectionId, channelId } = req.body

      // проверка роли пользователя
      const userRole = (await client.query(
        `SELECT
          roles.name as role_name, users.group_id as group_id
        FROM 
          users
        LEFT JOIN roles ON users.role_id = roles.id
        WHERE users.id = ${userId}`
      )).rows[0]
      
      let isAdmin = (userRole.role_name === 'administrator')
      const groupId = userRole.group_id

      if (groupId) {
        const groupRole = (await client.query(
          `SELECT
            roles.name as role_name
          FROM 
            groups
          LEFT JOIN roles ON groups.role_id = roles.id
          WHERE groups.id = ${groupId}`
        )).rows[0]
        if (groupRole.role_name) {
          isAdmin = (userRole.role_name === 'administrator' || groupRole.role_name === 'administrator')
        }
      }

      if (!isAdmin) return res.status(400).json({ error: true, msg: 'Пользователь не имеет полномочий' })

      const section = (await client.query(`SELECT * FROM sections WHERE id = ${sectionId}`)).rows[0]

      if (section && section.id) {
        await client.query(`UPDATE channels SET section_id = ${sectionId} WHERE id = ${channelId}`) // указание секции, если переместили в секцию
      } else {
        await client.query(`UPDATE channels SET section_id = NULL WHERE id = ${channelId}`) // удаление секции, если переместили в общий список каналов
      }

      return res.status(200).json({ status: 'success' })
    } catch (e) {
      console.log('e', e)
      return res.status(500).json({ error: true, msg: 'Ошибка сервера' })
    }
  }
)



module.exports = router