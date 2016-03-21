# graphqlviz [![Build Status](https://travis-ci.org/sheerun/graphqlviz.svg?branch=master)](https://travis-ci.org/sheerun/graphqlviz)

> GraphQL Server CLI visualizer

## CLI

```
$ npm install -g graphqlviz
```

```
$ graphqlviz --help

  Usage
    $ graphqlviz [url]
        Renders schema in dot format from [url] endpoint

  Examples
    $ graphqlviz https://localhost:3000 | dot -Tpng -o graph.png
    $ graphqlviz http://graphql-swapi.parseapp.com | dot -Tpng | open -f -a Preview

```


## License

MIT © [Adam Stankiewicz](https://sheerun.net)
