#!/usr/bin/env node

require('es6-promise').polyfill()
var fetch = require('isomorphic-fetch')
var meow = require('meow')
var fs = require('fs')
var getStdin = require('get-stdin')
var GraphQL = require('graphql')
var graphql = GraphQL.graphql
var parse = GraphQL.parse
var buildASTSchema = GraphQL.buildASTSchema
var graphqlviz = require('./')

var cli = meow(`
    Options:
      -g --graphql    use graphql schema language as input
      -t --theme      path to theme overrides
      --print-theme   print default theme to stdout
      -v --verbose    print introspection result
      -a --auth       set Authorization header for graphql server

    Usage:
      $ graphqlviz [url]
          Renders dot schema from [url] endpoint

    Examples:
      $ graphqlviz https://localhost:3000 | dot -Tpng -o graph.png
      $ graphqlviz https://www.mypublicautheddomain.com/graphql -a "Bearer xxxxx" | dot -Tpng -o graph.png
      $ graphqlviz https://swapi.apis.guru | dot -Tpng | open -f -a Preview
      $ graphqlviz path/to/schema.json | dot -Tpng | open -f -a Preview
      $ graphqlviz path/to/schema.graphql -g | dot -Tpng | open -f -a Preview
      $ graphqlviz --print-theme > theme.json
      $ graphqlviz https://localhost:3000 -t theme.json | dot -Tpng | open -f -a Preview
      $ graphqlviz schema.json --theme.header.invert=true | dot -Tpng > schema.png
`, {
  flags: {
    verbose: {
      type: 'boolean',
      alias: 'v'
    },
    theme: {
      type: 'string',
      alias: 't'
    },
    graphql: {
      type: 'boolean',
      alias: 'g'
    },
    auth: {
      type: 'string',
      alias: 'a'
    }
  }
})

if (cli.flags.theme && typeof cli.flags.theme === 'string') {
  cli.flags.theme = JSON.parse(fs.readFileSync(cli.flags.theme))
}

// displays help and exits
function terminate () {
  console.error(cli.help)
  process.exit(1)
}

// logs the error and exits
function fatal (e, text) {
  console.error('ERROR processing input. Use --verbose flag to see output.')
  console.error(e.message)

  if (cli.flags.verbose) {
    console.error(text)
  }

  process.exit(1)
}

// given a "GraphQL schema language" text file, converts into introspection JSON
function introspect (text) {
  return new Promise(function (resolve, reject) {
    try {
      var astDocument = parse(text)
      var schema = buildASTSchema(astDocument)
      graphql(schema, graphqlviz.query)
        .then(function (data) {
          resolve(data)
        })
        .catch(function (e) {
          reject('Fatal error, exiting.')
          fatal(e, text)
        })
    } catch (e) {
      reject('Fatal error, exiting.')
      fatal(e, text)
    }
  })
}

if (cli.input[0] === 'query') {
  process.stdout.write(JSON.stringify({query: graphqlviz.query}) + '\n')
} else if (cli.flags.printTheme) {
  process.stdout.write(JSON.stringify(graphqlviz.theme, null, 2) + '\n')
} else if (cli.input.length === 0) {
  getStdin().then(function (stdin) {
    if (stdin.trim() === '') {
      return terminate()
    }
    try {
      console.log(graphqlviz.render(stdin, cli.flags))
    } catch (e) {
      fatal(e, stdin)
    }
  })
} else if (cli.input.length === 1) {
  var p

  // otherwise http(s)
  if (cli.input[0].slice(0, 4) === 'http') {
    var headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    };
    if (cli.flags.auth) {
      headers.Authorization = cli.flags.auth;
    }
    p = fetch(cli.input[0], {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({query: graphqlviz.query})
    }).then(function (res) {
      if (!res.ok && cli.flags.verbose) {
        console.log('Request for schema failed w/ ' + res.status + ' (' + res.statusText + ')');
      }
      return res.text();
    });
  } else {
    // if not http, try local file
    p = new Promise(function (resolve, reject) {
      fs.readFile(cli.input[0], {encoding: 'utf8'}, function (err, data) {
        if (err) {
          reject(err)
          fatal(err, data)
        } else {
          resolve(data)
        }
      })
    })
  }

  // after getting text, try to parse as JSON and process, or use graphql to process a "graphql schema language" file
  var introspectionPromise = p.then(function (text) {
    if (!text) {
      return terminate()
    }
    var returnedPromise
    if (cli.flags.graphql) {
      returnedPromise = introspect(text)
    } else {
      try {
        returnedPromise = Promise.resolve(JSON.parse(text))
      } catch (e) {
        fatal(e, text)
      }
    }
    return returnedPromise
  })

  introspectionPromise.then(function (executionResult) {
    // undocumented outputJSON can be used to convert graphql schema to JSON (useful for generating test data)
    if (cli.flags.outputJSON) {
      console.log(JSON.stringify(executionResult, null, 2, 2))
      process.exit(1)
    } else {
      try {
        console.log(graphqlviz.render(executionResult, cli.flags))
      } catch (e) {
        fatal(e, JSON.stringify(executionResult, null, 2, 2))
      }
    }
  })
} else {
  terminate()
}
