#### May 09, 2021, v2.8.1
- fix redis security warning
- Static only (-S) now scans directories to depth 10

#### March 16, 2021, v2.8.0
- pub-pkg-seo v1.2.0 - emits meta tag to noindex,nofollow for page.nocrawl

#### March 16, 2021, v2.7.6
- pub-pkg-seo v1.2.0 - emits meta tag to noindex,nofollow for page.nocrawl

#### March 07, 2021, v2.7.5
- bump to marked v2.0.1 - resolves security warning
- support for .classnames in title strings of image markdown
- opts.canonicalUrl injects canonical `<link>` on every page  
  see [pub-pkg-seo](https://github.com/jldec/pub-pkg-seo/)

#### December 13, 2020, v2.7.4
- remove dependency on browserify-middleware which is no longer supported  
  browserScripts are now auto-bundled using browserify directly  
  bundles are slightly larger, and a little slower (up-to-date node shims)  
  bundles are memoized in memory and served with 60 min cache by pub-server
- bump marked v1.2.6 - allow urls in links and images surrounded with `<url>`

#### November 22, 2020, v2.7.3
- fix socket.io notifications to work without dependence on jquery
- bump marked v1.2.5

#### November 16, 2020, v2.7.2
- improve resolution of files in pub packages inside node_modules
- bump marked v1.2.4

#### November 09, 2020, v2.7.1
- linter fix

#### November 09, 2020, v2.7.0
- fixed race when publishing browserScripts with pub -O
- marked editor help pages as writable

#### November 08, 2020, v2.6.0
- dependencies
- marked v1.2.3 with more commonmark cleanup
- env var DISABLE_AUTH
- only respect nopublish flag on pages in production

#### September 13, 2020, v2.5.0
- output.fileMap
  - pub -O will generate output manifest in filemap.json with pages, statics, and scripts
- temporily removed unused editor apis:
  - /admin/reloadSources
  - /admin/outputPages
  - /admin/logPages
  - /admin/reloadSources
- via pub-generator v4.0.0:
  - opts.parentFolderWarnings
    - displays warning if page tree is missing folder nodes
  - output.outputAliases
    - use redirect template (not provided) to generate html-based redirects for aliases
  - page.noextension
    - prevents auto .html extension for that page on output
- Fix security warning in pub-src-http related to [node-fetch](https://github.com/node-fetch/node-fetch/security/advisories/GHSA-w7rc-rwvf-8q5r).

#### August 9, 2020 v2.4.3
- redisOpts server-only
- pub-src-redis respects pub-src-github commit message

#### August 2, 2020 v2.4.2
- prioritize serving static files and scripts over generated pages (server-only)
- fix upload template in pub-pkg-editor

#### July 26, 2020 v2.4.1
- fix missing generator-plugin in published pub-pkg-editor

#### July 26, 2020 v2.4.0
- improved editor with configurable opts.editorPrefix
- 2-level pub-src-redis cache for staging edits of markdown source files
  this enables a workflow with a staging endpoint for editors to preview unpublished content
- editor UI enhancements for file commit and file revert
- publish minified browserscripts
- serve json files as static paths without extension

#### May 31, 2020 v2.3.0
- support `output.overrideOpts` for `pub -O`
- `pub -S` no longer defaults to serving last static file instead of 404
- Improved page and layout wrapper divs unless `opts.renderPageLayoutOld`
- marked-forms v4.0.0 with `opts.allowSpacesInLinks` to patch link tokenizer (previously always auto-patched)
- pub-src-fs v2.1.0 with `opts.dirsSame` to sort directories together with files

#### April 26, 2020 v2.2.0
- bump to marked v1.0.0
- support new marked plugin api with `generator.marked.use()` instead of patching `generator.renderer`
- default to non-mangled autolinked email addresses (override by setting `opts.mangleEmails:true`)
- removed `eachLinkIn` handlebars helper - not being used

#### March 22, 2020 v2.1.0
- bump dependencies
- tested with Node versions 10.x, 12.x and 13.x. using GitHub Actions
- pub CLI will auto-open site in browser on macOS (unless `-A`)
- if opts.linkNewWindow, auto-generate target="_blank" with `rel="noopener"`
- persistent sessions using redis require secret in env.SSC or opts.session.secret
- stricter commonmark compliance (e.g. no HTML tags in headings, preserve UTF-8 non-breaking space glyph)

#### July 14, 2019 v2.0.2
- bump dependencies to mitigate vulnerability in lodash (used by pub-util)
- bump marked to v0.7.0
- bump eslint, fix potential issue with Object.hasOwnProperty

#### May 19 2019 v2.0.1
- set opts['trust proxy'] for secure sessions on environments like Heroku

#### May 05 2019 v2.0.0
- and we're back!
- tested with Node versions 8.x, 10.x, and 11.x.
- Windows file paths and directory separator support
- Windows fragment parser support for source files with Windows end-of-line (CRLF) characters 
- major version upgrade to lodash 4.x in pub-util, added aliases for better backward compatibility
- major version upgrade to marked 0.6.x for commonmark compliance, see new workaround for spaces in field names in marked-forms v2.0.0
- fixed directory sorting bug in pub-src-fs and pub-src-redis
- run CI on many modules with tests
- introduced eslint for major modules
- don't use package-lock.json per https://github.com/sindresorhus/ama/issues/479#issuecomment-310661514
- reduced scanning for statics, and default to single level of statics when no pub-config exists. 
- bump dependencies across libraries mostly to address deprecations and security warnings
- removed support for pub-pkg-spa
- use HTTPS instead of HTTP for links in readme, docs etc.  

#### May 10 2016 v1.10.2
- output.match filter for filtering on output
- opts.staticDepth default

#### Feb 02 2016 v1.10.1
- move pub-ux.js from /server/ to /pub/ (fixes issue introduced in v1.10.0)
- proper local @data frame for #eachFragment and #eachPage helpers
- #eachFragment supports /page#fragment prefix pattern

#### Dec 15 2015 v1.10.0
- add support for pub-pkg-spa in preparation for new editor
- don't output `pub/*.js` unless opts.editor
- move socket.io client from pub-ux.js into separate pub-sockets.js
- remove built-in pub-pager package
- remove htmlOnly option

#### Dec 03 2015 v1.9.21
- update pub-src-github, pub-src-fs to handle binaries
- (pub-src-redis doesn't handle binaries yet)

#### Nov 22 2015 v1.9.20
- update pager
- expose generator.debug

#### Nov 22 2015 v1.9.19
- fix marked-forms dependency (broken in 1.9.17)

#### Nov 22 2015 v1.9.18
- add pub-pager plugin to package.json
- NOTE: pub-pager is not compatible with pub-pkg-editor (yet)
- correct staticRoot computation in initOpts
- emit log events when watcher detects static or source changes
- debug pub:server:watch now called debug pub:watch

#### Nov 17 2015 v1.9.17
- remove generator dependency on marked-images
- fix relPath bug with generated {{{image}}} links

#### Nov 8 2015 v1.9.16
- fix ./node_modules/... paths in pub-config with npm3

#### Nov 8 2015 v1.9.15
- update all dependencies
- start testing with npm v3.x and node v5.x
- small fixes for font smoothing, text size adjust, prefer `_.assign`

#### Oct 24 2015 v1.9.14
- compose CHANGELOG.md

#### Oct 23 2015 v1.9.13
- change `pub -m` to minify scripts
- add bablify package
- jsx auto-convert

#### Oct 19 2015 v1.9.12
- fix bug in #eachFragment helper

#### Oct 18 2015 v1.9.10
- fix renderHtml - previous release was bad

#### Oct 16 2015 v1.9.9
- yet another relPath fix on static-hosted editor

#### Oct 16 2015 v1.9.8
- yet another relPath fix on static-hosted editor

#### Oct 15 2015 v1.9.7
- don't output nopublish pages

#### Oct 14 2015 v1.9.6
- make defaultRenderOpts dynamic, fix fqImages in static editor

#### Oct 14 2015 v1.9.5
- bump deps, fqImages with route match

#### Oct 5 2015 v1.9.4
- new pagetree helper
- add hook for marked highlighting
- bump font-awesome, generator

#### Sep 27 2015 v1.9.2
- generator.contentPages

#### Sep 27 2015 v1.9.1
- renderDocState to support recursive renderPage

#### Sep 26 2015 v1.9
- migrate from underscore to lodash
- htmlName support, fix escaping in renderLink

#### Sep 23 2015 v1.8.7
- proper 404 for .html with params
- page.category for pageTree

#### Sep 21 2015 v1.8.6
- latest socket.io for node v4, bump generator
- pluggable file parser
- generalize html helper to take markdown text in parameter

#### Sep 9 2015 v1.8.5
- temporary fix for node.js v4.x

#### Sep 5 2015 v1.8.4
- include roadmap in readme

#### Aug 26 2015 v1.8.3
- disable watch in pkgs, add helpers: json, mod, number

#### Aug 14 2015 v1.8.2
- readme, bump generator

#### Aug 12 2015 v1.8.1
- readme, filter binaries out of sources
- don't auto-templatize non-markdown files

#### Aug 10 2015 v1.8
- run from /subdir on static host, test w/ tape
- more reliable staticRoot

#### Aug 5 2015 v1.7.23
- in-editor presentation navigation

#### Aug 4 2015 v1.7.22
- editor relpath fix, doc print cleanup

#### Aug 4 2015 v1.7.21
- new helpers for lang, comments, github

#### Aug 4 2015 v1.7.20
- /pub/?page=url editor url supports static editor with relpaths

#### Jul 30 2015 v1.7.19
- fix for multi-source shower

#### Jul 30 2015 v1.7.18
- add -r relPaths option

#### Jul 28 2015 v1.7.17
- don't force fsEvents - fix Linux watcher, update deps
- nopublish on fragments - legacy

#### Jul 21 2015 v1.7.16
- error handling in static client

#### Jul 21 2015 v1.7.15
- extract serve-sessions, enable static save, output scripts

#### Jul 10 2015 v1.7.14
- fix debug message in watcher

#### Jul 10 2015 v1.7.13
- fix pub -O

#### Jul 10 2015 v1.7.12
- bump deps - esp browserify

#### Jul 6 2015 v1.7.10
- bump editor

#### Jul 6 2015 v1.7.10
- bigger edit button

#### Jul 6 2015 v1.7.9
- fix sessions to get redis opts from env

#### Jul 6 2015 v1.7.8
- bump deps, add pkg-font-open-sans

#### Jun 18 2015 v1.7.7
- bump doc theme

#### Jun 11 2015 v1.7.6
- "save" message

#### Jun 11 2015 v1.7.5
- fix bug with collision detection

#### Jun 10 2015 v.1.7.4
- fix opts.pkgName for doc theme

#### Jun 9 2015 v1.7.3
- update doc theme

#### Jun 8 2015 v1.7.2
- bump pub-theme-doc

#### Jun 8 2015 v1.7.1
- bump pub-theme-doc version

#### Jun 7 2015 v1.7
- default theme = pub-theme-doc, auto-configure statics using output
- relPaths:true only for outputs, auto-detect fragmentDelim

#### Jun 2 2015 v1.6
- rename: themes -> pkgs

#### May 30 2015 v1.5.1
- oops fix highlight dependency version

#### May 29 2015 v1.5
- inject css & js (deprecate {{pub-ux}})
- simplified logic for parsing labels

#### May 23 2015 v1.4.3
- pub cli editor fix

#### May 23 2015 v1.4.2
- staticOnly takes dir, send content-type text/html for extensionless statics

#### May 22 2015 v1.4.1
- readme

#### May 22 2015 v1.4
- `pub -S` staticOnly, indexFile auto-name, src-fs sort

#### May 12 2015 v1.3.2
- remove pub-ux editor scripts from output

#### May 12 2015 v1.3.1
- ignoreConfig option

#### May 11 2015 v1.3
- latest generator and editor

#### May 8 2015 v1.2.1
- default static file, -O production

#### May 7 2015 v1.2
- move wrapper divs into generator - affects all layouts

#### May 6 2015 v1.1
- output with default .html extension
- improved static server, relPaths

#### May 1 2015 v1.0.6
- use fs-extra.copy to output static files

#### May 1 2015 v1.0.5
- more readme

#### May 1 2015 v1.0.4
- readme for output

#### Apr 30 2015 v1.0.3
- upgrade generator

#### Apr 28 2015 v1.0.2
- move files into /server and /images
- readme addition

#### Apr 28 2015 v1.0
- first commit
