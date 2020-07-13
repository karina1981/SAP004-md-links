const mdLinks = require('../index.js');
const {mockLinks, mockStats} = require('./mock.js')

describe('mdLinks', () => {

  test('testing is function', () => {
    expect(typeof mdLinks).toBe('function');
  });

  test('testing return typeError', () => {
    expect(() => mdLinks()).toThrow(TypeError);
    expect(() => mdLinks('./test.md')).toThrow(TypeError);
  });

  test('testing return links', () => {
    mdLinks('./test/test.md', {}).then(result => {
      expect(result).toEqual(mockLinks)
    })
  })

  test('testing return links --stats', () => {
    mdLinks('./test/test.md', {stats: true}).then(result => {
      expect(result).toEqual(mockStats)
    })
  })

  test('testing return links --validate --stats', () => {
    mdLinks('./test/test.md', {validate: true, stats: true}).then(result => {
      expect(result).toEqual(mockStats)
    })
  })



});
