Hook = require('hook.io').Hook
Inotify = require('inotify').Inotify
walk = require('walk')
fs = require('fs')
_ = require('underscore')

require('pkginfo')(module,'version','hook')

class exports.FSWatcher extends Hook
  constructor: (options) ->
    options ||= {}
    Hook.call @, options

    # options
    @paths ||= ['.']
    @ignorePath ||= /(^|\/)(\.|~)|~($|\/)/
    @batchDelay ||= 250
    @watchEvents ||= ['create', 'modify', 'delete', 'batch']

    @watches = {}
    @queue = {}
    @queueTimeouts = {}

    @.on "hook::ready", =>
      @inotify = new Inotify()

      for path in @paths
        path = fs.realpathSync(path)
        @setupWatch(path, root: path)
        walker = walk.walk path, followLinks: yes
        walker.on 'directory', (parent, stat, next) =>
          subPath = "#{parent}/#{stat.name}"
          @setupWatch(subPath, root: path) unless subPath.match(@ignorePath)
          next()

  translateEvent: (ev) ->
    if ev.mask & (Inotify.IN_MOVED_FROM | Inotify.IN_DELETE)
      'delete'
    else if ev.mask & (Inotify.IN_MOVED_TO | Inotify.IN_CREATE)
      'create'
    else if ev.mask & (Inotify.IN_CLOSE_WRITE)
      'modify'

  setupWatch: (path, opts) ->
    pathEvent = (ev, info) =>
      path = "#{@watches[ev.watch]}/#{ev.name}"
      unless path.match(@ignorePath)
        eventName = @translateEvent(ev)
        if 'batch' in @watchEvents and eventName
          @queue[opts.root] ||= []
          @queue[opts.root].push [eventName, path]
          clearTimeout @queueTimeouts[opts.root] if @queueTimeouts[opts.root]
          @queueTimeouts[opts.root] = setTimeout _.bind(@sendBatch, this, opts.root), @batchDelay
        if eventName in @watchEvents
          console.log "fs::#{eventName}", path: path, root: opts.root
          @emit "fs::#{eventName}", path: path, root: opts.root
      if ev.mask & (Inotify.IN_CREATE | Inotify.IN_ISDIR)
        @setupWatch(path, root: opts.root)

    watchDirective =
      path: path
      watch_for: Inotify.IN_MOVED_FROM | Inotify.IN_DELETE | Inotify.IN_MOVED_TO | Inotify.IN_CREATE | Inotify.IN_CLOSE_WRITE
      callback: pathEvent

    console.log "Setting up inotify for #{path}"
    watch = @inotify.addWatch watchDirective
    @watches[watch] = path

  sendBatch: (root) ->
    ops = _.uniq(@queue[root], no, (op) -> op.toString())
    console.log "fs::batch", root: root, ops: ops
    @emit "fs::batch", root: root, ops: ops
    @queue[root] = []
