import { gql } from 'graphql-modules';

export default gql`
  """
  A graph within a target. A target owns one base graph and any number of contract graphs derived from it.
  """
  interface Graph {
    id: ID!
    """
    The name of the graph. Unique within a target.
    """
    name: String!
    createdAt: DateTime!
    """
    The most recent version of this graph.
    """
    latestVersion: GraphVersion
    """
    The most recent composable version of this graph.
    """
    latestComposableVersion: GraphVersion
    """
    All versions of this graph, newest first.
    """
    versions(first: Int, after: String): GraphVersionConnection!
    """
    A specific version of this graph.
    """
    version(id: ID!): GraphVersion
  }

  """
  The graph composed from all the schemas published to a target.
  Every target has a base graph called 'default'.
  """
  type BaseGraph implements Graph {
    id: ID!
    name: String!
    target: Target!
    createdAt: DateTime!
    latestVersion: BaseGraphVersion
    latestComposableVersion: BaseGraphVersion
    versions(first: Int, after: String): GraphVersionConnection!
    version(id: ID!): BaseGraphVersion
    """
    Contract graphs derived from this graph.
    """
    contractGraphs(first: Int, after: String): ContractGraphConnection!
  }

  """
  A graph derived from a base graph by filtering it via tags.
  """
  type ContractGraph implements Graph {
    id: ID!
    name: String!
    target: Target!
    createdAt: DateTime!
    latestVersion: ContractGraphVersion
    latestComposableVersion: ContractGraphVersion
    versions(first: Int, after: String): GraphVersionConnection!
    version(id: ID!): ContractGraphVersion
    """
    The base graph this contract graph is derived from.
    """
    sourceGraph: BaseGraph!
    includeTags: [String!]
    excludeTags: [String!]
    removeUnreachableTypesFromPublicApiSchema: Boolean!
  }

  type ContractGraphEdge {
    node: ContractGraph!
    cursor: String!
  }

  type ContractGraphConnection {
    edges: [ContractGraphEdge!]!
    pageInfo: PageInfo!
  }

  """
  The state of a graph at a point in time.
  """
  interface GraphVersion {
    id: ID!
    createdAt: DateTime!
    """
    Whether this graph version is composable.
    """
    isComposable: Boolean!
    """
    Whether this is the first composable version of the graph.
    """
    isFirstComposableVersion: Boolean!
    """
    Whether this graph version has schema changes compared to the previous diffable version.
    """
    hasSchemaChanges: Boolean!
    schemaCompositionErrors: SchemaErrorConnection
    """
    The supergraph SDL. Only available for federation projects.
    """
    supergraphSdl: String
    """
    The public API schema SDL.
    """
    sdl: String
    """
    Tags used within the graph version. E.g. when using Federation.
    """
    tags: [String!]
    """
    Schema changes compared to the previous diffable version.
    """
    schemaChanges: SchemaChangeConnection
    breakingSchemaChanges: SchemaChangeConnection
    safeSchemaChanges: SchemaChangeConnection
    previousGraphVersion: GraphVersion
    """
    The version against which schema changes were computed.
    """
    previousDiffableGraphVersion: GraphVersion
  }

  type BaseGraphVersion implements GraphVersion {
    id: ID!
    graph: BaseGraph!
    createdAt: DateTime!
    schemaVersion: SchemaVersion!
    isComposable: Boolean!
    isFirstComposableVersion: Boolean!
    hasSchemaChanges: Boolean!
    schemaCompositionErrors: SchemaErrorConnection
    supergraphSDL: String
    sdl: String
    tags: [String!]
    schemaChanges: SchemaChangeConnection
    breakingSchemaChanges: SchemaChangeConnection
    safeSchemaChanges: SchemaChangeConnection
    previousGraphVersion: BaseGraphVersion
    previousDiffableGraphVersion: BaseGraphVersion
  }

  type ContractGraphVersion implements GraphVersion {
    id: ID!
    graph: ContractGraph!
    createdAt: DateTime!
    schemaVersion: SchemaVersion!
    isComposable: Boolean!
    isFirstComposableVersion: Boolean!
    hasSchemaChanges: Boolean!
    schemaCompositionErrors: SchemaErrorConnection
    supergraphSDL: String
    sdl: String
    tags: [String!]
    schemaChanges: SchemaChangeConnection
    breakingSchemaChanges: SchemaChangeConnection
    safeSchemaChanges: SchemaChangeConnection
    previousGraphVersion: ContractGraphVersion
    previousDiffableGraphVersion: ContractGraphVersion
  }

  type GraphVersionEdge {
    node: GraphVersion!
    cursor: String!
  }

  type GraphVersionConnection {
    edges: [GraphVersionEdge!]!
    pageInfo: PageInfo!
  }
`;
