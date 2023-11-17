import ForceGraph2D from 'react-force-graph-2d'
import { forceCollide, forceLink, forceManyBody, forceX, forceY } from 'd3-force'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useMantineTheme } from '@mantine/core'
import { useViewportSize } from '@mantine/hooks'
import genGraph from '../../processing/genGraph'

const NODE_REL_SIZE = 7

export default function GraphView({ rawData }) {
  const { height, width } = useViewportSize()
  const thisGraph = useRef(null)
  const mouseDown = useRef(false)
  const colors = useMantineTheme().colors
  
  const [hoveredNodes, setHoveredNodes] = useState(new Set())
  const [hoveredLinks, setHoveredLinks] = useState(new Set())
  const [clickedNodes, setClickedNodes] = useState(new Set())
  const [clickedLinks, setClickedLinks] = useState(new Set())
  const [focusMode, setFocusMode] = useState(false)
  const [entityEntityLinks, setEntityEntityLinks] = useState([])
  const setHoverNode = useState(null)[1]

  const data = useMemo(() => {
    const gData = genGraph(rawData, 'name', colors)
    const rootNode = gData.nodes.find((node) => node.id === 'root')
    rootNode.fx = width / 2
    rootNode.fy = height / 2
    return gData
  }, [rawData])

  const primParents = (d) => {
    if (d.primitives) {
      return -d.primitives.length * 100
    }
    return -200
  }
  
  useEffect(() => {
    thisGraph.current.d3Force('centerX', forceX(width / 2))
    thisGraph.current.d3Force('centerY', forceY(height / 2))

    thisGraph.current.d3Force('collide', forceCollide(function (d) { 
      return d.entities ? 
        Math.sqrt((24 * NODE_REL_SIZE * d.entities.length) / Math.PI) 
        : NODE_REL_SIZE 
      }
    ))

    thisGraph.current.d3Force('charge', forceManyBody().strength(primParents))
    
    function handleMouseDown() {
      mouseDown.current = true
    }
    function handleMouseUp() {
      mouseDown.current = false
    }
    window.addEventListener('mousedown', handleMouseDown, true)
    window.addEventListener('mouseup', handleMouseUp, true)
    return () => {
      window.removeEventListener('mousedown', handleMouseDown, true)
      window.removeEventListener('mouseup', handleMouseUp, true)
    }
  }, [])


  const updateHovered = () => {
    setHoveredNodes(hoveredNodes)
    setHoveredLinks(hoveredLinks)
  }
  const updateClicked = () => {
    setClickedNodes(clickedNodes)
    setClickedLinks(clickedLinks)
  }

  const updateNodeSet = (node, nodeSet, linkSet, action) => {
    if (node) {
      if (action === 'add') {
        nodeSet.add(node);
      } else if (action === 'delete') {
        nodeSet.delete(node);
      }
  
      // Update node neighbors to nodeSet and their links to linkSet
      if (node.primitives) {
        node.primitives.forEach((primitiveId) => {
          const primitiveNode = data.nodes.find((node) => node.id === primitiveId)
          const entityPrimLink = data.links.find((link) => link.nodePairId === node.id + '_' + primitiveId)
          if (action === 'add') {
            nodeSet.add(primitiveNode);
            linkSet.add(entityPrimLink);
          } else if (action === 'delete') {
            nodeSet.delete(primitiveNode);
            linkSet.delete(entityPrimLink);
          }
        })
      }
      if (node.entities) {
        node.entities.forEach((entity) => {
          const entityNode = data.nodes.find((node) => node.id === entity)
          const entityPrimLink = data.links.find((link) => link.nodePairId === entity + '_' + node.id)
          if (action === 'add') {
            nodeSet.add(entityNode);
            linkSet.add(entityPrimLink);
          } else if (action === 'delete') {
            nodeSet.delete(entityNode);
            linkSet.delete(entityPrimLink);          
          }
        })
      }
    }
  }

  const handleNodeHover = (node) => {
    // console.log(node)
    if (!mouseDown.current) {
      hoveredNodes.clear()
      hoveredLinks.clear()
    }

    updateNodeSet(node, hoveredNodes, hoveredLinks, 'add');

    setHoverNode(node || null)
    updateHovered()
  }

  const handleNodeDrag = (node) => {
    updateNodeSet(node, hoveredNodes, hoveredLinks, 'add');
  }

  const handleNodeDragEnd = () => {
    hoveredNodes.clear()
    hoveredLinks.clear()
  }

  const handleNodeClick = (node) => {
    if (clickedNodes.size === 0) {
      setFocusMode(true)
    }
    if (clickedNodes.has(node)) {
      updateNodeSet(node, clickedNodes, clickedLinks, 'delete');
      if (clickedNodes.size === 0) {
        setFocusMode(false)
      }
    } else {
      updateNodeSet(node, clickedNodes, clickedLinks, 'add');

    }
    updateClicked()
    clickedNodes.forEach((clickedNode) => {
      if (clickedNode.primitives) {
        clickedNode.primitives.forEach((primitiveId) => {
          const primitiveNode = data.nodes.find((node) => node.id === primitiveId)
          setEntityEntityLinks((entityEntityLinks) => {
            return [...entityEntityLinks, {
              source: clickedNode,
              target: primitiveNode,
              visible: true,
              nodePairId: clickedNode.id + '_' + primitiveId
            }]
          })
        })
      }
    })
    thisGraph.current.d3Force('entityLinks', forceLink(
      entityEntityLinks
    ).distance(0.1).strength(0.5))
    
  }

  const handleBackgroundClick = () => {
    clickedNodes.clear()
    clickedLinks.clear()
    setFocusMode(false)
  }

  /* Autogenerated curves on node repeat */

  useEffect(() => {
    let sameNodesLinks = {}
    const curvatureMinMax = 0.25

    data.links.forEach((link) => {
      link.nodePairId =
        link.source <= link.target
          ? link.source + '_' + link.target
          : link.target + '_' + link.source
      let map = null
      if (link.source != link.target) {
        map = sameNodesLinks
      }
      if (!map[link.nodePairId]) {
        map[link.nodePairId] = []
      }
      map[link.nodePairId].push(link)
    })

    Object.keys(sameNodesLinks)
      .filter((nodePairId) => sameNodesLinks[nodePairId].length > 1)
      .forEach((nodePairId) => {
        let links = sameNodesLinks[nodePairId]
        let lastIndex = links.length - 1
        let lastLink = links[lastIndex]
        lastLink.curvature = curvatureMinMax
        let delta = (2 * curvatureMinMax) / lastIndex
        for (let i = 0; i < lastIndex; i++) {
          links[i].curvature = -curvatureMinMax + i * delta
          if (lastLink.source !== links[i].source) {
            links[i].curvature *= -1
          }
        }
      })
  }, [data.links, hoveredNodes])

  const setNodeColor = (node) => {
    if (hoveredNodes.has(node)) {
      return node.color.replace(/(\d+)%\)/, '75%)')
    }
    if (focusMode) {
      if (clickedNodes.has(node)) {
        return colors.dark[3]
      }
      return colors.dark[5]
    }
    return node.color
  }

  const setLinkColor = (link) => {
    if (hoveredLinks.has(link)) {
      return colors.main[0]
    }
    if (focusMode) {
      if (clickedLinks.has(link)) {
        return colors.dark[3]
      }
      return colors.dark[5]
    }
    return colors.dark[5]
  }

  /* Zoom to fit on data change */

  useEffect(() => {
    setTimeout(() => {
      thisGraph.current.zoomToFit(0, height / 10)
    }, 1)
  }, [height, width])

  return (
    <>
      <ForceGraph2D
        ref={thisGraph}
        width={width}
        height={height}
        graphData={data} 
        autoPauseRedraw={true}
        linkCurvature={'curvature'}
        linkColor={setLinkColor}
        onNodeHover={handleNodeHover}
        onNodeDrag={handleNodeDrag}
        onNodeDragEnd={handleNodeDragEnd}
        onNodeClick={handleNodeClick}
        onBackgroundClick={handleBackgroundClick}
        onLinkClick={handleBackgroundClick}
        backgroundColor={'#ffffff0'}
        nodeRelSize={NODE_REL_SIZE}
        nodeVal={(node) => (node.entities && node.entities.length > 0) ? node.entities.length : node.value || 0.5}
        nodeColor={setNodeColor} 
        nodeVisibility={(node) => node.visible !== false}
        linkVisibility={(link) => link.visible !== false}
        // dagMode={'radialin'}
        // dagLevelDistance={150}
        d3AlphaDecay={0.01}
        d3VelocityDecay={0.1}
      />
    </>
  )
}