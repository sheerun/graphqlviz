# graphqlviz [![Build Status](https://travis-ci.org/sheerun/graphqlviz.svg?branch=master)](https://travis-ci.org/sheerun/graphqlviz)

> GraphQL Server CLI visualizer

![](demo.gif)

## CLI

```
$ npm install -g graphqlviz
```

```
$ graphqlviz --help

  GraphQL Server CLI visualizer

  Usage
    $ graphqlviz [url]
        Renders dot schema from [url] endpoint

  Examples
    $ graphqlviz http://localhost:3000 | dot -Tpng -o graph.png
    $ graphqlviz http://graphql-swapi.parseapp.com | dot -Tpng | open -f -a Preview

```


## License

MIT © [Adam Stankiewicz](https://sheerun.net)
