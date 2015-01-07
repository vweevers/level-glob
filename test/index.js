var test = require('tape')
  , globStream = require('../')
  , concat = require('concat-stream')
  , level = require('level-test')({ valueEncoding: 'json', mem: true })

test('glob patterns', function(t){
  var db = level()
  var files = [
    '/readme.md',
    '/assets/app.js',
    '/assets/app.css'
  ]

  t.plan(13)

  var ops = files.map(function(file){
    return {type: 'put', key: file, value: 'random'}
  })

  db.batch(ops, function(){
    expect('/**', ['/assets/app.css', '/assets/app.js', '/readme.md'])
    expect('**', ['/assets/app.css', '/assets/app.js', '/readme.md'])

    expect(['assets/*', '/*'], ['/assets/app.css', '/assets/app.js', '/readme.md'], 'ordered')
    expect(['/*', 'assets/*'], ['/readme.md', '/assets/app.css', '/assets/app.js'], 'reverse ordered')

    expect (
      ['assets/*', '!**.md', '/*'],
      ['/assets/app.css', '/assets/app.js', '/readme.md'],
      'negation applied to patterns before it'
    )

    expect([], [], 'empty')
    expect('foo', [], 'no match')

    expect('!**app**', ['/readme.md'])

    expect('\\**\\*.js', ['/assets/app.js'], 'unixifies')
    expect('C:\\**\\*.js', ['/assets/app.js'], 'unixifies c drive')

    // TODO: should this be `expect('/', ['/readme.md'])` ?
    expect('/', ['/assets/app.css', '/assets/app.js', '/readme.md'], 'directory glob')
    expect('/assets/', ['/assets/app.css', '/assets/app.js'], 'directory glob')

    expect('/readme.md', ['/readme.md'], 'single file')
  })

  function expect(globs, expected, msg) {
    globStream(db, globs).pipe(concat(function(items) {
      var files = items.map(function(o){ return o.key })
      t.deepEqual(files, expected, msg || [].concat(globs).join(', '))
    }))
  }
})
