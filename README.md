## pub-server

http://jldec.github.io/pub-doc/

**pub-server**, or **pub** for short is an HTML generator+editor entirely written in javascript.

Notably, the generator+editor can publish itself, together with the HTML, CSS etc., on any static web hosting service like [Github pages]().

Since the generator+editor runs in-browser, non-technical users can edit their markdown "source" fragments, and instantly preview the generated HTML, all without first installing pub-server themselves.

### installation

using **pub-server** requires node.js or io.js.

``` bash
npm install -g pub-server
```

OSX and Linux are working, Windows support is coming - PRs welcome.


### usage

`pub` (with no options) serves `*.md` in the current directory or looks for `pub-config.js`.

`pub -O` generates .html and other static files (including generator + editor) to `./out`.

`pub -S` serves only static files.

`pub -h` shows the usage info below:

```
pub-server v1.8.0

usage: pub [opts] [dir]
opts:
  -h, --help               output usage information
  -p, --port <port>        server port [3001]
  -t, --theme <name>       theme module-name or dir, repeatable
  -o, --output-path <dir>  output dir [./out]
  -O, --output-only        output html, scripts, static files and exit
  -G, --html-only          output generated html files and exit
  -r, --root <prefix>      generate /prefix urls, "." means path relative
  -s, --static <dir>       static dir, repeatable, supports <dir>,<route>
  -S, --static-only <dir>  serve only static files from <dir>
  -m, --md-fragments       use markdown headers as fragments
  -C, --config             show config and exit
  -I, --ignore-config      ignore pub-config file
  -P, --pages              show pages and templates and exit
  -W, --no-watch           don't watch for changes
  -K, --no-sockets         no websockets
  -E, --no-editor          website only, no editor
  -d, --dbg                enable scriptmaps and client-side debug traces
  -D, --debug              node --debug (server and client-side)
  -B, --debug-brk          node --debug-brk (server and client-side)
```

### credits

Major dependencies include:

- [express](http://expressjs.com/)
- [marked](https://github.com/chjj/marked)
- [handlebars](http://handlebarsjs.com/)
- [browserify](http://browserify.org/) and [browserify-middleware](https://github.com/ForbesLindesay/browserify-middleware)
- [chokidar](https://www.npmjs.com/package/chokidar)
- [socket.io](http://socket.io/)
- [passport](http://passportjs.org/)

`npm ls` will list them all.
