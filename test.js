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
