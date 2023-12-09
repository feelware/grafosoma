import ForceGraph2D from 'react-force-graph-2d'
import { forceManyBody, forceX, forceY } from 'd3-force'
import { useEffect, useRef, useState } from 'react'
import { useViewportSize, useDisclosure } from '@mantine/hooks'
import PropTypes from 'prop-types'
import { Dialog, Code, Tabs, Button, Text } from '@mantine/core'
import { Scrollbars } from 'react-custom-scrollbars-2'
import { saveAs } from 'file-saver'

const NO_INTERACTION = {
  hovered: null,
  clicked: null
}

const NODE_REL_SIZE = 7
const REPULSION = -250
const INIT_DECAY = [0.005, 0.075]

const entityValue = (entity) => {
  let value = 1
  entity.relationships.forEach((r) => {
    value += r.sharedAttributes.length
  })
  return value
}

const setLum = (hsl, lum) => hsl.replace(/(\d+)%\)/, lum + '%)')
const setSat = (hsl, sat) => hsl.replace(/(\d+)%/, sat + '%')

export default function GraphView({ data, file }) {
  const forceGraph = useRef(null)
  const [state, setState] = useState(NO_INTERACTION)
  const findNode = (nodeId) => data.nodes.find((n) => n.id === nodeId)
  const clicked = findNode(state.clicked)
  const hovered = findNode(state.hovered)
  const { height, width } = useViewportSize()
  const [decay, setDecay] = useState(INIT_DECAY)
  const [opened, { toggle, close }] = useDisclosure(false);

  const clickedEntityObj = file.find((f) => f.name === clicked?.name)

  /* Custom forces */

  useEffect(() => {
    forceGraph.current.d3Force('centerX', forceX(0))
    forceGraph.current.d3Force('centerY', forceY(0))
  }, [])

  useEffect(() => {
    forceGraph.current.d3Force('charge', forceManyBody()
      .strength(
        (node) => {
          if (node.id[0] === 'k') {
            return 0
          }
          if (node.children) {
            return REPULSION / node.children.length
          }
          const nodeEntities = node.entities
          if (nodeEntities) {
            return REPULSION * node.entities.length / 2
          }
          const clickedRels = findNode(state.clicked)?.relationships
          if (clickedRels) {
            if (state.clicked === node.id) {
              return REPULSION * entityValue(node)
            }
            if (node.relationships) {
              return REPULSION * clickedRels.find((r) => r.id === node.id)?.sharedAttributes.length
            }
          }
          if (node.relationships) {
            return REPULSION * entityValue(node) * 0.15
          }
          return REPULSION
        }
      ))
    if (clicked) {
      forceGraph.current.d3ReheatSimulation()
      !opened && toggle()
    }
    if (!clicked && opened) {
      close()
      forceGraph.current.d3ReheatSimulation()
    }
  }, [state.clicked])

  /* Event handlers */

  function handleNodeHover(node) {
    setState({
      hovered: node?.id,
      clicked: state.clicked
    })
  }

  function handleNodeClick(clicked) {
    if (clicked.relationships) {
      if (decay[0] === INIT_DECAY[0] && decay[1] === INIT_DECAY[1]) {
        setDecay([0.05, 0.5])
      }
      if (state.clicked === clicked.id) {
        setState(NO_INTERACTION)
        return  
      }
    }
    setState({
      hovered: state.hovered,
      clicked: clicked.id
    })
  }

  function handleNodeDragEnd() {
    setState({
      hovered: NO_INTERACTION.hovered,
      clicked: state.clicked
    })
  }

  function handleBackgroundClick () {
    if (decay[0] === INIT_DECAY[0] && decay[1] === INIT_DECAY[1]) {
      setDecay([0.05, 0.5])
    }
    if (state.clicked) {
      setState(NO_INTERACTION)
    }
  }

  /* Styling */

  const setNodeColor = (node) => {
    const color = node.color || '#C1C2C5'
  
    if (state.clicked) {
    // there is a clicked node

      if (node.id === state.clicked) {
        // clicked node is current node
        return setLum(color, 75)
      }
      
      if (clicked?.relationships) {
        // clicked node is entity
        if (clicked.relationships.map((r) => r.id).includes(state.hovered)) {
          // clicked node is related to current node
          if (
            clicked.primitives.includes(node.id) 
            && hovered.primitives.includes(node.id)
          ) {
            // current node belongs to the intersection
            // of clicked node's primitives
            // and hovered node's primitives
            return setLum(color, 75)
          }
        }
        else if (clicked.primitives.includes(node.id)) {
          // current node is a
          // clicked entity's primitive
          return setLum(color, 60)
        }
      }
  
      if (clicked?.entities) {
        // clicked node is primitive

        if (hovered?.entities) {
          // hovered node is also primitive
          if (
            clicked.entities.includes(node.id) 
            && hovered.entities.includes(node.id)
          ) {
            // current node belongs to the intersection
            // of clicked node's entities
            // and hovered node's entities
            return setLum(color, 75)
          }
        }

        else if (clicked.entities.includes(node.id)) {
          // current node is a
          // clicked primitive's entity
          return setLum(color, 75)
        }
      }
  
      // generic case for primitives
      if (node.entities) {
        return setSat(setLum(color, 25), 35)
      }
      
      // generic case
      return setLum(color, 25)
    }

    // There is no clicked node
    
    else if (
      node.id === state.hovered
      || hovered?.entities?.includes(node.id)
      || hovered?.primitives?.includes(node.id)
    ) {
      // current node is hovered
      // or is related to hovered node
      return setLum(color, 75)
    }
  
    // generic case
    return node.color
  }

  const setNodeVal = (node) => {
    if (node.id[0] === 'k') {
      return node.children.length * NODE_REL_SIZE * 0.01
    }

    if (node.entities) {
      return node.entities.length + 1
    }

    const clickedRels = findNode(state.clicked)?.relationships

    if (clickedRels) {
      if (state.clicked === node.id) {
        return NODE_REL_SIZE * entityValue(node) * 0.5
      }
      if (node.relationships) {
        return NODE_REL_SIZE * clickedRels.find((r) => r.id === node.id)?.sharedAttributes.length * 0.5
      }
    }

    if (node.relationships) {
      return NODE_REL_SIZE * entityValue(node) * 0.05
    }

    return 10
  }

  useEffect(() => {
    setTimeout(() => {
      forceGraph.current.zoomToFit(0, height / 10)
    }, 1)
  }, [height, width])
  
  return (
    <>
      <Dialog
        styles={{ root: { 
          border: clicked ? '1px solid #303030' : 'none',
          backgroundColor: '#272727',
          maxHeight: '75vh',
        }}}
        opened={opened} 
        onClose={close} 
        size="auto"
        position={{ top: 40, left: 30 }}
      >
      {
        clicked?.entities && // it's a primitive
        <>
        <Scrollbars autoHide autoHeight autoHeightMax={'50vh'} renderThumbVertical={() => <div style={{ backgroundColor: '#303030', borderRadius: '20px' }} className="thumb-vertical"/>}>
          <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
        </div>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#242424',
          padding: '15px 15px',
          borderRadius: '3px',
          gap: '10px',
        }}>
          <div>
            <Code color='#242424' c={clicked.color.replace(/(\d+)%\)/, '60%)')}>
              {findNode(state.clicked).keys.join(' · ') + ":"}
            </Code>
            <Code color='#242424' c={clicked.color.replace(/(\d+)%\)/, '75%)')}>
              {findNode(state.clicked).actualName}
            </Code>
          </div>
          <div>
          {
            clicked.entities.map((e, index) => 
              <div key={index}>
                <Code color='#242424' c={
                  hovered?.entities?.includes(e) ? 
                    hovered.color.replace(/(\d+)%\)/, '65%)') 
                    : '#C1C2C5' 
                } >
                  {findNode(e).name}
                </Code>
              </div>
            )
          }
          </div>
        </div>
        </Scrollbars>
          <div style={{ paddingTop: "15px"}}>
          <Button fullWidth onClick={() => {
            const blob = new Blob([JSON.stringify(clicked.entities.map((e) => findNode(e).name), null, 3)], { type: "text/plain;charset=utf-8" });
            saveAs(blob, clicked.keys.join('.') + "=" + clicked.actualName + ".json");
          }} color="#303030" >
            <Text size='15px' c="#C1C2C5">
              Save as file
            </Text>
          </Button>
          </div>
          </>
      }
      {
        clicked?.primitives && // it's an entity
        <>
          <Tabs color="#606060" defaultValue="entity">
            <Tabs.List grow style={{ marginBottom: "20px"}} >
              <Tabs.Tab value='entity'>Entity</Tabs.Tab>
              <Tabs.Tab value='connections'>Connections</Tabs.Tab>
            </Tabs.List>
              <Scrollbars autoHide autoHeight autoHeightMax={500} renderThumbVertical={() => <div style={{ backgroundColor: '#303030', borderRadius: '20px' }} className="thumb-vertical"/>}>
            <Tabs.Panel value='entity'>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#242424',
                // marginTop: '15px',
                borderRadius: '3px',
                padding: '15px 10px',
              }}>
              {
                Object.keys(clickedEntityObj)?.map((k, index) =>
                  <pre key={index}>
                    <Code styles={{ root: { padding: "10px" }}} block="true" color='#242424' c={
                      data.nodes.find((n) => n.name === k)?.color.replace(/(\d+)%\)/, '65%)').replace(/(\d+)%/, '50%')
                    }>
                    {k + ": " + JSON.stringify(clickedEntityObj[k], null, 3)}
                    </Code>
                  </pre>
                )
              }
              </div>
            </Tabs.Panel>
              </Scrollbars>
              <Scrollbars autoHide autoHeight autoHeightMax={500} renderThumbVertical={() => <div style={{ backgroundColor: '#303030', borderRadius: '20px' }} className="thumb-vertical"/>}>

            <Tabs.Panel value='connections'>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                paddingRight: '10px',
                backgroundColor: '#242424',
                gap: '10px',
                // marginTop: '15px',
                borderRadius: '3px',
                padding: '20px 15px'
              }}>
              { 
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {clicked.relationships.sort((a, b) => b.sharedAttributes.length - a.sharedAttributes.length).map((r, index) => {
                    return (
                      <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <Code color='#242424'>
                          {r.name}
                        </Code>
                        <div key={index} style={{ display: 'flex', flexDirection: 'column' }}>
                          {r.sharedAttributes.map((s, ind) =>
                          <Code color='#242424' c={s.color.replace(/(\d+)%\)/, '65%)')} key={ind}>
                            {s.name}
                          </Code>)}
                        </div>
                        
                      </div>
                    )
                  })}
                </div>
              }             
              </div>
            </Tabs.Panel>
            </Scrollbars>

          </Tabs>
        <div style={{ paddingTop: "20px"}}>
        <Button
        fullWidth
          onClick={() => {
            const blob = new Blob([
              JSON.stringify({
                entity: clickedEntityObj,
                relationships: clicked.relationships.map((r) => {
                  return {
                    name: r.name,
                    sharedAttributes: r.sharedAttributes.map((s) => s.name)
                  }
                })
              }, null, 3)
            ], { type: "text/plain;charset=utf-8" });
            saveAs(blob, clicked.name + ".json");
          }} color="#303030" >
            <Text size='15px' c="#C1C2C5">
              Save as file
            </Text>
        </Button>
        </div>
      </>
      }
      </Dialog>
      <ForceGraph2D
        graphData={data}
        ref={forceGraph}
        // Interaction
        onNodeHover={handleNodeHover}
        onNodeDrag={handleNodeHover}
        onNodeDragEnd={handleNodeDragEnd}
        onNodeClick={handleNodeClick}
        onBackgroundClick={handleBackgroundClick}
        onLinkClick={handleBackgroundClick}
        // Styling
        width={width}
        height={height}
        nodeVal={setNodeVal}
        nodeRelSize={NODE_REL_SIZE}
        nodeColor={setNodeColor} 
        nodeVisibility={(node) => node.visible !== false}
        linkVisibility={(link) => link.visible !== false}
        linkColor={() => '#353535'}
        backgroundColor='#ffffff0'
        // Forces
        d3AlphaDecay={decay[0]}
        d3VelocityDecay={decay[1]}
        // Performance
        autoPauseRedraw={true}
      />
    </>
  )
}

GraphView.propTypes = {
  data: PropTypes.shape({
    nodes: PropTypes.array.isRequired,
    links: PropTypes.array.isRequired
  }).isRequired,
  file: PropTypes.array.isRequired
}