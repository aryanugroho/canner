// @flow

/**
 * Genertaor is a Component that renders the components, layouts
 * with the a given componentTree which is created by qa-compiler
 *
 * First Step, prerender the tree in constructor, this action will add a
 * React Component with all hocs it needs in every node
 *
 * Second Step, take the node.component to render it, and give the component
 * some props it maybe needs such as renderChildren
 */

import React, { useState, useCallback } from 'react';
import RefId from 'canner-ref-id';
import { FORM_TYPE } from '../hooks/useFormType';
import useTree from '../hooks/useTree';
import { isComponent } from '../utils/componentTree';
import type { GeneratorProps, ComponentNode } from './types';

type Props = GeneratorProps;

type childrenProps = {
  refId: RefId,
  [string]: any
};

export default function Generator({ componentTree, routes, formType }: Props) {
  const tree = useTree({ componentTree });
  const [idNodeMap, setIdNodeMap] = useState({});
  const renderComponent = (refId: RefId, props: childrenProps): React$Node => {
    const componentPathArr = refId.getPathArr()
      .filter(path => Number.isNaN(Number(path)));
    const componentPath = componentPathArr.join('/');
    let node = idNodeMap[componentPath];
    const entryKey = componentPathArr[0];
    if (!node) {
      const lastPath = componentPathArr.slice(1);
      if (lastPath.length === 0) {
        node = tree[entryKey];
      } else {
        node = findNode(componentPathArr.slice(), tree[entryKey]);
      }
      setIdNodeMap((nodeMap) => {
        const obj = {
          ...nodeMap,
          [componentPath]: node
        };
        return obj;
      });
    }
    if (!node) {
      throw new Error(`Can't find the node at refId ${refId.toString()}`);
    }
    return renderNode(node, { refId: refId.remove(1), keyName: refId.getPathArr().slice(-1)[0], ...props }, 0);
  };

  const renderChildren = useCallback((node: ComponentNode, props: childrenProps | (child: Node, index: number) => childrenProps): React$Node => {
    // just get the props and call renderNode
    // this method is called by components themselves
    const { children } = node;
    if (children) {
      return children.map((child, index) => {
        const childProps = typeof props === 'function' ? props(child, index) : props;
        if (childProps.hidden) {
          return null;
        }

        if (childProps.mergeNode) {
          // mutate node
          childProps.mergeNode(node);
        }

        return renderNode(child, childProps, index);
      });
    }
    return null;
  });

  const renderNode = useCallback((node: ComponentNode, props: childrenProps, index: number): React$Node => {
    // take the node.component to render it, and give the component
    // some props it maybe needs such as renderChildren
    // eslint-disable-next-line no-unused-vars
    if (!node) {
      throw new Error(`Unexpected Error: Want to render a undefined node with refId '${props.refId.toString()}'`);
    }

    const { component, children, ...restNodeData } = node;
    if (node.hidden || props.hidden) {
      return null;
    }
    if (component) {
      const wrappedRenderChildren = (...args) => {
        if (args.length === 1) {
          return renderChildren(node, args[0]);
        }
        return renderChildren(...args);
      };
      return (
        <node.component

          {...restNodeData} // props directly passed by schema
          {...props} // props from the parent
          childrenNode={children}
          renderComponent={renderComponent}
          data-testid={node.path}
          key={index}
          renderChildren={wrappedRenderChildren}
        />
      );
    }
    return null;
  }, []);
  if (!routes[0] || !tree[routes[0]]) {
    return null;
  }
  // TODO: there should be render differently for different type
  if (formType === FORM_TYPE.LIST) {
    return (
      <div>
        {renderNode(tree[routes[0]], { refId: new RefId('') }, 0)}
      </div>
    );
  }

  if (formType === FORM_TYPE.UPDATE) {
    if (routes.length > 1) {
      // map
      return (
        <div>
          {renderNode(tree[routes[0]], { refId: new RefId('') }, 0)}
        </div>
      );
    }
    // list item
    // TODO: now renderChildren is executed in withCanner hoc,
    // should be fixed here
    return (
      <div>
        {renderNode(tree[routes[0]], { refId: new RefId('') }, 0)}
      </div>
    );
  }

  if (formType === FORM_TYPE.CREATE) {
    return (
      <div>
        {renderNode(tree[routes[0]], { refId: new RefId('') }, 0)}
      </div>
    );
  }

  if (formType === FORM_TYPE.PAGE) {
    return (
      <div>
        {renderNode(tree[routes[0]], { refId: new RefId('') }, 0)}
      </div>
    );
  }
}

export function findNode(pathArr: Array<string>, node: ComponentNode): ?Node {
  let newPathArr = pathArr;
  if (newPathArr[0]) {
    if (isComponent(node) && node.keyName === newPathArr[0]) {
      newPathArr = newPathArr.slice(1);
      if (!newPathArr.length) {
        return node;
      }
    }
  }

  if (node.children) {
    return node.children
      .map(child => findNode(newPathArr, child))
      .find(node => !!node);
  }
}
