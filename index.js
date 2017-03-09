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

  var additionalTypes = [];

  // get the type names of the union's possible types, given its type name
  var addPossibleTypes = function (typeName) {
    // possible typess is a property only of GraphQLUnionType
    // we'd need a different mechanism for interfaces
    var union = _.find(types, {name: typeName});
    var possibleTypes = _.map(union.possibleTypes, 'name');

    // we must also process the union field, as well as its possible types
    additionalTypes = _.union(additionalTypes, possibleTypes, [typeName]);
  };

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
      if (field.type.ofType.kind === 'UNION') {
        addPossibleTypes(field.type.ofType.name);
      }
      obj.type = field.type.ofType.name;
      obj.isUnionType = field.type.ofType.kind === 'UNION';
      obj.isObjectType = field.type.ofType.kind === 'OBJECT';
      obj.isList = field.type.kind === 'LIST';
    } else {
      if (field.type.kind === 'UNION') {
        addPossibleTypes(field.type.name);
      }
      obj.type = field.type.name;
      obj.isUnionType = field.type.kind === 'UNION';
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
          obj.isList = arg.type.kind === 'LIST';
          if (arg.type.ofType.kind === 'NON_NULL') {
            obj.type = field.type.ofType.ofType.name;
            obj.isNestedRequired = true;
          }
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
    fields: fields,
    possibleTypes: _.map(type.possibleTypes, 'name')
  };

  var linkeditems = _.chain(fields)
    .filter('isObjectType')
    .map('type')
    .union(additionalTypes)
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

  // build the graph
  var q = [];
  if (root.queryType) {
    q.push(root.queryType.name);
  }
  // if(root.mutationType) q.push(root.mutationType.name);

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
    q = q.concat(processType(current, entities, root.types));
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

    var rows = _.map(v.fields, function (v) {
      var str = v.name;

      // render args if desired & present
      if (!opts.noargs && v.args && v.args.length) {
        str += '(' + _.map(v.args, function (v) {
          return v.name + ':' + (v.isList ? '[' + v.type + (v.isNestedRequired ? '!' : '') + ']' : v.type) + (v.isRequired ? '!' : '');
        }).join(', ') + ')';
      }
      var deprecationReason = '';
      if (v.isDeprecated) {
        deprecationReason = ' <FONT color="red">';
        deprecationReason += (v.deprecationReason ? v.deprecationReason : 'Deprecated');
        deprecationReason += '</FONT>';
      }
      return {
        text: str + ': ' + (v.isList ? '[' + v.type + (v.isNestedRequired ? '!' : '') + ']' : v.type) + (v.isRequired ? '!' : '') + deprecationReason,
        name: v.name + 'port'
      };
    });
    // rows.unshift("<B>" + v.name + "</B>");
    var result = v.name + ' ';
    result += '[label=<<TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0">';
    result += '<TR><TD PORT="__title"><B>' + v.name + '</B></TD></TR>';
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
      if (f.isObjectType || f.isUnionType) {
        a.push(v.name + ':' + f.name + 'port -> ' + f.type + ':__title');
      }
    });
    _.each(v.possibleTypes, function (p) {
      a.push(v.name + ' -> ' + p + ':__title');
    });

    return a;
  }, [])
  .uniq()
  .value()
  .join('\n');

  dotfile += '\n}';

  return dotfile;
};
