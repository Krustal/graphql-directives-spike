const lifts = require("./data/lifts.json");
const trails = require("./data/trails.json");

const { ApolloServer, PubSub } = require("apollo-server");
const { readFileSync } = require("fs");
const typeDefs = readFileSync("src/typeDefs.graphql", "UTF-8");
const { GraphQLScalarType } = require("graphql");
const { Kind } = require("graphql/language");
const directives = require("./src/directives");

const pubsub = new PubSub();

const resolvers = {
  Date: new GraphQLScalarType({
    name: "Date",
    description: "Date custom scalar type",
    parseValue(value) {
      return new Date(value); // value from the client
    },
    serialize(value) {
      return value.getTime(); // value sent to the client
    },
    parseLiteral(ast) {
      if (ast.kind === Kind.INT) {
        return new Date(ast.value); // ast value is always in string format
      }
      return null;
    }
  }),
  SearchResult: {
    __resolveType: parent => (parent.difficulty ? "Trail" : "Lift")
  },
  Trail: {
    accessedByLifts: parent =>
      parent.lift
        .map(liftId => lifts.find(lift => lift.id === liftId))
        .filter(x => x)
  },
  Lift: {
    trailAccess: parent =>
      parent.trails
        .map(trailId => trails.find(trail => trail.id === trailId))
        .filter(x => x)
  },
  Query: {
    liftCount: parent => {
      throw new Error("oh noes!");
      return lifts.length;
    },
    trailCount: () => trails.length,
    lifts: (_parent, { status }) =>
      status ? lifts.filter(lift => lift.status === status) : lifts,
    trails: (_parent, { status }) =>
      status ? trails.filter(trail => trail.status === status) : trails,
    search: (_parent, { query }) => {
      const queryMatcher = new RegExp(query, "i");
      return [...trails, ...lifts].filter(result =>
        queryMatcher.test(result.id)
      );
    }
  },
  Mutation: {
    setLiftStatus: (_parent, { liftId, status }, { pubsub }) => {
      const lift = lifts.find(lift => lift.id === liftId);
      lift.status = status;
      pubsub.publish("lift-status-change", { liftStatusChange: lift });
      return lift;
    },
    setTrailStatus: (_parent, { trailId, status }) => {
      const trail = trails.find(trail => trail.id === trailId);
      trail.status = status;
      pubsub.publish("trail-status-change", { trailStatusChange: trail });
      return trail;
    }
  },
  Subscription: {
    liftStatusChange: {
      subscribe: (root, args, { pubsub }) =>
        pubsub.asyncIterator("lift-status-change")
    },
    trailStatusChange: {
      subscribe: (root, args, { pubsub }) =>
        pubsub.asyncIterator("trail-status-change")
    }
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: {
    pubsub
  },
  schemaDirectives: {
    auth: directives
  }
});

server.listen().then(c => console.log(`started on: ${c.url}`));
