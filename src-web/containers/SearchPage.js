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
import PropTypes from 'prop-types'
import { Query } from 'react-apollo'
import gql from 'graphql-tag'
import { connect } from 'react-redux'
import { withRouter } from 'react-router-dom'
import { updateSecondaryHeader } from '../actions/common'
import msgs from '../../nls/platform.properties'
import Page from '../components/common/Page'
import SearchInput from '../components/search/SearchInput'
import SearchResult from '../components/search/SearchResult'


const GET_SEARCH_INPUT_TEXT = gql`
  {
    searchInput @client {
      text
    }
  }
`
const SEARCH_QUERY = gql`
  query searchResult($keywords: [String], $filters: [SearchFilter]) {
    searchResult: search(keywords: $keywords, filters: $filters){
      items
      relatedResources {
        kind
        count
      }
    }
  }
`

class SearchPage extends React.Component {
  static propTypes = {
    secondaryHeaderProps: PropTypes.object,
    updateSecondaryHeader: PropTypes.func,
  }


  componentWillMount() {
    const { updateSecondaryHeader, secondaryHeaderProps } = this.props
    updateSecondaryHeader(msgs.get(secondaryHeaderProps.title, this.context.locale))
  }

  render() {
    return (
      <Page>
        <SearchInput />
        <Query query={GET_SEARCH_INPUT_TEXT}>
          {( { data } ) => {
            if(data && data.searchInput && data.searchInput.text !== '') {
              const searchText = data.searchInput.text
              const searchTokens = searchText.split(' ')
              const keywords = searchTokens.filter(token => token !== '' && token.indexOf(':') < 0)
              const filters = searchTokens.filter(token => token.indexOf(':') >= 0)
                .map(f => ({filter: f.split(':')[0], value: f.split(':')[1]}) )
                .filter(f => f.filter !== '' && f.value !== '')
              return (
                <Query query={SEARCH_QUERY} variables={{ keywords, filters}}>
                  {({ data, loading }) => {
                    if (data.searchResult || loading) {
                      return (<SearchResult searchResult={data.searchResult} loading={loading} />)
                    }
                    return (
                      <div>
                        <br></br>
                        <p>{msgs.get('search.noresults', this.context.locale)}</p>
                      </div>
                    )
                  }}
                </Query>
              )
            }
            return null
          }
          }
        </Query>
      </Page>
    )
  }
}

SearchPage.contextTypes = {
  locale: PropTypes.string
}


const mapDispatchToProps = dispatch => {
  return {
    updateSecondaryHeader: title => dispatch(updateSecondaryHeader(title))
  }
}

export default withRouter(connect(null, mapDispatchToProps)(SearchPage))