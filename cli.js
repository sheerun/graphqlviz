#!/usr/bin/env node

require('es6-promise').polyfill();
var fetch = require('isomorphic-fetch');
var meow = require('meow');
var fs = require('fs');
var getStdin = require('get-stdin');
var graphqlviz = require('./');

var cli = meow([
  'Options:',
  '  -a, --noargs     render without field arguments',
  '  -v, --verbose    print introspection result',
  '  -s, --sort       sort fields',
  '',
  'Usage',
  '  $ graphqlviz [url]',
  '      Renders dot schema from [url] endpoint',
  '',
  'Examples',
  '  $ graphqlviz https://localhost:3000 | dot -Tpng -o graph.png',
  '  $ graphqlviz http://graphql-swapi.parseapp.com | dot -Tpng | open -f -a Preview',
  '  $ graphqlviz path/to/schema.json | dot -Tpng | open -f -a Preview',
  '  $ cat result.json | graphqlviz | dot -Tpng | open -f -a Preview',
  ' '
], {
  alias: {
    v: 'verbose',
    a: 'noargs',
    s: 'sort'
  }
});

// build render options
var opts = {
  noargs: cli.flags.noargs,
  sort: cli.flags.sort
};

function terminate() {
  // cli.showHelp();
  console.error(cli.help);
  process.exit(1);
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
      console.error('Invalid introspection result on stdin. Use --verbose flag to see it.');
      console.error('Error: ' + e.message);

      if (cli.flags.verbose) {
        console.error(stdin);
      }

      process.exit(1);
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
          return reject(err);
        }
        resolve(data);
      });
    });
  }

  // after getting text, try to parse as JSON and process
  p.then(function (text) {
    var json;

    if (!text) {
      return terminate();
    }

    try {
      json = JSON.parse(text);
    } catch (e) {
      console.error('Not a valid JSON. Use --verbose flag to see output.');

      if (cli.flags.verbose) {
        console.error(text);
      }

      process.exit(1);
    }

    try {
      console.log(graphqlviz.render(json, opts));
    } catch (e) {
      console.error('Invalid introspection result. Use --verbose flag to see output.');

      if (cli.flags.verbose) {
        console.error(text);
      }

      process.exit(1);
    }
  }).catch(function (e) {
    console.error('ERROR: ' + e.message);
    process.exit(1);
  });
} else {
  terminate();
}
