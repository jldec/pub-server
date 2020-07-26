
# pub-server
[![CI](https://github.com/jldec/pub-server/workflows/CI/badge.svg)](https://github.com/jldec/pub-server/actions)

[Docs](https://jldec.github.io/pub-doc/)

**pub-server**, or **pub** for short is an HTML site-generator and editor written in JavaScript.

The following use-cases are supported

- Command-line tool for generating static websites
- Web server for previewing generated HTML locally
- Web server deployed on a PaaS like Heroku


For users with node.js, pub-server provides a simple command-line utility which can render an HTML website from markdown in any directory. The generated output uses npm-installable themes and is fully customizable.

The generator+editor can also run in-browser, allowing non-technical users to edit and instantly preview the generated HTML, without first installing pub-server themselves.

To see this in action, check out the docs at https://jldec.github.io/pub-doc/. The editor appears when you click on the [edit](https://jldec.github.io/pub-doc/pub/?page=%2F) button at the top right.
Feel free to play around - in this instance, your changes will not be recorded.

Other examples include a [presentation theme](https://github.com/jldec/pub-sample-deck), a [flexbox design](https://github.com/jldec/pub-theme-brief), and a [blog](https://blog.pubblz.com/)


![](/screenshots/screen1.png)

![](/screenshots/screen.png)

![](/screenshots/screen2.png)

## installation

**pub-server** requires node.js v6 or later running on MacOS or Linux.

``` bash
npm install -g pub-server
```

## usage

- `pub` (with no options) serves `*.md` in the current directory or looks for a `pub-config.js`. The default theme is useful for previewing GitHub README.md files like this one. The server will watch for changes and update http://localhost:3001/ whenever markdown files or CSS or other static files are saved. On macOS, the url will be auto-opened in the browser; use `pub -A` to prevent this.

- `pub -O` generates .html and other static files (including generator + editor) to `./out`.

- `pub -S <dir>` serves static files from any directory. It will mimic the behavior of GitHub Pages, looking for index.html files in folders, and redirecting from /folder-name to /folder-name/

- `pub -h` shows the usage info below:

```
pub-server v2.1.0

usage: pub [opts] [dir]
opts:
  -A, --no-open            disable auto-open in browser (mac only)
  -p, --port <port>        server port [3001]
  -t, --theme <name>       theme module-name or dir, repeatable (default: [])
  -o, --output-path <dir>  output dir [./out]
  -O, --output-only        output html, scripts, static files and exit
  -r, --root <prefix>      generate /prefix urls, "." means path relative
  -s, --static <dir>       static dir, repeatable, supports <dir>,<route> (default: [])
  -S, --static-only <dir>  serve only static files from <dir> (default: [])
  -C, --config             show config and exit
  -I, --ignore-config      ignore pub-config file
  -P, --pages              show pages and templates and exit
  -w, --watch-pkgs         also watch inside packages
  -W, --no-watch           disable watcher entirely
  -K, --no-sockets         no websockets
  -E, --no-editor          website only, no editor support
  -m, --minify             minify scripts
  -d, --dbg                enable scriptmaps and client-side debug traces
  -D, --debug              node --debug (server and client-side)
  -B, --debug-brk          node --debug-brk (server and client-side)
  -h, --help               output usage information
```

## credits

Major dependencies include:

- [express](https://expressjs.com/)
- [marked](https://github.com/markedjs/marked)
- [handlebars](https://handlebarsjs.com/)
- [browserify](https://github.com/browserify/browserify) and [browserify-middleware](https://github.com/ForbesLindesay/browserify-middleware)
- [chokidar](https://github.com/paulmillr/chokidar)
- [socket.io](https://socket.io/)
- [passport](https://github.com/jaredhanson/passport)

`npm ls` will list them all.
