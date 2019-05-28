// @flow
import React, { useContext, useMemo } from 'react';
import gql from 'graphql-tag';
import { Context } from 'canner-helpers';
import { Query } from 'react-apollo';
import { List } from 'react-content-loader';

export default function withQuery(Com: any) {
  return function ComWithQuery(props: any) {
    const {
      graphql, variables, transformData, renderChildren, ...restProps
    } = props;
    const contextValue = useContext(Context);
    if (!graphql) {
      return (
        <div data-testid={props['data-testid']}>
          <Com {...restProps} />
        </div>
      );
    }
    const myContextValue = useMemo(() => ({
      ...contextValue,
      renderChildren,
    }), [renderChildren]);
    return (
      <Query query={gql`${graphql}`} variables={variables}>
        {({
          loading, error, data, ...graphqlProps
        }) => {
          if (loading) return <List style={{ maxWidth: '600px' }} />;
          if (error) return `Error!: ${error.toString()}`;
          const key = Object.keys(data || {})[0];
          let value = (data: any)[key];
          if (Array.isArray(value)) {
            // delete symbol in every item to let vega works
            value = value.map(v => ({ ...v }));
          }
          if (transformData) {
            value = transformData(value);
          }
          return (
            <Context.Provider value={myContextValue}>
              <div data-testid={props['data-testid']}>
                <Com value={value} {...restProps} {...graphqlProps} {...myContextValue} />
              </div>
            </Context.Provider>
          );
        }}
      </Query>
    );
  };
}
