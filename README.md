# level-glob

> Create a read stream filtered and ordered by glob patterns. The keys in the
database should be absolute, unix-like paths.

[![npm status](http://img.shields.io/npm/v/level-glob.svg?style=flat-square)](https://www.npmjs.org/package/level-glob) [![Travis build status](https://img.shields.io/travis/vweevers/level-glob.svg?style=flat-square&label=travis)](http://travis-ci.org/vweevers/level-glob) [![AppVeyor build status](https://img.shields.io/appveyor/ci/vweevers/level-glob.svg?style=flat-square&label=appveyor)](https://ci.appveyor.com/project/vweevers/level-glob) [![Dependency status](https://img.shields.io/david/vweevers/level-glob.svg?style=flat-square)](https://david-dm.org/vweevers/level-glob)

Jump to: [usage](#usage) / [install](#install) / [license](#license)

## example

```js
var level  = require('level-test')({ mem: true })
  , glob   = require('level-glob')
  , concat = require('concat-stream')

// create a database
var db = level()

// insert some data
var ops = [
  {type: 'put', key: '/readme.md',      value: 'readme' },
  {type: 'put', key: '/assets/app.js',  value: 'js'     },
  {type: 'put', key: '/assets/app.css', value: 'css'    }
]

db.batch(ops, function(){

  var opts = { values: true, keys: false }

  // aggregates multiple streams
  glob(db, ['assets/*', '/*'], opts)
    .pipe(concat(function(value){
      console.log(value === 'cssjsreadme')
    }))

  // but those streams are ordered
  glob(db, ['/*', 'assets/*'], opts)
    .pipe(concat(function(value){
      console.log(value === 'readmecssjs')
    }))

  // negation only applies to patterns before it
  glob(db, ['assets/*', '!**.md', '/*'], opts)
    .pipe(concat(function(value){
      console.log(value === 'cssjsreadme')
    }))

  // so this negative glob does have an effect
  glob(db, ['assets/*', '/*', '!**.md'], opts)
    .pipe(concat(function(value){
      console.log(value === 'cssjs')
    }))

})
```

## usage

### `glob(db, patterns(s)[, options])`

Create a readstream filtered by one or more glob patterns.

### `glob.install(db)`

Add a `createGlobStream` method to `db`.

```js
glob.install(db);
db.createGlobStream('/**/*.png', options);
```

## install

With [npm](https://npmjs.org) do:

```
npm install level-glob
```

## license

[MIT](http://opensource.org/licenses/MIT) © [Vincent Weevers](http://vincentweevers.nl)
