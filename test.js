import test from 'ava';
import fs from 'fs';
import graphqlviz from './';
import path from 'path';

test('render', t => {
  var input = fs.readFileSync(path.resolve(__dirname, 'test/input.json')).toString();
  var output = fs.readFileSync(path.resolve(__dirname, 'test/output-noargs.dot')).toString();
  var computed = graphqlviz.render(input, {noargs: true}) + '\n';
  t.same(computed, output);
});

test('render with args', t => {
  var input = fs.readFileSync(path.resolve(__dirname, 'test/input.json')).toString();
  var output = fs.readFileSync(path.resolve(__dirname, 'test/output.dot')).toString();
  var computed = graphqlviz.render(input, {}) + '\n';
  t.same(computed, output);
});

test('render with sort', t => {
  var input = fs.readFileSync(path.resolve(__dirname, 'test/input.json')).toString();
  var output = fs.readFileSync(path.resolve(__dirname, 'test/output-sort.dot')).toString();
  var computed = graphqlviz.render(input, {sort: true}) + '\n';
  t.same(computed, output);
});

test('render with support for NON_NULL lists', t => {
  var input = fs.readFileSync(path.resolve(__dirname, 'test/simple-input.json')).toString();
  var output = fs.readFileSync(path.resolve(__dirname, 'test/simple-output.dot')).toString();
  var computed = graphqlviz.render(input, {}) + '\n';
  t.same(computed, output);
});

test('render with support for mutationType', t => {
  var input = fs.readFileSync(path.resolve(__dirname, 'test/query-mutation-input.json')).toString();
  var output = fs.readFileSync(path.resolve(__dirname, 'test/query-mutation-output.dot')).toString();
  var computed = graphqlviz.render(input, {}) + '\n';
  t.same(computed, output);
});

test('render with support for interface, union, and enum types', t => {
  var input = fs.readFileSync(path.resolve(__dirname, 'test/complex-input.json')).toString();
  var output = fs.readFileSync(path.resolve(__dirname, 'test/complex-output.dot')).toString();
  var computed = graphqlviz.render(input) + '\n';
  t.same(computed, output);
});

test('render with config options inverted', t => {
  var input = fs.readFileSync(path.resolve(__dirname, 'test/complex-input.json')).toString();
  var output = fs.readFileSync(path.resolve(__dirname, 'test/complex-output-all.dot')).toString();
  var computed = graphqlviz.render(input, {config: {
    header: {
      invert: true
    },
    edgesToSelf: true,
    field: {
      align: 'LEFT',
      hideSeperators: true,
      colorArgs: true
    },
    edgeLabels: {
      input: 'is an input to',
      union: 'is union by',
      interface: 'is implemented by'
    },
    types: {
      color: 'RED4',
      hide: false,
      group: true,
      groupLabel: 'Types',
      stereotype: null
    },
    inputs: {
      color: 'MIDNIGHTBLUE',
      hide: false,
      group: true,
      groupLabel: 'Input Types',
      stereotype: null
    },
    enums: {
      color: 'LIMEGREEN',
      hide: false,
      group: true,
      groupLabel: 'Enum Types',
      stereotype: null
    },
    interfaces: {
      color: 'ORANGERED',
      hide: false,
      group: true,
      groupLabel: 'Interface Types',
      stereotype: null
    },
    unions: {
      color: 'DARKORCHID',
      hide: false,
      group: true,
      groupLabel: 'Unions',
      stereotype: null
    }
  }}) + '\n';
  t.same(computed, output);
});
