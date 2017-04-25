// Shamelessly copied from:
// https://github.com/NathanRSmith/graphql-visualizer

var _ = require('lodash')
var graphql = require('graphql')

module.exports.query = graphql.introspectionQuery
module.exports.theme = {
  header: {
    invert: false
  },
  anchor: {
    input: false,
    header: false
  },
  edgesToSelf: false,
  field: {
    align: 'CENTER',
    hideSeperators: false,
    colorArgs: false,
    sort: false,
    noargs: false
  },
  edgeLabels: {
    input: '',
    union: '',
    interface: ''
  },
  types: {
    color: 'BLACK',
    hide: false,
    group: false,
    groupLabel: 'Types',
    stereotype: null
  },
  inputs: {
    color: 'BLACK',
    hide: false,
    group: false,
    groupLabel: 'Input Types',
    stereotype: 'input'
  },
  enums: {
    color: 'BLACK',
    hide: false,
    group: false,
    groupLabel: 'Enum Types',
    stereotype: 'enumeration'
  },
  interfaces: {
    color: 'BLACK',
    hide: false,
    group: false,
    groupLabel: 'Interface Types',
    stereotype: 'interface'
  },
  unions: {
    color: 'BLACK',
    hide: false,
    group: false,
    groupLabel: 'Unions',
    stereotype: 'union'
  }
}

// place to store templates so they only need to be created once
var templates = {}

// analyzes a field and returns a simplified object
function analyzeField (field) {
  var obj = {}
  var namedType = field.type
  obj.name = field.name
  obj.isDeprecated = field.isDeprecated
  obj.deprecationReason = field.deprecationReason
  obj.defaultValue = field.defaultValue
  if (namedType.kind === 'NON_NULL') {
    obj.isRequired = true
    namedType = namedType.ofType
  } else {
    obj.isRequired = false
  }
  if (namedType.kind === 'LIST') {
    obj.isList = true
    namedType = namedType.ofType
  } else {
    obj.isList = field.type.kind === 'LIST'
  }
  if (namedType.kind === 'NON_NULL') {
    obj.isNestedRequired = true
    namedType = namedType.ofType
  } else {
    obj.isNestedRequired = false
  }
  obj.type = namedType.name
  obj.isUnionType = namedType.kind === 'UNION'
  obj.isObjectType = namedType.kind === 'OBJECT'
  obj.isEnumType = namedType.kind === 'ENUM'
  obj.isInterfaceType = namedType.kind === 'INTERFACE'
  obj.isInputType = namedType.kind === 'INPUT_OBJECT'
  return obj
}

// process a graphql type object
// returns simplified version of the type
function processType (item, entities, types) {
  var type = _.find(types, {name: item})

  var additionalTypes = []
  // get the type names of the union or interface's possible types, given its type name
  var addPossibleTypes = typeName => {
    var union = _.find(types, {name: typeName})
    var possibleTypes = _.map(union.possibleTypes, 'name')

    // we must also process the union/interface type, as well as its possible types
    additionalTypes = _.union(additionalTypes, possibleTypes, [typeName])
  }

  var fields = _.map(type.fields, field => {
    var obj = analyzeField.call(this, field)

    if (
      (obj.isUnionType && !this.theme.unions.hide) ||
      (obj.isInterfaceType && !this.theme.interfaces.hide)
    ) {
      addPossibleTypes(obj.type)
    }

    // process args
    if (!this.theme.field.noargs) {
      if (field.args && field.args.length) {
        obj.args = _.map(field.args, analyzeField.bind(this))
      }
    }

    return obj
  })

  entities[type.name] = {
    name: type.name,
    fields: fields,
    isObjectType: true,
    isInterfaceType: type.kind === 'INTERFACE',
    isUnionType: type.kind === 'UNION',
    possibleTypes: _.map(type.possibleTypes, 'name')
  }

  var linkeditems = _.chain(fields)
    .filter('isObjectType')
    .map('type')
    .union(additionalTypes)
    .uniq()
    .value()

  return linkeditems
}

// process a graphql input type object
// returns simplified version of the input type
function processEnumType (type) {
  var fields = _.map(type.enumValues, enumValue => {
    var field = _.cloneDeep(enumValue)
    field.isEnumValue = true
    return field
  })
  return {
    name: type.name,
    isEnumType: true,
    fields: fields
  }
}

// process a graphql input type object
// returns simplified version of the input type
function processInputType (type) {
  var fields = _.map(type.inputFields, analyzeField.bind(this))
  return {
    name: type.name,
    isInputType: true,
    fields: fields
  }
}

// walks the object in level-order
// invokes iter at each node
// if iter returns truthy, breaks & returns the value
// assumes no cycles
function walkBFS (obj, iter) {
  var q = _.map(_.keys(obj), k => {
    return {key: k, path: '["' + k + '"]'}
  })

  var current
  var currentNode
  var retval
  var push = (v, k) => {
    q.push({key: k, path: current.path + '["' + k + '"]'})
  }
  while (q.length) {
    current = q.shift()
    currentNode = _.get(obj, current.path)
    retval = iter(currentNode, current.key, current.path)
    if (retval) {
      return retval
    }

    if (_.isPlainObject(currentNode) || _.isArray(currentNode)) {
      _.each(currentNode, push)
    }
  }
}

var SchemaTypeSymbol = '__GraphQLVizSchema__'

function getGraphRoot (root) {
  // If there is only one of queryType, mutationType, or subscriptionType, use
  // that as the root. Otherwise root as the schema and treat
  // query/mutation/subscription as fields of that.
  var rootTypes = ['query', 'mutation', 'subscription']
    .map(name => {
      return {
        name: name,
        type: root[name + 'Type']
      }
    })
    .filter(t => {
      return t.type
    })

  if (rootTypes.length === 1) {
    return {
      q: [rootTypes[0].type.name],
      types: root.types
    }
  }

  return {
    q: [SchemaTypeSymbol],
    types: root.types.concat({
      name: SchemaTypeSymbol,
      fields: rootTypes.map(rt => {
        return {
          name: rt.name,
          type: {
            name: rt.type.name,
            kind: 'OBJECT',
            ofType: null
          }
        }
      })
    })
  }
}

function getTypeDisplayName (typeName) {
  if (typeName === SchemaTypeSymbol) {
    return 'Schema'
  }
  return typeName
}

// get if the object type is enabled
function isEnabled (obj) {
  var enabled = false
  if (obj.isEnumType) {
    enabled = !this.theme.enums.hide
  } else if (obj.isInputType) {
    enabled = !this.theme.inputs.hide
  } else if (obj.isInterfaceType) {
    enabled = !this.theme.interfaces.hide
  } else if (obj.isUnionType) {
    enabled = !this.theme.unions.hide
  } else {
    enabled = true
  }
  return enabled
}

// get the color for the given field
function getColor (obj) {
  var color = this.theme.types.color
  if (obj.isEnumType && !this.theme.enums.hide) {
    color = this.theme.enums.color
  } else if (obj.isInputType && !this.theme.inputs.hide) {
    color = this.theme.inputs.color
  } else if (obj.isInterfaceType && !this.theme.interfaces.hide) {
    color = this.theme.interfaces.color
  } else if (obj.isUnionType && !this.theme.unions.hide) {
    color = this.theme.unions.color
  }
  return color
}

templates.edge = _.template(
  '${ "\\"" + leftNode.name + "\\"" + (leftNode.port ? ":" + leftNode.port : "")} -> ${ "\\"" + rightNode.name + "\\"" + (rightNode.port ? ":" + rightNode.port : "")}${ _.isEmpty(attributes) ? "" : " [" + attributes.join(" ") + "]"};'
)
templates.edgeAttr = _.template(
  '${ name }=${ _.isString(value) ? "\\"" + value + "\\"" : value }'
)

// for the given input, creates the edge description, for example:
// `createEdge({from: {typeName: 'Foo'}, to: {typeName: 'Bar'}})`
// would output:
// `"Foo" -> "Bar"`
function createEdge (input) {
  var headerPort = this.theme.anchor.header ? '__title' : null
  var context = {
    leftNode: {
      name: input.from.typeName,
      port: input.from.fieldName ? input.from.fieldName + 'port' : headerPort
    },
    rightNode: {
      name: input.to.typeName,
      port: input.to.fieldName ? input.to.fieldName + 'port:w' : headerPort
    },
    attributes: {
      color: input.color,
      fontcolor: input.color,
      label: input.label,
      weight: input.weight
    }
  }
  // converts {a: 'FOO', bar: 2} to ['a="FOO"', 'bar=2'];
  var attributes = _.reduce(
    context.attributes,
    (result, value, name) => {
      if (!_.isEmpty(value)) {
        result.push(templates.edgeAttr({name: name, value: value}))
      }
      return result
    },
    []
  )
  return templates.edge(_.merge({}, context, {attributes: attributes}))
}

templates.field = _.template(
  '${name}${_.isEmpty(args) ? "" : "(" + args.join(", ") +")"}: ${type}${notes ? " " + notes : ""}'
)
templates.fieldType = _.template(
  '${isList ? "[" : ""}${type}${isNestedRequired ? "!" : ""}${isList ? "]" : ""}${isRequired ? "!" : ""}'
)

// creates the field text, including return type and arguments (colored if
// `fields.colorArgs` is true)
function createField (field) {
  var output = ''
  var notes = field.isDeprecated
    ? '<FONT COLOR="RED">' +
        (field.deprecationReason || 'Deprecated') +
        '</FONT>'
    : ''
  if (field.isEnumValue) {
    output = field.name + (notes ? ' ' + notes : '')
  } else {
    var color = !this.theme.inputs.hide && this.theme.field.colorArgs
      ? this.theme.inputs.color
      : null
    var args = this.theme.field.noargs
      ? []
      : _.map(field.args, arg => {
          return (
            (color ? '<FONT COLOR="' + color + '">' : '') +
            arg.name +
            ': ' +
            templates.fieldType(arg) +
            (color ? '</FONT>' : '')
          )
        })
    var type = templates.fieldType(field)
    output = templates.field(
      _.merge({}, field, {args: args, notes: notes, type: type})
    )
  }
  return output
}

// For the given context, creates a table for the class with the typeName as
// the header, and rows as the fields
function createTable (context) {
  var result = '"' + context.typeName + '" '
  result +=
    '[label=<<TABLE COLOR="' +
    context.color +
    '" BORDER="0" CELLBORDER="1" CELLSPACING="0">'
  result +=
    '<TR><TD PORT="__title"' +
    (this.theme.header.invert ? ' BGCOLOR="' + context.color + '"' : '') +
    '><FONT COLOR="' +
    (this.theme.header.invert ? 'WHITE' : context.color) +
    '">' +
    (_.isEmpty(context.stereotype) || context.stereotype === 'null'
      ? ''
      : '&laquo;' + context.stereotype + '&raquo;<BR/>') +
    '<B>' +
    context.typeName +
    '</B></FONT></TD></TR>'
  if (context.rows.length) {
    if (this.theme.field.hideSeperators) {
      result +=
        '<TR><TD><TABLE COLOR="' +
        context.color +
        '" BORDER="0" CELLBORDER="0" CELLSPACING="0">'
    }
    result += context.rows.map(row => {
      return (
        '<TR><TD ALIGN="' +
        this.theme.field.align +
        '" PORT="' +
        row.port +
        '"><FONT COLOR="' +
        context.color +
        '">' +
        row.text +
        '</FONT></TD></TR>'
      )
    })
    if (this.theme.field.hideSeperators) {
      result += '</TABLE></TD></TR>'
    }
  }
  result += '</TABLE>>];'
  return result
}

var groupId = 0

// For the provided simplified types, creates all the tables to represent them.
// Optionally groups the supplied types in a subgraph.
function graph (processedTypes, typeTheme) {
  var result = ''

  if (typeTheme.group) {
    result += 'subgraph cluster_' + groupId++ + ' {'
    if (typeTheme.color) {
      result += 'color=' + typeTheme.color + ';'
    }
    if (typeTheme.groupLabel) {
      result += 'label="' + typeTheme.groupLabel + '";'
    }
  }

  result += _.map(processedTypes, v => {
    // sort if desired
    if (this.theme.field.sort) {
      v.fields = _.sortBy(v.fields, 'name')
    }

    var rows = _.map(v.fields, v => {
      return {
        text: createField.call(this, v),
        port: v.name + 'port'
      }
    })

    return createTable.call(this, {
      typeName: getTypeDisplayName(v.name),
      color: typeTheme.color,
      stereotype: typeTheme.stereotype,
      rows: rows
    })
  }).join('\n')

  if (typeTheme.group) {
    result += '}'
  }

  result += '\n\n'
  return result
}

// For the provided schema (introspection result), generate Graphviz dot
// language output { @see http://www.graphviz.org/pdf/dotguide.pdf }
function instanceRender (schema, opts) {
  if (_.isString(schema)) {
    schema = JSON.parse(schema)
  }

  if (!_.isPlainObject(schema)) {
    throw new Error('Must be plain object')
  }

  // find entry points
  var rootPath = walkBFS.call(this, schema, (v, k, p) => {
    if (k === '__schema') {
      return p
    }
  })

  if (!rootPath) {
    throw new Error('Cannot find "__schema" object')
  }

  var root = _.get(schema, rootPath)
  var graphRoot = getGraphRoot.call(this, root)
  var q = graphRoot.q
  var types = graphRoot.types

  // walk the graph & build up nodes & edges
  var current
  var entities = {}

  while (q.length) {
    current = q.shift()

    // if item has already been processed
    if (entities[current]) {
      continue
    }

    // process item
    q = q.concat(processType.call(this, current, entities, types))
  }

  // process all the enum fields
  var enums = this.theme.enums.hide
    ? []
    : _.chain(types)
        .filter(type => {
          return type.kind === 'ENUM' && !_.startsWith(type.name, '__')
        })
        .map(processEnumType.bind(this))
        .value()

  // process all the input fields
  var inputs = this.theme.inputs.hide
    ? []
    : _.chain(types)
        .filter(type => {
          return type.kind === 'INPUT_OBJECT' && !_.startsWith(type.name, '__')
        })
        .map(processInputType.bind(this))
        .value()

  var interfaces = _.filter(entities, {
    isInterfaceType: true
  })

  var unions = _.filter(entities, {
    isUnionType: true
  })

  var objects = _.filter(entities, {
    isInterfaceType: false,
    isUnionType: false
  })

  // build the dot
  var dotfile =
    'digraph erd {\n' +
    'graph [\n' +
    '  rankdir = "LR"\n' +
    '];\n' +
    'node [\n' +
    '  fontsize = "16"\n' +
    '  shape = "plaintext"\n' +
    '];\n' +
    'edge [\n' +
    '];\n'

  dotfile += graph.call(this, objects, this.theme.types)
  dotfile += graph.call(this, enums, this.theme.enums)
  dotfile += graph.call(this, interfaces, this.theme.interfaces)
  dotfile += graph.call(this, inputs, this.theme.inputs)
  dotfile += graph.call(this, unions, this.theme.unions)

  dotfile += '\n\n'

  // key by to prevent need to search by name
  var processedTypes = _.keyBy(
    _.union(objects, enums, interfaces, inputs, unions),
    'name'
  )

  dotfile += _.reduce(
    processedTypes,
    (result, processedType) => {
      if (!processedType.isEnumType) {
        _.each(processedType.fields, field => {
          var fieldType = processedTypes[field.type]
          if (
            fieldType &&
            isEnabled.call(this, fieldType) &&
            (this.theme.edgesToSelf || processedType.name !== fieldType.name)
          ) {
            result.push(
              createEdge.call(this, {
                from: {
                  typeName: getTypeDisplayName(processedType.name),
                  fieldName: field.name
                },
                to: {
                  typeName: getTypeDisplayName(fieldType.name)
                },
                color: getColor.call(this, field)
              })
            )
          }
          if (!this.theme.field.noargs && field.args && field.args.length) {
            _.each(field.args, arg => {
              var argType = processedTypes[arg.type]
              if (
                argType &&
                isEnabled.call(this, argType) &&
                (this.theme.edgesToSelf || argType.name !== processedType.name)
              ) {
                result.push(
                  createEdge.call(this, {
                    from: {
                      typeName: getTypeDisplayName(argType.name)
                    },
                    to: {
                      typeName: getTypeDisplayName(processedType.name),
                      fieldName: this.theme.anchor.input ? field.name : null
                    },
                    label: this.theme.edgeLabels.input,
                    color: this.theme.inputs.hide
                      ? getColor.call(this, argType)
                      : this.theme.inputs.color,
                    weight: 1000
                  })
                )
              }
            })
          }
        })
        _.each(processedType.possibleTypes, possibleTypeName => {
          var possibleType = _.find(entities, {name: possibleTypeName})
          if (
            possibleType &&
            isEnabled.call(this, possibleType) &&
            (this.theme.edgesToSelf || processedType.name !== possibleType.name)
          ) {
            result.push(
              createEdge.call(this, {
                from: {
                  typeName: getTypeDisplayName(processedType.name)
                },
                to: {
                  typeName: getTypeDisplayName(possibleType.name)
                },
                label: processedType.isUnionType
                  ? this.theme.edgeLabels.union
                  : this.theme.edgeLabels.interface,
                color: getColor.call(this, possibleType)
              })
            )
          }
        })
      }
      return result
    },
    []
  ).join('\n')

  dotfile += '\n\n'

  dotfile += '\n}'

  return dotfile
}

module.exports.render = (schema, opts) => {
  opts = opts || {}

  return instanceRender.call(
    {
      theme: _.merge({}, module.exports.theme, opts.theme || {})
    },
    schema,
    opts
  )
}
