/*******************************************************************************
 * Licensed Materials - Property of IBM
 * (c) Copyright IBM Corporation 2017, 2019. All Rights Reserved.
 *
 * US Government Users Restricted Rights - Use, duplication or disclosure
 * restricted by GSA ADP Schedule Contract with IBM Corp.
 *******************************************************************************/
import {
  getResourcesStatusPerChannel,
  getAllRelatedForList,
  removeDuplicatesFromList
} from '../PipelineGrid/utils'
// import { CEMIncidentList } from '../../../../../lib/client/queries'

// Method will take in an object and return back the status of related objects
// returns [completed + unidentified, fail, inprogress + pending]
// Given the tall count of completed + unidentified, fail, inprogress + pending
export const getAllDeployablesStatus = list => {
  const statusPassFailInProgress = [0, 0, 0]
  if (list && list.items instanceof Array && list.items.length > 0) {
    list.items.map(item => {
      // Will return back status as:
      // [0, 0, 0, 0, 0]
      // Pass, Fail, InProgress, Pending, Unidentified
      const status = getResourcesStatusPerChannel(item, false)
      statusPassFailInProgress[0] =
        statusPassFailInProgress[0] + status[0] + status[4]
      statusPassFailInProgress[1] = statusPassFailInProgress[1] + status[1]
      statusPassFailInProgress[2] =
        statusPassFailInProgress[2] + status[2] + status[3]
    })
  }
  return statusPassFailInProgress
}

export const getNumClusters = applications => {
  //use application clusters related objects
  const clusters = getAllRelatedForList(applications, 'cluster')

  return clusters.length > 0 ? clusters.length - 1 : 0
}

export const getNumIncidents = list => {
  if (list && list.items && Array.isArray(list.items)) {
    return list.items.length
  }
  return 0
}

export const getApplicationName = list => {
  if (
    list &&
    list.items instanceof Array &&
    list.items.length > 0 &&
    list.items[0].name
  ) {
    return list.items[0].name
  }
  return ''
}

export const getApplicationNamespace = list => {
  if (
    list &&
    list.items instanceof Array &&
    list.items.length > 0 &&
    list.items[0].namespace
  ) {
    return list.items[0].namespace
  }
  return ''
}

export const getSingleApplicationObject = list => {
  if (list && list.items instanceof Array && list.items.length > 0) {
    return list.items[0]
  }
  return ''
}

export const getChannelsCountFromSubscriptions = arr => {
  const channelSet = new Set()
  if (arr instanceof Array && arr.length > 0) {
    arr.map(elem => {
      if (elem && elem.items instanceof Array && elem.items.length > 0) {
        elem.items.map(subelem => {
          if (
            subelem.channel &&
            !subelem._hostingSubscription &&
            (!subelem.status ||
              (subelem.status && subelem.status != 'Subscribed'))
          ) {
            // count only hub subscriptions
            channelSet.add(subelem.channel)
          }
        })
      }
    })
  }
  return channelSet.size
}

export const getNumPlacementRules = (
  subscriptions,
  isSingleApplicationView,
  subscriptionNamespace
) => {
  if (subscriptions && subscriptions.items) {
    var allPlacementRules = []
    var placementRulesCount = 0

    // Single application view
    if (isSingleApplicationView) {
      Object.keys(subscriptions.items).map(subIndex => {
        // Get number of placement rules for the current application opened
        if (
          subscriptions.items[subIndex].namespace === subscriptionNamespace
        ) {
          const subData = subscriptions.items[subIndex]
          // Placement rule data found in "related" object
          if (subData.related) {
            Object.keys(subData.related).map(kindIndex => {
              if (
                subData.related[kindIndex].kind.toLowerCase() ===
                'placementrule'
              ) {
                placementRulesCount += subData.related[kindIndex].items.length
              }
            })
          }
        }
      })
    } else {
      // Root application view
      // Get number of placement rules for all applications
      Object.keys(subscriptions.items).map(subIndex => {
        const subData = subscriptions.items[subIndex]
        // Placement rule data found in "related" object
        if (subData.related) {
          Object.keys(subData.related).map(kindIndex => {
            if (
              subData.related[kindIndex].kind.toLowerCase() === 'placementrule'
            ) {
              const placementRules = subData.related[kindIndex].items
              Object.keys(placementRules).map(prIndex => {
                const prObj = {
                  name: placementRules[prIndex].name,
                  namespace: placementRules[prIndex].namespace
                }
                allPlacementRules = allPlacementRules.concat(prObj)
              })
            }
          })
        }
      })
      // Remove duplicate placement rules (that were found in more than one app)
      allPlacementRules = removeDuplicatesFromList(allPlacementRules)
      placementRulesCount = allPlacementRules.length
    }
    return placementRulesCount
  }
  return 0
}

export const getSubscriptionDataOnHub = (
  applications,
  isSingleApplicationView,
  applicationName,
  applicationNamespace
) => {
  var allSubscriptions = []
  var failedSubsCount = 0
  var noStatusSubsCount = 0

  if (applications && applications.items) {
    // Single application view
    if (isSingleApplicationView) {
      Object.keys(applications.items).map(appIndex => {
        // Get number of subscriptions for the current application opened
        if (
          applications.items[appIndex].name === applicationName &&
          applications.items[appIndex].namespace === applicationNamespace
        ) {
          const appData = applications.items[appIndex]
          // Hub subscription data found in "related" object
          if (appData.related) {
            Object.keys(appData.related).map(kindIndex => {
              if (
                appData.related[kindIndex].kind.toLowerCase() === 'subscription'
              ) {
                const subscriptions = appData.related[kindIndex].items
                Object.keys(subscriptions).map(subIndex => {
                  // Increment "no status" and "failed" counts based on the subscription's status
                  if (subscriptions[subIndex].status === '') {
                    noStatusSubsCount++
                  } else if (subscriptions[subIndex].status.toLowerCase() !== 'propagated') {
                    failedSubsCount++
                  }
                })
              }
            })
          }
        }
      })
    } else {
      // Root application view
      // Get number of subscriptions for all applications
      Object.keys(applications.items).map(appIndex => {
        const appData = applications.items[appIndex]
        // Hub subscription data found in "related" object
        if (appData.related) {
          Object.keys(appData.related).map(kindIndex => {
            if (
              appData.related[kindIndex].kind.toLowerCase() === 'subscription'
            ) {
              const subscriptions = appData.related[kindIndex].items
              Object.keys(subscriptions).map(subIndex => {
                const subObj = {
                  name: subscriptions[subIndex].name,
                  namespace: subscriptions[subIndex].namespace,
                  status: subscriptions[subIndex].status
                }
                allSubscriptions = allSubscriptions.concat(subObj)
              })
            }
          })
        }
      })
      // Remove duplicate subscriptions (that were found in more than one app)
      allSubscriptions = removeDuplicatesFromList(allSubscriptions)

      // Increment "no status" and "failed" counts using the new non-duplicate subscriptions list
      Object.keys(allSubscriptions).map(key => {
        if (allSubscriptions[key].status === '') {
          noStatusSubsCount++
        } else if (
          allSubscriptions[key].status.toLowerCase() !== 'propagated'
        ) {
          failedSubsCount++
        }
      })
    }
  }

  return {
    failed: failedSubsCount,
    noStatus: noStatusSubsCount
  }
}

export const getSubscriptionDataOnManagedClusters = (
  applications,
  isSingleApplicationView,
  applicationName,
  applicationNamespace
) => {
  var allSubscriptions = []
  var failedSubsCount = 0
  var noStatusSubsCount = 0

  if (applications && applications.items) {
    // Single application view
    if (isSingleApplicationView) {
      Object.keys(applications.items).map(appIndex => {
        // Get number of managed cluster subs for the current application opened
        if (
          applications.items[appIndex].name === applicationName &&
          applications.items[appIndex].namespace === applicationNamespace
        ) {
          const appData = applications.items[appIndex]
          // Managed cluster subscription data found in "remoteSubs" object
          if (appData.remoteSubs) {
            Object.keys(appData.remoteSubs).map(kindIndex => {
              const sub = appData.remoteSubs[kindIndex]
              const subObj = {
                name: sub.name,
                namespace: sub.namespace,
                status: sub.status
              }
              allSubscriptions = allSubscriptions.concat(subObj)
            })
          }
        }
      })
    } else {
      // Root application view
      // Get number of managed cluster subs for all applications
      Object.keys(applications.items).map(appIndex => {
        const appData = applications.items[appIndex]
        // Managed cluster subscription data found in "remoteSubs" object
        if (appData.remoteSubs) {
          Object.keys(appData.remoteSubs).map(kindIndex => {
            const sub = appData.remoteSubs[kindIndex]
            const subObj = {
              name: sub.name,
              namespace: sub.namespace,
              status: sub.status
            }
            allSubscriptions = allSubscriptions.concat(subObj)
          })
        }
      })
    }

    // Remove duplicate managed cluster subs (that were found in more than one app)
    allSubscriptions = removeDuplicatesFromList(allSubscriptions)

    // Increment "no status" and "failed" counts using the new non-duplicate subscriptions list
    Object.keys(allSubscriptions).map(key => {
      if (allSubscriptions[key].status === '') {
        noStatusSubsCount++
      } else if (
        allSubscriptions[key].status.toLowerCase() !== 'subscribed'
      ) {
        failedSubsCount++
      }
    })

  }

  return {
    total: allSubscriptions.length,
    failed: failedSubsCount,
    noStatus: noStatusSubsCount
  }
}

export const getPodData = (
  applications,
  applicationName,
  applicationNamespace
) => {
  var allPods = 0
  var runningPods = 0
  var failedPods = 0

  if (applications && applications.items) {
    Object.keys(applications.items).map(appIndex => {
      // Get pod data for the current application opened
      if (
        applications.items[appIndex].name === applicationName &&
        applications.items[appIndex].namespace === applicationNamespace
      ) {
        const appData = applications.items[appIndex]
        // Pod data found in "related" object
        if (appData.related) {
          Object.keys(appData.related).map(kindIndex => {
            if (appData.related[kindIndex].kind.toLowerCase() === 'pod') {
              const pods = appData.related[kindIndex].items
              Object.keys(pods).map(podIndex => {
                const podStatus = pods[podIndex].status
                allPods++
                if (
                  podStatus.toLowerCase() === 'deployed' ||
                  podStatus.toLowerCase() === 'pass' ||
                  podStatus.toLowerCase() === 'running'
                ) {
                  runningPods++
                } else if (
                  podStatus.toLowerCase().includes('fail') ||
                  podStatus.toLowerCase().includes('error') ||
                  podStatus.toLowerCase() === 'imagepullbackoff'
                ) {
                  failedPods++
                }
              })
            }
          })
        }
      }
    })
  }

  return {
    total: allPods,
    running: runningPods,
    failed: failedPods
  }
}

export const getPolicyViolationData = (
  applications,
  applicationName,
  applicationNamespace
) => {
  var VAViolations = 0
  var MAViolations = 0

  if (applications && applications.items) {
    Object.keys(applications.items).map(appIndex => {
      // Get policy violation data for the current application opened
      if (
        applications.items[appIndex].name === applicationName &&
        applications.items[appIndex].namespace === applicationNamespace
      ) {
        const appData = applications.items[appIndex]
        // Policy violation data found in "related" object
        if (appData.related) {
          Object.keys(appData.related).map(kindIndex => {
            if (
              appData.related[kindIndex].kind.toLowerCase() === 'mutationpolicy'
            ) {
              MAViolations = appData.related[kindIndex].items.length
            }
            if (
              appData.related[kindIndex].kind.toLowerCase() ===
              'vulnerabilitypolicy'
            ) {
              VAViolations = appData.related[kindIndex].items.length
            }
          })
        }
      }
    })
  }

  return {
    VAViolations: VAViolations,
    MAViolations: MAViolations
  }
}

export const getIncidentData = CEMIncidentList => {
  var priority1 = 0
  var priority2 = 0

  // Get incidents data for the current application opened
  if (CEMIncidentList && CEMIncidentList.items) {
    Object.keys(CEMIncidentList.items).map(listIndex => {
      const item = CEMIncidentList.items[listIndex]
      if (item.priority == 1) {
        priority1++
      } else if (item.priority == 2) {
        priority2++
      }
    })
  }

  return {
    priority1: priority1,
    priority2: priority2
  }
}