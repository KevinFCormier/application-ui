/** *****************************************************************************
 * Licensed Materials - Property of IBM
 * (c) Copyright IBM Corporation 2019. All Rights Reserved.
 *
 * Note to U.S. Government Users Restricted Rights:
 * Use, duplication or disclosure restricted by GSA ADP Schedule
 * Contract with IBM Corp.
 ****************************************************************************** */
// Copyright (c) 2020 Red Hat, Inc.
// Copyright Contributors to the Open Cluster Management project
'use strict'

export const controlData = [
  {
    id: 'createStep',
    type: 'step',
    title: 'argo.basic.info'
  },
  {
    id: 'showSecrets',
    type: 'hidden',
    active: false
  },
  ///////////////////////  General  /////////////////////////////////////
  {
    id: 'appSetName',
    type: 'Text',
    label: 'argo.create.name',
    placeholder: 'argo.create.placeholder',
    isRequired: true
  },
  {
    id: 'clusterName',
    type: 'Text',
    label: 'argo.cluster.name',
    placeholder: 'argo.cluster.placeholder',
    isRequired: true
  }
]
