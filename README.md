# graphqlviz [![Build Status](https://travis-ci.org/sheerun/graphqlviz.svg?branch=master)](https://travis-ci.org/sheerun/graphqlviz)

> GraphQL Server CLI visualizer. Adapted from original [web interface](https://github.com/NathanRSmith/graphql-visualizer).

![](demo.gif)

## CLI

```
$ npm install -g graphqlviz
```

```
GraphQL Server CLI visualizer

Options:
  -a, --noargs     render without field arguments
  -v, --verbose    print introspection result
  -s, --sort       sort fields
  -g, --graphql    use graphql schema language as input
  --config         path to config file

Usage
  $ graphqlviz [url]
      Renders dot schema from [url] endpoint

Examples
  $ graphqlviz https://localhost:3000 | dot -Tpng -o graph.png
  $ graphqlviz http://graphql-swapi.parseapp.com | dot -Tpng | open -f -a Preview
  $ graphqlviz path/to/schema.json | dot -Tpng | open -f -a Preview
  $ graphqlviz -g path/to/schema.graphql | dot -Tpng | open -f -a Preview
  $ cat result.json | graphqlviz | dot -Tpng | open -f -a Preview
```

## Example NPM Scripts

```
  "scripts": {
    "preprint": "type dot >/dev/null 2>&1 || { echo >&2 \"Please run `brew install graphviz`.  Aborting.\"; exit 1; }",
    "print": "graphqlviz ./path/to/schema.graphql -g | dot -Tpdf | open -f -a Preview"
  },
```

## Customizing output

Run `graphqlviz --help` for a full list of available customizations. Customizations can be applied either using arguments, or in a config file (if not supplied, `.graphqlvizrc` is used). All the available colors can be found on the [graphviz site](http://www.graphviz.org/doc/info/colors.html). The defaults are:

```
{
  "header": {
    "invert": false
  },
  "anchor": {
    "header": false,
    "input": false
  },
  "edgesToSelf": false,
  "field": {
    "align": "CENTER",
    "hideSeperators": false,
    "colorArgs": false
  },
  "edgeLabels": {
    "input": "is input to",
    "union": "",
    "interface": "implemented by"
  },
  "types": {
    "color": "BLACK",
    "hide": false,
    "group": false,
    "groupLabel": "Types",
    "stereotype": null
  },
  "inputs": {
    "color": "BLACK",
    "hide": false,
    "group": false,
    "groupLabel": "Input Types",
    "stereotype": "input"
  },
  "enums": {
    "color": "BLACK",
    "hide": false,
    "group": false,
    "groupLabel": "Enum Types",
    "stereotype": "enumeration"
  },
  "interfaces": {
    "color": "BLACK",
    "hide": false,
    "group": false,
    "groupLabel": "Interface Types",
    "stereotype": "interface"
  },
  "unions": {
    "color": "BLACK",
    "hide": false,
    "group": false,
    "groupLabel": "Unions",
    "stereotype": "union"
  }
}
```

## Team

[![Adam Stankiewicz](https://avatars3.githubusercontent.com/u/292365?s=130)](https://sheerun.net) | [![Nathan Smith](https://avatars1.githubusercontent.com/u/1530197?s=130)](http://nathanrandal.com/) | [![Join](https://s28.postimg.org/hcy7aq9nh/42.png)](https://github.com/sheerun/graphqlviz/pulls)
---|---|---
[Adam Stankiewicz](https://sheerun.net) | [Nathan Smith](http://nathanrandal.com/) | [Join](https://github.com/sheerun/graphqlviz/pulls)
