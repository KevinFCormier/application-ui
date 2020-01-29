/*******************************************************************************
 * Licensed Materials - Property of IBM
 * (c) Copyright IBM Corporation 2018, 2019. All Rights Reserved.
 *
 * Note to U.S. Government Users Restricted Rights:
 * Use, duplication or disclosure restricted by GSA ADP Schedule
 * Contract with IBM Corp.
 *******************************************************************************/
'use strict'

import React from 'react'
import PropTypes from 'prop-types'
import { Scrollbars } from 'react-custom-scrollbars'
import { Icon, NumberInput, MultiSelect, Button } from 'carbon-components-react'
import jsYaml from 'js-yaml'
import '../../../../graphics/diagramShapes.svg'
import msgs from '../../../../nls/platform.properties'

const DetailsViewDecorator = ({shape, className}) => {
  return (
    <svg width="48px" height="48px" viewBox="0 0 48 48">
      <use href={`#diagramShapes_${shape}`} className={`${className} detailsIcon`}></use>
    </svg>
  )
}

DetailsViewDecorator.propTypes = {
  className: PropTypes.string,
  shape: PropTypes.string,
}

class DetailsView extends React.Component {

  constructor(props) {
    super(props)
  }

  handleClick(value) {
    this.showLogs(value)
  }

  handleKeyPress(value, e) {
    if ( e.key === 'Enter') {
      this.showLogs(value)
    }
  }

  showLogs(value) {
    const { showLogs, onClose } = this.props
    const { data } = value
    showLogs(data)
    onClose()
  }

  render() {
    const { locale, onClose, getLayoutNodes, getViewContainer, staticResourceData, selectedNodeId} = this.props
    const {typeToShapeMap, getNodeDetails} = staticResourceData
    const currentNode = getLayoutNodes().find((n) => n.uid === selectedNodeId) || {}
    const { layout={} } = currentNode
    const resourceType = layout.type || currentNode.type
    const {shape='circle', className='default'} =  typeToShapeMap[resourceType]||{}
    const details = getNodeDetails(currentNode, locale)
    const name = currentNode.name
    const height = getViewContainer().getBoundingClientRect().height
    const scrollHeight = height*.75
    return (
      <section className={`topologyDetails ${className}`}>
        <h3 className='detailsHeader'>
          <DetailsViewDecorator
            shape={shape}
            className={className}
          />
          <span className='titleText'>
            {name}
          </span>
          <Icon
            className='closeIcon'
            description={msgs.get('topology.details.close', locale)}
            name="icon--close"
            onClick={onClose}
          />
        </h3>
        <hr />
        <Scrollbars style={{ width: 310, height: scrollHeight }}
          renderView = {this.renderView}
          renderThumbVertical = {this.renderThumbVertical}
          className='details-view-container'>
          {details.map(detail=>this.renderDetail(detail, locale))}
        </Scrollbars>
      </section>)
  }

  renderDetail(detail, locale) {
    switch (detail.type) {
    case 'spacer':
      return this.renderSpacer()
    case 'link':
      return this.renderLink(detail)
    case 'number':
      return this.renderNumber(detail, locale)
    case 'selector':
      return this.renderSelector(detail, locale)
    case 'submit':
      return this.renderSubmit(detail, locale)
    case 'snippet':
      return this.renderSnippet(detail, locale)
    default:
      return this.renderLabel(detail, locale)
    }
  }

  renderLabel({labelKey, labelValue, value, indent}, locale) {
    let label = labelValue
    if (labelKey) {
      label = labelValue ? msgs.get(labelKey, [labelValue], locale) : msgs.get(labelKey, locale)
    }
    return (
      <div className='sectionContent' key={Math.random()}>
        {(labelKey||labelValue) && <span className='label'>{label}: </span>}
        {indent&&<span className='indent' />}
        <span className='value'>{value}</span>
      </div>
    )
  }

  renderSnippet({value}) {
    if (value) {
    const yaml = jsYaml.safeDump(value).split('\n')
    return (
      <div className='sectionContent snippet'>
        {yaml.map(line=>{
          return (<code key={Math.random()}>{line}</code>)
        })}
      </div>
    )
  }
    return null
  }

  renderLink({value, indent}) {
    const handleClick = this.handleClick.bind(this, value)
    const handleKeyPress = this.handleKeyPress.bind(this, value)
    return (
      <div className='sectionContent' key={Math.random()}>
        <div className='link' tabIndex='0' role={'button'}
          onClick={handleClick} onKeyPress={handleKeyPress}>
          {indent&&<span className='indent' />}
          {value.label}
        </div>
      </div>
    )
  }

  renderNumber({labelKey, value}, locale) {
    return (
      <div className='sectionContent form' key={Math.random()}>
        {labelKey && <span className='label'>{msgs.get(labelKey, locale)}: </span>}
        <NumberInput
          id={labelKey}
          label={''}
          value={value}
          min={1}
          max={10}
          step={1}
          onChange={this.enableSubmitBtn.bind(this)} />
      </div>
    )
  }

  renderSelector({labelKey, value, other}, locale) {
    return (
      <div className='sectionContent form' key={Math.random()}>
        {labelKey && <span className='label'>{msgs.get(labelKey, locale)}: </span>}
        <MultiSelect.Filterable
          items={other}
          initialSelectedItems={value}
          placeholder={value.join(', ')}
          itemToString={item=>item}
          onChange={this.enableSubmitBtn.bind(this)} />
      </div>
    )
  }


  setSubmitBtn = ref => { this.submitBtn = ref }
  renderSubmit() {
    return (
      <div className='sectionContent submit' key={Math.random()}>
        <Button small id='edit-button' disabled ref={this.setSubmitBtn} onClick={this.onSubmit}>
          {msgs.get('modal.button.submit', this.props.locale)}
        </Button>
      </div>
    )
  }

  enableSubmitBtn() {
    this.submitBtn.disabled=false
  }

  onSubmit() {
    this.props.onClose()
  }

  renderSpacer() {
    return (
      <div className='sectionContent' key={Math.random()}>
        <div className='spacer'></div>
      </div>
    )
  }

  renderView({ style, ...props }) {
    style.marginBottom = -17
    return (
      <div {...props} style={{ ...style }} />
    )
  }

  renderThumbVertical({ style, ...props }) {
    const finalStyle = {
      ...style,
      cursor: 'pointer',
      borderRadius: 'inherit',
      backgroundColor: 'rgba(0,0,0,.2)'
    }
    return <div className={'details-view-scrollbar'} style={finalStyle} {...props} />
  }

}

DetailsView.propTypes = {
  getLayoutNodes: PropTypes.func,
  getViewContainer: PropTypes.func,
  locale: PropTypes.string,
  onClose: PropTypes.func,
  selectedNodeId: PropTypes.string,
  showLogs: PropTypes.func,
  staticResourceData: PropTypes.object,
}

export default DetailsView
