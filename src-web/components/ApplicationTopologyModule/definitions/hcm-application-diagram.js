/*******************************************************************************
 * Licensed Materials - Property of IBM
 * (c) Copyright IBM Corporation 2018, 2019. All Rights Reserved.
 *
 * Note to U.S. Government Users Restricted Rights:
 * Use, duplication or disclosure restricted by GSA ADP Schedule
 * Contract with IBM Corp.
 *******************************************************************************/
'use strict'
import moment from 'moment'
import { NODE_SIZE, StatusIcon } from '../visualizers/constants.js'
import jsYaml from 'js-yaml'
import { getStoredObject, saveStoredObject } from '../../../../lib/client/resource-helper'
import config from '../../../../lib/shared/config'
import * as Actions from '../../../actions'
import msgs from '../../../../nls/platform.properties'
import _ from 'lodash'

export default {
  //general order in which to organize diagram with 'application' at upper left
  designTypes: ['application', 'subscription', 'rules', 'clusters', 'deployable'],
  topologyTypes: ['service', 'deployment', 'pod'],

  typeToShapeMap: {
    'application': {
      shape: 'application',
      className: 'design',
      nodeRadius: 30
    },
    'deployable': {
      shape: 'deployable',
      className: 'design'
    },
    'subscription': {
      shape: 'subscription',
      className: 'design'
    },
    'rules': {
      shape: 'rules',
      className: 'design'
    },
    'clusters': {
      shape: 'cluster',
      className: 'container'
    },
  },

  diagramOptions: {
    showLineLabels: true, // show labels on lines
    filterByType: true, //dynamic type filtering
    showSectionTitles: false // show titles over sections
  },

  // merge table/diagram/topology definitions
  mergeDefinitions,

  // nodes, links and yaml
  getDiagramElements,

  // get description for under node
  getNodeTitle,
  getNodeDescription: getDesignNodeDescription,
  getNodeTooltips: getDesignNodeTooltips,
  getNodeDetails: getDesignNodeDetails,

  // get section titles
  getSectionTitles,

  // cytoscape layout options
  getConnectedLayoutOptions,
  getUnconnectedLayoutOptions,
}

// merge table/diagram/topology definitions
function mergeDefinitions(topologyDefs) {
  // merge diagram with table definitions
  const defs = Object.assign(this, {})

  // add topology types to design types
  defs.typeToShapeMap = Object.assign(defs.typeToShapeMap, topologyDefs.typeToShapeMap)
  defs.shapeTypeOrder = [...defs.designTypes, ...defs.topologyTypes]
  defs.getTopologyElements = topologyDefs.getTopologyElements
  defs.getNodeGroups = topologyDefs.getNodeGroups

  this.updateNodeIcons = (nodes) => {
    updateNodeIcons(nodes)
    topologyDefs.updateNodeIcons(nodes)
  }

  this.getNodeDescription = (node, locale) => {
    if (_.get(node, 'specs.isDesign')) {
      return getDesignNodeDescription(node, locale)
    }
    return topologyDefs.getNodeDescription(node)
  }

  //getNodeDetails: what desciption to put in details view when node is clicked
  this.getNodeDetails = (currentNode) => {
    if (_.get(currentNode, 'specs.isDesign')) {
      return getDesignNodeDetails(currentNode)
    }
    return topologyDefs.getNodeDetails(currentNode)
  }

  //getNodeDetails: what desciption to put in details view when node is clicked
  this.getNodeTooltips = (node, locale) => {
    if (_.get(node, 'specs.isDesign')) {
      return getDesignNodeTooltips(node, locale)
    }
    return topologyDefs.getNodeTooltips(node)
  }

  return defs
}

// remove the system stuff
const system = ['creationTimestamp', 'selfLink', 'status', 'uid', 'annotations', 'livenessProbe', 'resourceVersion']
const removeMeta = (obj) => {
  for (const key in obj) {
    if (system.indexOf(key)!==-1) {
      delete obj[key]
    } else if (typeof obj[key] === 'object') {
      removeMeta(obj[key])
    }
  }
}
const sortKeys = (a,b) => {
  if (a==='name' && b!=='name') {
    return -1
  } else if (a!=='name' && b==='name') {
    return 1
  } else if (a==='namespace' && b!=='namespace') {
    return -1
  } else if (a!=='namespace' && b==='namespace') {
    return 1
  }
  return a.localeCompare(b)
}

function getDiagramElements(item, topology, diagramFilters, localStoreKey) {

  const {status, loaded, reloading} = topology
  const topologyReloading = reloading
  const topologyLoadError = status===Actions.REQUEST_STATUS.ERROR
  if (loaded && !topologyLoadError) {

    // topology from api will have raw k8 objects, pods status
    const {links, nodes} = this.getTopologyElements(topology)

    // create yaml and what row links to what node
    let row=0
    const yamls = []
    const clusters = []
    let activeChannel
    let channels = []
    nodes.forEach(node=>{
      const {type} = node
      switch (type) {
      case 'application':
        activeChannel = _.get(node, 'specs.activeChannel')
        channels = _.get(node, 'specs.channels', [])
        break
      }

      const raw = _.get(node, 'specs.raw')
      if (raw) {
        node.specs.row = row
        removeMeta(raw)
        const yaml = jsYaml.safeDump(raw, {sortKeys})
        yamls.push(yaml)
        row += yaml.split('\n').length
      }
    })

    const yaml =yamls.join('---\n')
    saveStoredObject(localStoreKey, {
      clusters,
      activeChannel,
      channels,
      links,
      nodes,
      yaml,
    })

    return {
      clusters,
      activeChannel,
      channels,
      links,
      nodes,
      yaml,
      topologyLoaded: true,
      topologyLoadError,
      topologyReloading,
    }
  }

  // if not loaded yet, see if there's a stored version
  // with the same diagram filters
  if (!topologyReloading) {
    const storedElements = getStoredObject(localStoreKey)
    if (storedElements) {
      //topology.storedElements=storedElements
      const {clusters=[], activeChannel, channels=[], links=[], nodes=[], yaml=''} = storedElements
      return {
        clusters,
        activeChannel,
        channels,
        links,
        nodes,
        yaml,
        topologyLoaded: true,
        topologyLoadError,
        topologyReloading,
      }
    }
  }

  // if no topology yet, create diagram with search item
  const links=[]
  const nodes=[]
  const clusters=[]
  const channels=[]
  const yaml=''

  // create application node
  const { name:an, namespace:ans, deployables} = item
  const appId = `application--${an}`
  nodes.push({
    name:an,
    namespace:ans,
    type: 'application',
    uid: appId,
    specs: { isDesign: true }
  })

  // create deployables
  if (deployables) {
    deployables.forEach(({name, namespace}, idx)=>{
      const memberId = `member--deployables--${name}--${idx}`
      nodes.push({
        name,
        namespace,
        type: 'deployable',
        uid: memberId,
        specs: { isDesign: true }
      })
      links.push({
        source: appId,
        target: memberId,
        label: '',
        specs: { isDesign: true },
        uid: appId+memberId
      })
    })
  }
  return {
    clusters,
    channels,
    links,
    nodes,
    yaml,
    topologyLoaded: false,
    topologyLoadError,
    topologyReloading,
  }
}

function getDesignNodeDescription(node, locale) {
  let description = ''
  switch (node.type) {
  case 'application':
  case 'subscription':
    description = node.namespace
    break
  case 'deployable':
    description = _.get(node, 'deployable.chartName.$v')
    break
  case 'dependency':
    description = _.get(node, 'dependency.kind.$v')
    break
  case 'policy':
    description = msgs.get('application.policy', locale)
    break
  }
  return description
}

function getNodeTitle(node, locale) {
  switch (node.type) {
  case 'application':
    return msgs.get('topology.title.application', locale)

  case 'clusters':
    return msgs.get('topology.title.clusters', locale)

  case 'chart':
    return _.get(node, 'work.cluster', '')

  case 'service':
  case 'deployment':
  case 'pod':
    // if we skip the chart for a custom resource def
    // add cluster name as node title
    if (node.isCRDDeployment) {
      return _.get(node, 'clusterName', '')
    }
  }

  return ''
}

function updateNodeIcons(nodes) {
  nodes.forEach(node=>{
    if (node.status) {
      let statusIcon
      let tooltips=''
      switch (node.status.toLowerCase()) {
      case 'completed':
        statusIcon = StatusIcon.success
        break

      default:
        statusIcon = StatusIcon.error
        tooltips = [{name:'Reason', value: node.reason}]
        break
      }
      let nodeIcons = node.layout.nodeIcons
      if (!nodeIcons) {
        nodeIcons = node.layout.nodeIcons = {}
      }
      nodeIcons['status'] = Object.assign(statusIcon, {tooltips})
    }
  })
}

function getDesignNodeDetails(currentNode) {
  const details = []
  let labels = {}
  if (currentNode) {
    switch (currentNode.type) {
    case 'application': {
      const {application: { metadata: {name, namespace, creationTimestamp, resourceVersion, labels:l=[] }}} = currentNode
      addDetails(details, [
        {labelKey: 'resource.type', value: currentNode.type},
        {labelKey: 'resource.name', value: name},
        {labelKey: 'resource.namespace', value: namespace},
        {labelKey: 'resource.created', value: getAge(creationTimestamp)},
        {labelKey: 'resource.version', value: resourceVersion},
      ])
      labels = l
      break
    }
    case 'subscription': {
      const {application: { metadata: {name, namespace, creationTimestamp, resourceVersion, labels:l=[] }}} = currentNode
      addDetails(details, [
        {labelKey: 'resource.type', value: currentNode.type},
        {labelKey: 'resource.name', value: name},
        {labelKey: 'resource.namespace', value: namespace},
        {labelKey: 'resource.created', value: getAge(creationTimestamp)},
        {labelKey: 'resource.version', value: resourceVersion},
      ])
      labels = l
      break
    }
    case 'rules': {
      const {name, namespace, member: {$raw: { spec: {clusterLabels, clusterReplicas}}}} = currentNode
      addDetails(details, [
        {labelKey: 'resource.type', value: currentNode.type},
        {labelKey: 'resource.name', value: name},
        {labelKey: 'resource.namespace', value: namespace},
        {labelKey: 'resource.replicas', value: clusterReplicas},
      ])
      const yaml = jsYaml.safeDump(clusterLabels).split('\n')
      if (yaml.length>0) {
        details.push({
          type: 'label',
          labelKey: 'resource.cluster.labels'
        })
        yaml.forEach(value=>{
          const labelDetails = [
            {value},
          ]
          addDetails(details, labelDetails)
        })

      }
      break
    }
    case 'deployable': {
      const {name, namespace, labels:l } = currentNode
      addDetails(details, [
        {labelKey: 'resource.type', value: currentNode.type},
        {labelKey: 'resource.name', value: name},
        {labelKey: 'resource.namespace', value: namespace},
      ])
      labels = l||[]
      break
    }
    }
  }

  // add labels
  labels = Object.entries(labels)
  if (labels.length>0) {
    details.push({
      type: 'label',
      labelKey: 'resource.labels'
    })
    labels.forEach(([name, value])=>{
      const labelDetails = [
        {value: `${name} = ${value}`},
      ]
      addDetails(details, labelDetails)
    })
  }


  return details
}

function getDesignNodeTooltips(node, locale) {
  const tooltips = []
  const {name, type, namespace} = node
  const contextPath = config.contextPath.replace(new RegExp('/applications'), '')
  let href = `${contextPath}/search?filters={"textsearch":"kind:${type} name:${name}"}`
  tooltips.push({name:_.capitalize(_.startCase(type)), value:name, href})
  if (namespace) {
    href = `${contextPath}/search?filters={"textsearch":"kind:namespace name:${namespace}"}`
    tooltips.push({name:msgs.get('resource.namespace', locale), value:namespace, href})
  }
  return tooltips
}

function getSectionTitles(isMulticluster, clusters, types) {
  const hasTitle = ['chart','deployment','pod','service']
  types = types.filter(type=>{
    return hasTitle.indexOf(type)===-1
  })
  return types.length===0 ? clusters.join(', ') : ''
}

function getConnectedLayoutOptions({elements}) {

  // pre position elements to try to keep webcola from random layouts
  const roots = elements.nodes().roots().toArray()
  positionRow(0, roots, new Set(), {})
  if (roots.length===1) {
    return {
      name: 'preset',
    }
  }

  // let cola position them, nicely
  return {
    name: 'cola',
    animate: false,
    boundingBox: {
      x1: 0,
      y1: 0,
      w: 1000,
      h: 1000
    },

    // do directed graph, top to bottom
    flow: { axis: 'x', minSeparation: NODE_SIZE*1.2},

    // running in headless mode, we need to provide node size here
    nodeSpacing: ()=>{
      return NODE_SIZE*1.3
    },

    // put charts along y to separate design from k8 objects
    alignment: (node)=>{
      const {node:{specs={}}} = node.data()
      if (specs.isDivider) {
        return { y: 0 }
      }
      return null
    },

    unconstrIter: 10, // works on positioning nodes to making edge lengths ideal
    userConstIter: 20, // works on flow constraints (lr(x axis)or tb(y axis))
    allConstIter: 20, // works on overlap
  }
}

const positionRow = (idx, row, placedSet, positionMap) => {
  if (row.length) {
    // place each node in this row
    const width = row.length * NODE_SIZE * 3
    let x = -(width/2)
    const y = idx * NODE_SIZE*2.4
    row.forEach(n=>{
      placedSet.add(n.id())
      let pos = {x, y}
      const {node: {type, name}} = n.data()
      let key = type
      switch (type) {
      case 'rules':
        pos = positionMap['subscription']
        pos.x += NODE_SIZE * 3
        break
      case 'clusters':
        pos.x =  -(NODE_SIZE * 3)/2
        break
      case 'deployment':
        key = `deployment/${name}`
        break
      case 'pod':
        pos.x = positionMap[`deployment/${name}`].x
        key = `pod/${name}`
        break
      }
      positionMap[key] = pos
      n.position(pos)
      x+=NODE_SIZE*3
    })

    // find and sort next row down
    let nextRow = []
    const kindOrder = ['chart', 'service', 'deployment', 'other']
    row.forEach(n=>{
      const outgoers = n.outgoers().nodes().filter(n=>{
        return !placedSet.has(n.id())
      }).sort((a,b)=>{
        a = a.data().node
        b = b.data().node
        if (a.type==='deployable' && b.type==='deployable') {
          const kinda = kindOrder.indexOf(_.get(a, 'specs.raw.spec.template.kind', 'other').toLowerCase())
          const kindb = kindOrder.indexOf(_.get(b, 'specs.raw.spec.template.kind', 'other').toLowerCase())
          return kinda-kindb
        }
        return 0
      }).toArray()
      nextRow = [...nextRow, ...outgoers]
    })

    // place next row down
    positionRow(idx+1, nextRow, placedSet, positionMap)
  }
}

function getUnconnectedLayoutOptions(collection, columns, index) {
  const count = collection.elements.length
  const cols = Math.min(count, columns[index])
  const h = Math.ceil(count/columns[index])*NODE_SIZE*2.7
  const w = cols*NODE_SIZE*3
  return {
    name: 'grid',
    avoidOverlap: false, // prevents node overlap, may overflow boundingBox if not enough space
    boundingBox: {
      x1: 0,
      y1: 0,
      w,
      h
    },
    sort: (a,b) => {
      const {node: {layout: la}} = a.data()
      const {node: {layout: lb}} = b.data()
      return la.label.localeCompare(lb.label)
    },
    cols
  }
}

function addDetails(details, newDetails) {
  newDetails.forEach(({labelKey, value})=>{
    if (value) {
      details.push({
        type: 'label',
        labelKey,
        value,
      })
    }
  })
}

function getAge(value) {
  if (value) {
    if (value.includes('T')) {
      return moment(value, 'YYYY-MM-DDTHH:mm:ssZ').fromNow()
    } else {
      return moment(value, 'YYYY-MM-DD HH:mm:ss').fromNow()
    }
  }
  return '-'
}

