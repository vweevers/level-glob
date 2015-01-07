var through2   = require('through2').obj
  , micromatch = require('micromatch')
  , isGlob     = require('is-glob')
  , Minimatch  = require("minimatch").Minimatch
  , glob2base  = require('glob2base')
  , ordered    = require('ordered-read-streams')
  , unique     = require('unique-stream')
  , absolute   = require('absolute-glob')
  , xtend      = require('xtend')

var valuesAndKeys = {values: true, keys: true}

module.exports = globStream

globStream.install = function(db) {
  db.createGlobStream = globStream.bind(db)
  return db
}

function globStream(db, globs, opts) {
  if (typeof globs == 'string') globs = [globs]
  else if (!Array.isArray(globs)) throw new Error('Invalid glob')

  globs = globs.map(normalizeGlob)
  opts  = opts || {}

  if (!globs.length) {
    // Like vinyl-fs, return a dead stream
    var pass = through2()
    process.nextTick(pass.end.bind(pass))
    return pass
  }

  var negatives = [], positives = []

  // separate globs, remembering order
  globs.forEach(function(glob, i){
    var a = glob[0] === '!' ? negatives : positives
    a.push({index: i, glob: glob})
  })

  var numPositive = positives.length

  // if glob is ** or only negative, stream all
  if (!numPositive || (numPositive==1 && positives[0]=='/**')) {
    var rsOpts = xtend(opts, valuesAndKeys)
    var rs = db.createReadStream(rsOpts)

    if (negatives.length)
      rs = rs.pipe(filterNegatives(negatives.map(toGlob)))

    return valuesOrKeys(rs, opts)
  }

  // create stream for each positive glob
  // the logic for this (and some code) is copied from `glob-stream`
  var streams = positives.map(function(positive){
    var glob = positive.glob, i = positive.index, range, stream

    if (isGlob(glob)) {
      var base = getBase(glob)

      // stream range starting with glob base
      range = xtend(opts, { gte: base, lt: base+'\xff' }, valuesAndKeys)
      stream = db.createReadStream(range).pipe(filterGlobs([glob]))

      // set value.base to glob base
      if (!opts.base) stream = stream.pipe(setBase(base))
    } else {
      // get by path
      if (glob[glob.length-1]!=='/') {
        // single value
        range = { gte: glob, lte: glob}
      } else {
        // effectively a directory glob
        range = { gt: glob, lt: glob+'\xff' }
      }

      range = xtend(opts, range, valuesAndKeys)
      stream = db.createReadStream(range)
    }

    // only filter if negative glob came after this positive glob
    var negativeGlobs = negatives.filter(indexGreaterThan(i)).map(toGlob)

    if (negativeGlobs.length)
      stream = stream.pipe(filterNegatives(negativeGlobs))

    return stream
  })

  // aggregate into stream of unique items
  var stream = ordered(streams).pipe(unique('key'))
  return valuesOrKeys(stream, opts)
}

function valuesOrKeys(stream, opts) {
  var values = opts.values!==false
    , keys   = opts.keys!==false

  if (values && keys) return stream

  return stream.pipe(through2(function(item, _, next){
    next(null, values ? item.value : item.key)
  }))
}

function normalizeGlob(glob){
  if (!glob || typeof glob !== 'string') throw new Error('Invalid glob')
  return absolute(glob)
}

// TODO: document+test that this only works for objects
function setBase(base) {
  // TODO: fix upstream
  if (base.length>1 && base[base.length-1]=='/')
    base = base.slice(0,-1)

  return through2(function(item, _, next){
    var value = item.value
    if (typeof value == 'object') value.base = base
    next(null, item)
  })
}

function getBase(glob) {
  var mm = new Minimatch(glob)
  return absolute(glob2base({minimatch: mm}))
}

function filterGlobs(globs) {
  if (!globs.length) return through2()

  return through2(function(item, _, next){
    if (micromatch(item.key, globs).length) this.push(item)
    next()
  })
}

function filterNegatives(globs) {
  if (!globs.length) return through2()
  globs.unshift('/**') // or micromatch won't match
  return filterGlobs(globs)
}

// taken from `glob-stream`
function toGlob(item) {
  return item.glob
}

// taken from `glob-stream`
function indexGreaterThan(index) {
  return function(obj) {
    return obj.index > index;
  };
}
