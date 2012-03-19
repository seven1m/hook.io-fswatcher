(function() {
  var Hook, Inotify, fs, walk, _,
    __hasProp = Object.prototype.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; },
    __indexOf = Array.prototype.indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  Hook = require('hook.io').Hook;

  Inotify = require('inotify').Inotify;

  walk = require('walk');

  fs = require('fs');

  _ = require('underscore');

  require('pkginfo')(module, 'version', 'hook');

  exports.FSWatcher = (function(_super) {

    __extends(FSWatcher, _super);

    function FSWatcher(options) {
      var _this = this;
      options || (options = {});
      Hook.call(this, options);
      this.paths || (this.paths = ['.']);
      this.ignorePath || (this.ignorePath = /(^|\/)(\.|~)|~($|\/)/);
      this.batchDelay || (this.batchDelay = 250);
      this.watchEvents || (this.watchEvents = ['create', 'modify', 'delete', 'batch']);
      this.watches = {};
      this.queue = {};
      this.queueTimeouts = {};
      this.on("hook::ready", function() {
        var path, walker, _i, _len, _ref, _results;
        _this.inotify = new Inotify();
        _ref = _this.paths;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          path = _ref[_i];
          path = fs.realpathSync(path);
          _this.setupWatch(path, {
            root: path
          });
          walker = walk.walk(path, {
            followLinks: true
          });
          _results.push(walker.on('directory', function(parent, stat, next) {
            var subPath;
            subPath = "" + parent + "/" + stat.name;
            if (!subPath.match(_this.ignorePath)) {
              _this.setupWatch(subPath, {
                root: path
              });
            }
            return next();
          }));
        }
        return _results;
      });
    }

    FSWatcher.prototype.translateEvent = function(ev) {
      if (ev.mask & (Inotify.IN_MOVED_FROM | Inotify.IN_DELETE)) {
        return 'delete';
      } else if (ev.mask & (Inotify.IN_MOVED_TO | Inotify.IN_CREATE)) {
        return 'create';
      } else if (ev.mask & Inotify.IN_CLOSE_WRITE) {
        return 'modify';
      }
    };

    FSWatcher.prototype.setupWatch = function(path, opts) {
      var pathEvent, watch, watchDirective,
        _this = this;
      pathEvent = function(ev, info) {
        var eventName, _base, _name;
        path = "" + _this.watches[ev.watch] + "/" + ev.name;
        if (!path.match(_this.ignorePath)) {
          eventName = _this.translateEvent(ev);
          if (__indexOf.call(_this.watchEvents, 'batch') >= 0 && eventName) {
            (_base = _this.queue)[_name = opts.root] || (_base[_name] = []);
            _this.queue[opts.root].push([eventName, path]);
            if (_this.queueTimeouts[opts.root]) {
              clearTimeout(_this.queueTimeouts[opts.root]);
            }
            _this.queueTimeouts[opts.root] = setTimeout(_.bind(_this.sendBatch, _this, opts.root), _this.batchDelay);
          }
          if (__indexOf.call(_this.watchEvents, eventName) >= 0) {
            console.log("fs::" + eventName, {
              path: path,
              root: opts.root
            });
            _this.emit("fs::" + eventName, {
              path: path,
              root: opts.root
            });
          }
        }
        if (ev.mask & (Inotify.IN_CREATE | Inotify.IN_ISDIR)) {
          return _this.setupWatch(path, {
            root: opts.root
          });
        }
      };
      watchDirective = {
        path: path,
        watch_for: Inotify.IN_MOVED_FROM | Inotify.IN_DELETE | Inotify.IN_MOVED_TO | Inotify.IN_CREATE | Inotify.IN_CLOSE_WRITE,
        callback: pathEvent
      };
      console.log("Setting up inotify for " + path);
      watch = this.inotify.addWatch(watchDirective);
      return this.watches[watch] = path;
    };

    FSWatcher.prototype.sendBatch = function(root) {
      var ops;
      ops = _.uniq(this.queue[root], false, function(op) {
        return op.toString();
      });
      console.log("fs::batch", {
        root: root,
        ops: ops
      });
      this.emit("fs::batch", {
        root: root,
        ops: ops
      });
      return this.queue[root] = [];
    };

    return FSWatcher;

  })(Hook);

}).call(this);
