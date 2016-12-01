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

Usage
  $ graphqlviz [url]
      Renders dot schema from [url] endpoint

Examples
  $ graphqlviz https://localhost:3000 | dot -Tpng -o graph.png
  $ graphqlviz http://graphql-swapi.parseapp.com | dot -Tpng | open -f -a Preview
  $ graphqlviz path/to/schema.json | dot -Tpng | open -f -a Preview
  $ cat result.json | graphqlviz | dot -Tpng | open -f -a Preview
```

## Team

[![Adam Stankiewicz](https://avatars3.githubusercontent.com/u/292365?s=130)](https://sheerun.net) | [![Nathan Smith](https://avatars1.githubusercontent.com/u/1530197?s=130)](http://nathanrandal.com/) | [![Join](https://s28.postimg.org/hcy7aq9nh/42.png)](https://github.com/sheerun/graphqlviz/pulls)
---|---|---
[Adam Stankiewicz](https://sheerun.net) | [Nathan Smith](http://nathanrandal.com/) | [Join](https://github.com/sheerun/graphqlviz/pulls)
