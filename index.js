// Shamelessly copied from:
// https://github.com/NathanRSmith/graphql-visualizer

var _ = require('lodash');
var graphql = require('graphql');

module.exports.query = graphql.introspectionQuery;
// console.log(module.exports.query);

// process a graphql type object
// returns simplified version of the type
function processType(item, entities, types) {
  var type = _.find(types, {name: item});

  var fields = _.map(type.fields, function (field) {
    var obj = {};
    obj.name = field.name;
    obj.isDeprecated = field.isDeprecated;
    obj.deprecationReason = field.deprecationReason;

    // process field type
    // if NON_NULL, hoist the nested type out
    if (field.type.kind === 'NON_NULL') {
      field.type = field.type.ofType;
      obj.isRequired = true;
    }

    if (field.type.ofType) {
      // if nested type is NON_NULL, hoist the nested-nested type out
      if (field.type.ofType.kind === 'NON_NULL') {
        field.type.ofType = field.type.ofType.ofType;
        obj.isNestedRequired = true;
      }
      obj.type = field.type.ofType.name;
      obj.isObjectType = field.type.ofType.kind === 'OBJECT';
      obj.isList = field.type.kind === 'LIST';
    } else {
      obj.type = field.type.name;
      obj.isObjectType = field.type.kind === 'OBJECT';
    }

    // process args
    if (field.args && field.args.length) {
      obj.args = _.map(field.args, function (arg) {
        var obj = {};
        obj.name = arg.name;
        if (arg.type.ofType) {
          obj.type = arg.type.ofType.name;
          obj.isRequired = arg.type.kind === 'NON_NULL';
        } else {
          obj.type = arg.type.name;
        }
        return obj;
      });
    }

    return obj;
  });

  entities[type.name] = {
    name: type.name,
    fields: fields
  };

  var linkeditems = _.chain(fields)
    .filter('isObjectType')
    .map('type')
    .uniq()
    .value();

  return linkeditems;
}

// walks the object in level-order
// invokes iter at each node
// if iter returns truthy, breaks & returns the value
// assumes no cycles
function walkBFS(obj, iter) {
  var q = _.map(_.keys(obj), function (k) {
    return {key: k, path: '["' + k + '"]'};
  });

  var current;
  var currentNode;
  var retval;
  var push = function (v, k) {
    q.push({key: k, path: current.path + '["' + k + '"]'});
  };
  while (q.length) {
    current = q.shift();
    currentNode = _.get(obj, current.path);
    retval = iter(currentNode, current.key, current.path);
    if (retval) {
      return retval;
    }

    if (_.isPlainObject(currentNode) || _.isArray(currentNode)) {
      _.each(currentNode, push);
    }
  }
}

const SchemaTypeSymbol = '__GraphQLVizSchema__';

function getGraphRoot(root) {
  // If there is only one of queryType, mutationType, or subscriptionType, use
  // that as the root. Otherwise root as the schema and treat
  // query/mutation/subscription as fields of that.
  const rootTypes = ['query', 'mutation', 'subscription']
    .map(function (name) {
      return {
        name: name,
        type: root[name + 'Type']
      };
    })
    .filter(function (t) {
      return t.type;
    });

  if (rootTypes.length === 1) {
    return {
      q: [rootTypes[0].type.name],
      types: root.types
    };
  }

  return {
    q: [SchemaTypeSymbol],
    types: root.types.concat({
      name: SchemaTypeSymbol,
      fields: rootTypes.map(function (rt) {
        return {
          name: rt.name,
          type: {
            name: rt.type.name,
            kind: 'OBJECT',
            ofType: null
          }
        };
      })
    })
  };
}

function getTypeDisplayName(typeName) {
  if (typeName === SchemaTypeSymbol) {
    return 'Schema';
  }
  return typeName;
}

module.exports.render = function (schema, opts) {
  opts = opts || {};

  if (_.isString(schema)) {
    schema = JSON.parse(schema);
  }

  if (!_.isPlainObject(schema)) {
    throw new Error('Must be plain object');
  }

  // find entry points
  var rootPath = walkBFS(schema, function (v, k, p) {
    if (k === '__schema') {
      return p;
    }
  });
  if (!rootPath) {
    throw new Error('Cannot find "__schema" object');
  }

  var root = _.get(schema, rootPath);
  var graphRoot = getGraphRoot(root);
  var q = graphRoot.q;
  var types = graphRoot.types;

  // walk the graph & build up nodes & edges
  var current;
  var entities = {};
  while (q.length) {
    current = q.shift();

    // if item has already been processed
    if (entities[current]) {
      continue;
    }

    // process item
    q = q.concat(processType(current, entities, types));
  }

  // build the dot
  var dotfile = 'digraph erd {\n' +
    'graph [\n' +
    '  rankdir = "LR"\n' +
    '];\n' +
    'node [\n' +
    '  fontsize = "16"\n' +
    '  shape = "plaintext"\n' +
    '];\n' +
    'edge [\n' +
    '];\n';

  // nodes
  dotfile += _.map(entities, function (v) {
    // sort if desired
    if (opts.sort) {
      v.fields = _.sortBy(v.fields, 'name');
    }
    var rows = _.map(v.fields, function (f) {
      var str = f.name;

      // render args if desired & present
      if (!opts.noargs && f.args && f.args.length) {
        str += '(' + _.map(f.args, function (a) {
          return a.name + ':' + getTypeDisplayName(a.type) + (a.isRequired ? '!' : '');
        }).join(', ') + ')';
      }
      var deprecationReason = '';
      if (f.isDeprecated) {
        deprecationReason = ' <FONT color="red">';
        deprecationReason += (f.deprecationReason ? f.deprecationReason : 'Deprecated');
        deprecationReason += '</FONT>';
      }
      return {
        text: str + ': ' + (f.isList ? '[' + f.type + (f.isNestedRequired ? '!' : '') + ']' : getTypeDisplayName(f.type)) + (f.isRequired ? '!' : '') + deprecationReason,
        name: f.name + 'port'
      };
    });
    // rows.unshift("<B>" + getTypeDisplayName(v.name) + "</B>");
    var result = v.name + ' ';
    result += '[label=<<TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0">';
    result += '<TR><TD><B>' + getTypeDisplayName(v.name) + '</B></TD></TR>';
    result += rows.map(function (row) {
      return '<TR><TD PORT="' + row.name + '">' + row.text + '</TD></TR>';
    });
    result += '</TABLE>>];';
    return result;
  //  return v.name + ' [label=<<TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0"><TR><TD>' + rows.join('</TD></TR><TR><TD>') + '</TD></TR></TABLE>>];';
  }).join('\n');

  dotfile += '\n\n';

  // edges
  dotfile += _.chain(entities)
  .reduce(function (a, v) {
    _.each(v.fields, function (f) {
      if (!f.isObjectType) {
        return;
      }

      a.push(v.name + ':' + f.name + 'port -> ' + f.type);
    });

    return a;
  }, [])
  .uniq()
  .value()
  .join('\n');

  dotfile += '\n}';

  return dotfile;
};
