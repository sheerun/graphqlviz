#!/usr/bin/env node

require('es6-promise').polyfill();
var fetch = require('isomorphic-fetch');
var meow = require('meow');
var fs = require('fs');
var getStdin = require('get-stdin');
var GraphQL = require('graphql');
var graphql = GraphQL.graphql;
var parse = GraphQL.parse;
var buildASTSchema = GraphQL.buildASTSchema;
var graphqlviz = require('./');

// since overrides come from cmd line, boolean defaults should be false
// initiate the defaults with those pulled from the rc config files and command
// line arguments, for example to modify `edgesToSelf` in the config, we can
// use the argument `--edgesToSelf` { @see https://github.com/dominictarr/rc }
var config = require('rc')('graphqlviz', graphqlviz.configDefaults);

var cli = meow([
  'Options:',
  '  -a, --noargs     render without field arguments',
  '  -v, --verbose    print introspection result',
  '  -s, --sort       sort fields',
  '  -g, --graphql    use graphql schema language as input',
  '  --config         config overrides (see Config)',
  '',
  'Usage',
  '  $ graphqlviz [url]',
  '      Renders dot schema from [url] endpoint',
  '',
  'Examples',
  '  $ graphqlviz https://localhost:3000 | dot -Tpng -o graph.png',
  '  $ graphqlviz http://graphql-swapi.parseapp.com | dot -Tpng | open -f -a Preview',
  '  $ graphqlviz path/to/schema.json | dot -Tpng | open -f -a Preview',
  '  $ graphqlviz path/to/schema.graphql -g | dot -Tpng | open -f -a Preview',
  '  $ cat result.json | graphqlviz | dot -Tpng | open -f -a Preview',
  '',
  'Config',
  '  --header.invert for type headers, shows white text on colored background',
  '  --anchor.header when an edge points to a type, anchor to that type\'s header',
  '  --anchor.input for input types, anchor the edge to the field that contains the input argument',
  '  --edgesToSelf edges from an field to owning object will not be drawn',
  '  --field.align [default=CENTER] aligns the text for all the fields',
  '  --field.hideSeperators hides the lines between fields',
  '  --field.colorArgs color the arguments of fields in the input type color',
  '  --edgeLabels.input [default="is input to"] labels the edge for input types, and enums that are inputs into fields',
  '  --edgeLabels.union [default=""] labels the edge for types that are included in a union',
  '  --edgeLabels.interface [default="implemented by"] labels for the edges that link an interface to an implementaion',
  '  --types.color [default="BLACK"] color for object types (excludes interface and union types)',
  '  --types.hide hides object types in the output',
  '  --types.group groups all object types together',
  '  --types.groupLabel [default="Types"] the label for the group',
  '  --types.stereotype [default=null] a subheader for this type',
  '  --inputs.color [default="BLACK"] color for input types',
  '  --inputs.hide hides input types in the output',
  '  --inputs.group groups all input types together',
  '  --inputs.groupLabel [default="Input Types"] the label for the group',
  '  --inputs.stereotype [default="input"] a subheader for this type',
  '  --enums.color [default="BLACK"] color for enum types',
  '  --enums.hide hides enums in the output',
  '  --enums.group groups all enum types together',
  '  --enums.groupLabel [default="Enum Types"] the label for the group',
  '  --enums.stereotype [default="enumeration"] a subheader for this type',
  '  --interfaces.color [default="BLACK"] color for interface types',
  '  --interfaces.hide hides interfaces in the output',
  '  --interfaces.group groups all interface types together',
  '  --interfaces.groupLabel [default="Interface Types"] the label for the group',
  '  --interfaces.stereotype [default="interface"] a subheader for this type',
  '  --unions.color [default="BLACK"] color for union types',
  '  --unions.hide hides unions in the output',
  '  --unions.group groups all union types together',
  '  --unions.groupLabel [default="Union Types"] the label for the group',
  '  --unions.stereotype [default="union"] a subheader for this type'
], {
  alias: {
    v: 'verbose',
    a: 'noargs',
    s: 'sort',
    g: 'graphql'
  }
});

// build render options
var opts = {
  noargs: cli.flags.noargs,
  sort: cli.flags.sort,
  config: config
};

// displays help and exits
function terminate() {
  console.error(cli.help);
  process.exit(1);
}

// logs the error and exits
function fatal(e, text) {
  console.error('ERROR processing input. Use --verbose flag to see output.');
  console.error(e.message);

  if (cli.flags.verbose) {
    console.error(text);
  }

  process.exit(1);
}

// given a "GraphQL schema language" text file, converts into introspection JSON
function introspect(text) {
  return new Promise(function (resolve, reject) {
    try {
      var astDocument = parse(text);
      var schema = buildASTSchema(astDocument);
      graphql(schema, graphqlviz.query).then(function (data) {
        resolve(data);
      }).catch(function (e) {
        reject('Fatal error, exiting.');
        fatal(e, text);
      });
    } catch (e) {
      reject('Fatal error, exiting.');
      fatal(e, text);
    }
  });
}

if (cli.input[0] === 'query') {
  process.stdout.write(JSON.stringify({query: graphqlviz.query}) + '\n');
} else if (cli.input.length === 0) {
  getStdin().then(function (stdin) {
    if (stdin.trim() === '') {
      return terminate();
    }
    try {
      console.log(graphqlviz.render(stdin, opts));
    } catch (e) {
      fatal(e, stdin);
    }
  });
} else if (cli.input.length === 1) {
  var p;

  // otherwise http(s)
  if (cli.input[0].slice(0, 4) === 'http') {
    p = fetch(cli.input[0], {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({query: graphqlviz.query})
    }).then(function (res) {
      return res.text();
    });
  } else {
    // if not http, try local file
    p = new Promise(function (resolve, reject) {
      fs.readFile(cli.input[0], {encoding: 'utf8'}, function (err, data) {
        if (err) {
          reject(err);
          fatal(err, data);
        } else {
          resolve(data);
        }
      });
    });
  }

  // after getting text, try to parse as JSON and process, or use graphql to process a "graphql schema language" file
  var introspectionPromise = p.then(function (text) {
    if (!text) {
      return terminate();
    }
    var returnedPromise;
    if (cli.flags.graphql) {
      returnedPromise = introspect(text);
    } else {
      try {
        returnedPromise = Promise.resolve(JSON.parse(text));
      } catch (e) {
        fatal(e, text);
      }
    }
    return returnedPromise;
  });

  introspectionPromise.then(function (executionResult) {
    // undocumented outputJSON can be used to convert graphql schema to JSON (useful for generating test data)
    if (cli.flags.outputJSON) {
      console.log(JSON.stringify(executionResult, null, 2, 2));
      process.exit(1);
    } else {
      try {
        console.log(graphqlviz.render(executionResult, opts));
      } catch (e) {
        fatal(e, JSON.stringify(executionResult, null, 2, 2));
      }
    }
  });
} else {
  terminate();
}
