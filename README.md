## pub-server

**pub-server**, or **pub** for short is an HTML generator+editor entirely written in javascript.

The generator+editor runs in-browser, allowing non-technical users to edit their markdown _source_ text fragments, and instantly preview the generated HTML, without first installing pub-server themselves.

When you publish onto a static hosting service like [Github pages](https://pages.github.com/), you can include the generator+editor together with the published HTML.

To see this in action, check out the docs at http://jldec.github.io/pub-doc/. The editor appears when you click on the [edit](http://jldec.github.io/pub-doc/pub/?page=%2F) button at the top right.
Feel free to play around - in this instance, your changes will not be recorded.

Other examples include a [presentation theme](https://github.com/jldec/pub-sample-deck), a [flexbox design](https://github.com/jldec/pub-theme-brief), and a [blog](http://blog.pubblz.com/)

_NOTE: This editor will be much improved, including wysiwig markdown features, once [marijnh](https://github.com/marijnh/) releases [ProseMirror](https://github.com/ProseMirror/prosemirror). Please support him [here](https://www.indiegogo.com/projects/prosemirror/#/story)._

![](/screenshots/screen1.png)

![](/screenshots/screen.png)

![](/screenshots/screen2.png)

### installation

using **pub-server** requires node.js or io.js.

``` bash
npm install -g pub-server
```

OSX and Linux are working, Windows support is coming - PRs welcome.


### usage

- `pub` (with no options) serves `*.md` in the current directory or looks for a `pub-config.js`. The default theme is useful for previewing Github README.md files like this one. The server will watch for changes and update http://localhost:3001/ whenever markdown files or CSS or other static files are saved.

- `pub -O` generates .html and other static files (including generator + editor) to `./out`.

- `pub -S <dir>` serves static files from any directory. It will mimic the behavior of Github Pages, looking for index.html files in folders, and redirecting from /folder-name to /folder-name/

- `pub -h` shows the usage info below:

```
pub-server v1.8.3

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
  -w, --watch-pkgs         also watch inside packages
  -W, --no-watch           disable watcher entirely
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
