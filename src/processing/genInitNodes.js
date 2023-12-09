import arraysEqual from '../utils/arraysEqual'

let entityNodes = []
let primNodes = []
let keyNodes = []

function calcName(keys, value) {
  return keys.map((key) => key).join(' · ') + `: ${value}`
}

function traverseObject(keys, value, entityId) {
  let keyId
  
  // Presunta clave existente
  const existingKey = keyNodes.find((k) => arraysEqual(k.keys, keys))

  if (existingKey) {
    // Recuperar ID existente
    keyId = existingKey.id
  } 
  
  else if (keys.length > 0) {
    // Generar ID incremental
    keyId = 'k' + keyNodes.length.toString()

    // Generar nuevo nodo clave
    let keyNode = {
      id: keyId,
      name: keys[keys.length - 1], // Ultima clave de la rama
      keys: keys,   // Toda la rama
      parent: null, // ID de nodo padre
      children: [], // IDs de nodos hijos
    }

    if (keys.length > 0) {
      // Comprobar si tiene nodo clave padre
      const parentKey = keyNodes.find((k) => arraysEqual(k.keys, keys.slice(0, -1)))
      
      if (parentKey) {
        // Agregar referencia del padre al hijo
        keyNode.parent = parentKey.id

        // Agregar referencia del hijo al padre
        parentKey.children = parentKey.children?.concat(keyId) || [keyId]
      }
    }

    // Almacenar nodo clave
    keyNodes.push(keyNode)
  }
  
  /* Verificación del tipo de valor */
  // Comprobar si el valor es primitivo
  if (
    typeof value === 'string' || 
    typeof value === 'number' || 
    typeof value === 'boolean' || 
    value === null
  ){
    let id
    
    // Presunto primitivo existente
    const existing = primNodes.find((p) => 
      p.name === calcName(keys, value)
      && arraysEqual(p.keys, keys)
    )

    if (existing) {
      // Recuperar ID existente
      id = existing.id

      // Agregar referencia de entidad a primitivo
      existing.entities = existing.entities.concat(entityId)
    }

    else {
      // Generar ID incremental
      id = 'p' + primNodes.length.toString()

      // Generar nuevo nodo primitivo
      let primNode = {
        id: id,
        name: calcName(keys, value),  // Nombre a mostrar en el tooltip
        actualName: value,     // Valor del primitivo
        keys: keys,            // Rama que lleva a nodo primitivo
        parent: keyId,         // ID de nodo padre
        entities: [entityId],  // IDs de entidades que comparten primitivo
      }

      // Recuperar nodo clave padre
      const key = keyNodes.find((k) => k.id === keyId)

      // Agregar ID de primitivo a conjunto de hijos del padre
      key.children = key.children?.concat(id) || [id]

      // Almacenar nodo primitivo
      primNodes.push(primNode)
    }

    // Agregar ID de primitivo a conjunto de primitivos de entidad
    entityNodes.find((e) => e.id === entityId).primitives.push(id)

    // Retornar rama (backtracking)
    return [[keys, value, entityId]]
  }
  
  let branches = []
  
  if (Array.isArray(value)) {
    /* Arreglo */
    // Si el valor es un arreglo, recorre cada elemento del arreglo
    for (const [, item] of value.entries()) {
      branches.push(...traverseObject(keys, item, entityId)) // Llamada recursiva para cada elemento
    }
    return branches // Retorna las ramas
  }
  
  // Si el valor es un objeto, recorre cada par clave-valor en el objeto
  for (const [childKey, childValue] of Object.entries(value)) {
    const childKeys = keys ? 
      (Array.isArray(keys) ? keys.concat(childKey) : [keys].concat(childKey)) 
    : [childKey]
    branches.push(...traverseObject(childKeys, childValue, entityId)) // Llamada recursiva para cada par clave-valor
  }
  return branches // Retorna las ramas
}

export default function genInitNodes(dataset, nameAttrib) {
  // Reinicio de los arreglos para almacenar nodos
  entityNodes = []
  primNodes = []
  keyNodes = [{
    id: 'root',
    name: 'Root',
    keys: [],
    parent: null,
    children: [],
    entities: [],
    visible: false,
    color: 'hsl(0, 0%, 25%)',
    fx: 0,
    fy: 0,
  }]
  
  /* Procesamiento recursivo */

  dataset.forEach((entity) => {
    const entityId = 'e' + entityNodes.length.toString()
    entityNodes.push({
      id: entityId,
      name: entity[nameAttrib] ? entity[nameAttrib] : `Unnamed (ID: ${entityId})`,
      value: 1,
      color: 'hsl(0, 0%, 25%)',
      primitives: [],
      relationships: [],
    })
    traverseObject([], entity, entityId)
  })

  console.log('entityNodes: ', entityNodes)
  console.log('primNodes: ', primNodes)
  console.log('keynodes: ', keyNodes)

  /* Procesamiento post-recursivo */

  // Cálculo de la máxima profundidad de los nodos primitivos
  const maxNest = primNodes.map((p) => p.keys.length).reduce((a, b) => Math.max(a, b))

  // Asignación de colores a las claves principales y sus descendientes
  let i = 1
  while (i < maxNest + 1) {
    const keyNest = keyNodes.filter((keyNode) => keyNode.keys.length === i)
    if (i === 1) {
      // Asignación de colores a las claves principales
      keyNest.forEach((mainKey, index) => {
        mainKey.color = `hsl(${360 / keyNest.length * index}, 20%, 25%)`
      })
    } else {
      // Propagación de colores desde las claves padre a sus hijos
      keyNest.forEach((keyNode) => {
        const parentKey = keyNodes.find((node) => node.id === keyNode.parent)
        keyNode.color = parentKey.color
      })
    }
    i++
  }

  // Asignación de colores a los nodos primitivos basados en sus claves padre
  primNodes.forEach((primNode) => {
    const parentKey = keyNodes.find((node) => node.id === primNode.parent)
    const hue = parentKey.color.match(/\d+/)[0]
    primNode.color = `hsl(${hue}, 50%, 50%)`
  })

  // Iterar sobre cada primitivo de cada entidad
  entityNodes.forEach((entity) => {
    entity.primitives.forEach((primId) => {

      // Buscar primitivo actual por ID
      const prim = primNodes.find((p) => p.id === primId)
      
      // Buscar IDs de entidades que comparten primitivo actual
      const relatives = prim.entities.filter((e) => e !== entity.id)
      
      relatives.forEach((relId) => {
        // Presunta relación existente
        const existingRel = entity.relationships.find((r) => r.id === relId)
        
        if (existingRel) {
          existingRel.sharedAttributes.push({
            id: primId,
            name: prim.name,
            color: prim.color,
          })
        }

        else {
          entity.relationships.push({
            id: relId,
            name: entityNodes.find((node) => node.id === relId).name,
            sharedAttributes: [{
              id: primId,
              name: prim.name,
              color: prim.color,
            }],
          })
        }

        // Incrementar el valor de la entidad actual por cada relación
        entity.value += 1
      })
    })
  })

  // Retorna todos los nodos
  return {
    entityNodes,
    primNodes,
    keyNodes,
  }
}