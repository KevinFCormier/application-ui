/*******************************************************************************
 * Licensed Materials - Property of IBM
 * (c) Copyright IBM Corporation 2017, 2019. All Rights Reserved.
 *
 * Note to U.S. Government Users Restricted Rights:
 * Use, duplication or disclosure restricted by GSA ADP Schedule
 * Contract with IBM Corp.
 *******************************************************************************/

import { getChannelStatusClass } from './utils'

describe('getChannelStatusClass', () => {
  const status1 = 'success'
  const status2 = 'failed'
  const status3 = 'inprogress'
  // these 3 cases are for null/empty/error cases which return generic statusTag
  const status4 = ''
  const status5 = null
  const status6 = 'hello'

  it('should return statusTagCompleted', () => {
    const result = 'statusTagCompleted'
    expect(getChannelStatusClass(status1)).toEqual(result)
  })
  it('should return statusTagFailed', () => {
    const result = 'statusTagFailed'
    expect(getChannelStatusClass(status2)).toEqual(result)
  })
  it('should return statusTagInProgress', () => {
    const result = 'statusTagInProgress'
    expect(getChannelStatusClass(status3)).toEqual(result)
  })
  it('should return statusTag', () => {
    const result = 'statusTag'
    expect(getChannelStatusClass(status4)).toEqual(result)
  })
  it('should return statusTag', () => {
    const result = 'statusTag'
    expect(getChannelStatusClass(status5)).toEqual(result)
  })
  it('should return statusTag', () => {
    const result = 'statusTag'
    expect(getChannelStatusClass(status6)).toEqual(result)
  })
})