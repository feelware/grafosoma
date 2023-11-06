import ForceGraph2D from 'react-force-graph-2d'
import { useEffect, useMemo, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { useMantineTheme } from '@mantine/core'
import { useViewportSize } from '@mantine/hooks'
import genGraph from '../../utilities/genGraph'

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
  const setHoverNode = useState(null)[1]

  /* Interactivity */

  useEffect(() => {
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

  const data = useMemo(() => {
    const gData = genGraph(rawData, 'name')
    return gData
  }, [rawData])

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
  
      // Update node neighbors to nodeSet
      if (node.links) {
        node.links.forEach((link) => {
          if (action === 'add') {
            linkSet.add(link);
            updateNodeSet(link.target, nodeSet, linkSet, action);
          } else if (action === 'delete') {
            linkSet.delete(link);
            updateNodeSet(link.target, nodeSet, linkSet, action);
          }
        });
      }
    }
  }

  const handleNodeHover = (node) => {
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
      return colors.main[0]
    }
    if (focusMode) {
      if (clickedNodes.has(node)) {
        return colors.dark[3]
      }
      return colors.dark[5]
    }
    return colors.dark[3]
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
        backgroundColor={'#ffffff0'}
        nodeRelSize={3}
        nodeColor={setNodeColor} 
        linkColor={setLinkColor}
        onNodeHover={handleNodeHover}
        onNodeDrag={handleNodeDrag}
        onNodeDragEnd={handleNodeDragEnd}
        onNodeClick={handleNodeClick}
        onBackgroundClick={handleBackgroundClick}
        onLinkClick={handleBackgroundClick}
        // linkVisibility={(link) => hoveredLinks.has(link) || clickedLinks.has(link)}
        dagMode={'radialin'}
        dagLevelDistance={75}
        d3AlphaDecay={0.1}
      />
    </>
  )
}