var level  = require('level-test')({ mem: true })
  , glob   = require('./')
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
  glob(db, ['assets/*', '/*'], opts).pipe(concat(function(value){
    console.log(value === 'cssjsreadme')
  }))

  // but those streams are ordered
  glob(db, ['/*', 'assets/*'], opts).pipe(concat(function(value){
    console.log(value === 'readmecssjs')
  }))

  // negation only applies to patterns before it
  glob(db, ['assets/*', '!**.md', '/*'], opts).pipe(concat(function(value){
    console.log(value === 'cssjsreadme')
  }))

  // so this negative glob does have an effect
  glob(db, ['assets/*', '/*', '!**.md'], opts).pipe(concat(function(value){
    console.log(value === 'cssjs')
  }))

})
