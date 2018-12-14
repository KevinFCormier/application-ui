/*******************************************************************************
 * Licensed Materials - Property of IBM
 * (c) Copyright IBM Corporation 2018. All Rights Reserved.
 *
 * Note to U.S. Government Users Restricted Rights:
 * Use, duplication or disclosure restricted by GSA ADP Schedule
 * Contract with IBM Corp.
 *******************************************************************************/
'use strict'

import React from 'react'
import moment from 'moment'
import StatusChartCell from './StatusChartCell'
import { MAX_CHART_DATA_SIZE } from '../../../lib/shared/constants'
import { inflateKubeValue, getPercentage } from '../../../lib/client/charts-helper'
import msgs from '../../../nls/platform.properties'

class StatusCellCPU extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      chartData: []
    }
  }

  componentWillMount() {
    this.updateChartData(this.props)
  }

  componentWillReceiveProps(nextProps) {
    this.updateChartData(nextProps)
  }

  updateChartData(props) {
    const { overview: {clusters} } = props

    // get available/used cpus
    const data = {
      'available': 0,
      'used': 0,
    }
    const values = clusters.reduce((acc, {capacity, usage}) => {
      data['available'] += inflateKubeValue(capacity.cpu)
      data['used'] += inflateKubeValue(usage.cpu)
      return acc
    }, data)
    const {available, used} = values


    const chartData = this.createFixedArray({
      name: moment().format('LT'),
      available,
      used,
      display: {
        available: new Intl.NumberFormat(this.context.locale).format(available),
        used: new Intl.NumberFormat(this.context.locale).format(used),
      }
    })
    const max = Math.max(...chartData.map(({available}) => available)) * 1.2
    const domainData = {
      tickFormatter: value => `${value}`,
      domain: [0, max],
      ticks: Array.from({length: 4}, (v, i) => Math.round(i*max/3)),
      available: 'available',
      used: 'used',
    }

    this.setState({
      domainData,
      chartData,
    })
  }

  createFixedArray(obj) {
    const { chartData } = this.state
    const newItems = [ ...chartData, obj ]
    if (newItems.length > MAX_CHART_DATA_SIZE)
      newItems.shift()
    return newItems
  }

  render() {
    const { locale } = this.context
    const { chartData, domainData } = this.state
    const { used, available } = chartData[chartData.length - 1]
    const tagValue = `${used.toFixed(2)}/${available} | ${getPercentage(used, available) }%`

    if (chartData.length === 0) { // Recharts cannot handle empty array
      return null
    }

    return (
      <div>
        <StatusChartCell
          header={msgs.get('overview.status.vcpu', locale)}
          tagValue={tagValue}
          chartData={chartData}
          domainData={domainData}
        />
      </div>
    )
  }
}

export default StatusCellCPU
