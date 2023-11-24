// import file from './datasets/files.json'
import GraphView from './components/GraphView/GraphView'
import { useEffect, useState, useMemo } from 'react'
import { useDisclosure } from '@mantine/hooks'
import { Dialog, TextInput, Button, CopyButton, Text } from '@mantine/core'
import { FiSearch, FiShare, FiCheck } from 'react-icons/fi';
import { TfiClose } from "react-icons/tfi";
import genInitNodes from './processing/genInitNodes'
import genLinks from './processing/genInitLinks'
import rootEntitiesLinker from './processing/rootEntitiesLinker'

const arraysEqual = (a, b) => {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++)
    if (a[i] !== b[i]) return false
  return true
}

export default function Container({ file, id }) {
  const initNodes = useMemo(() => genInitNodes(file, 'name'), [])
  const initLinks = useMemo(() => genLinks(initNodes), [initNodes])
  const [data, setData] = useState({ 
    nodes: [
      ...initNodes.entityNodes,
      ...initNodes.keyNodes,
      ...initNodes.primNodes,
    ], 
    links: [
      ...initLinks.rootKeysLinks,
      ...initLinks.primKeyLinks,
      ...initLinks.keyKeyLinks,
      ...rootEntitiesLinker(initNodes.entityNodes)
    ]
  })

  const [opened, { toggle, close }] = useDisclosure(false)
  const [filterPlaceholder, setFilterPlaceholder] = useState('')
  const [filterInput, setFilterInput] = useState('')
  const [filterInputInvalid, setFilterInputInvalid] = useState(false)

  const handleEnter = () => {
    if (filterInput === '') {
      setData({ 
        nodes: [
          ...initNodes.entityNodes,
          ...initNodes.keyNodes,
          ...initNodes.primNodes,
        ], 
        links: [
          ...initLinks.rootKeysLinks,
          ...initLinks.primKeyLinks,
          ...initLinks.keyKeyLinks,
          ...rootEntitiesLinker(initNodes.entityNodes)
        ]
      })
      return
    }

    const splitPattern = /( *\|\| *)|( *&& *)|( *\( *)|( *\) *)/
    const tokens = filterInput.split(splitPattern);
    const propositions = tokens.filter((t) => t && !t.match(splitPattern))

    const sets = propositions.map((p) => {
      const pair = p.split(/ *: */)
      if (pair.length !== 2) {
        setFilterInputInvalid(true)
        return
      }
      const keys = pair[0].split(/ ?(\.|·) ?/).filter((t) => t !== "." && t !== "·")
      const slash = /^(?: *\/)(.+)(?:\/(\w)? *)$/g
      const quote = /^(?: *['|"])(.+)(?:['|"](\w)? *)$/g
      if (pair[1].match(slash)) {
        const search = new RegExp(pair[1].replace(slash, '$1'), pair[1].replace(slash, '$2') || '')
        return ({
          proposition: p,
          entities: new Set(initNodes.primNodes.reduce((accumulator, p) => {
            if (arraysEqual(p.keys, keys) && p.actualName.toString().match(search)) {
              return [...accumulator, ...p.entities];
            }
            return accumulator;
          }, [])),
        })
      }
      const value = pair[1].replace(quote, '$1')
      return ({
        proposition: p,
        entities: new Set(initNodes.primNodes.find((p) => arraysEqual(p.keys, keys) && p.actualName.toString() === value).entities),
      })
    })

    const matchingEntities = initNodes.entityNodes.filter((e) => {
      let evaluatedInput = filterInput
      sets.forEach((s) => {
        evaluatedInput = evaluatedInput.replace(s.proposition, s.entities.has(e.id))
      })
      return (eval(evaluatedInput))
    })

    setData({
      nodes: [
        ...matchingEntities,
        ...initNodes.keyNodes,
        ...initNodes.primNodes,
      ], 
      links: [
        ...initLinks.rootKeysLinks,
        ...initLinks.primKeyLinks,
        ...initLinks.keyKeyLinks,
        ...rootEntitiesLinker(matchingEntities)
      ]
    })
  }
  
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.altKey && (e.key === 'f' || e.key === 'F')) {
        toggle()
      } else if (e.key === 'Escape' && opened) {
        close()
      } else if (e.key === 'Enter' && opened) {
        handleEnter()
      } else if (e.key == 'Tab' && opened && filterInput === '') {
        e.preventDefault()
        setFilterInput(filterPlaceholder)
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [opened, filterInput, handleEnter])

  useEffect(() => {
    if (opened) {
      const randomEntity = initNodes.entityNodes[Math.floor(Math.random() * initNodes.entityNodes.length)]
      const randomPrimIndex = Math.floor(Math.random() * (randomEntity.primitives.length - 2)) + 2
      setFilterPlaceholder(initNodes.primNodes.find((p) => p.id === randomEntity.primitives[randomPrimIndex]).name)
    }
  }, [initNodes.entityNodes, initNodes.primNodes, opened])

  useEffect(() => {
    setFilterInputInvalid(false)
  }, [opened, filterInput])

  return (
    <div>
      <Button 
        style={{
          position: 'absolute',
          top: '33px',
          right: '30px',
          zIndex: 1000,
          backgroundColor: '#303030',
        }}
        onClick={toggle}
      >
        { !opened ? <FiSearch /> : <TfiClose /> }
      </Button>
      <Dialog
        styles={{
          root: { backgroundColor: '#fff0' }
        }}
        position={{ top: 17, right: 80 }}
        opened={opened}
        onClose={close}
        size="lg"
        radius="md"
      >
        <TextInput
          placeholder={filterPlaceholder}
          style={{ flex: 1 }}
          value={filterInput}
          onChange={(event) => {
            setFilterInput(event.currentTarget.value)
          }}
          error={filterInputInvalid}
        />
      </Dialog>
      <CopyButton value={id} timeout={2500} >
        {({ copied, copy }) => (
          <>
            {
              copied && <Text style={{
                position: 'absolute',
                bottom: '43px',
                right: '95px',
                overflow: 'visible'
              }} size='13px' c="#C1C2C5">
                Copied ID to clipboard!
              </Text>
            }
            <Button 
              style={{
                position: 'absolute',
                bottom: '33px',
                right: '30px',
                zIndex: 1000,
                backgroundColor: '#303030',
              }}
              onClick={copy}
            >
              <FiShare/>
            </Button>
          </>
        )}
      </CopyButton>
      <GraphView data={data} file={file} />
    </div>
  )
}
