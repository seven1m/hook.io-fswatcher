# Hook.io FS Watcher

A Filesystem Watcher hook for [Hook.io](https://github.com/hookio/hook.io) that works on multiple paths, recursively monitoring child directories and newly-created directories.

*It supports [inotify](http://en.wikipedia.org/wiki/Inotify) (Linux) only at the moment.*

## Install

    npm install -g hook.io-fswatcher

## Run

To start up the watcher with default options, run:

    hookio-fswatcher

This will start watching the current directory and emit events as files/directories change.

## Options

The following options are configurable from the Hook constructor and/or config.json:

* `paths` (default: `['.']`)
* `ignorePath` (default: `/(^|\/)(\.|~)|~($|\/)/`)
* `batchDelay` (default: `250`)
* `watchEvents` (default: `['create', 'modify', 'delete', 'batch']`)

## Events

This listener emits the following events:

* `fs::create`
* `fs::modify`
* `fs::delete`
* `fs::batch` (see special note below)

Each of the above events (except 'batch') is accompanied by the following data properties:

* `path` - the path affected
* `root` - the root path being watched (as specified on the command line)

The 'batch' event is designed to reduce some of the noisiness of regular file system events, by waiting until short period of inactivity has passed (250 milliseconds by default; configurable with `batchDelay` option documented above) and sending updates together. Following is an example of the data sent with an `fs::batch` event:

    { root: '/path/to/root',
      ops: [
        ['create', '/path/to/root/folder'],
        ['create', '/path/to/root/folder/temp'],
        ['modify', '/path/to/root/folder/temp'],
        ['delete', '/path/to/root/folder/temp'],
        ['create', '/path/to/root/folder/file'],
        ['modify', '/path/to/root/folder/file']
      ]
    }

## License

Copyright (c) 2012, [Tim Morgan](http://timmorgan.org)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
