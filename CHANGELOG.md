##### Nov 22 2015 v1.9.19
- fix marked-forms dependency (broken in 1.9.17)

##### Nov 22 2015 v1.9.18
- add pub-pager plugin to package.json
- NOTE: pub-pager is not compatible with pub-pkg-editor (yet)
- correct staticRoot computation in initOpts
- emit log events when watcher detects static or source changes
- debug pub:server:watch now called debug pub:watch

##### Nov 17 2015 v1.9.17
- remove generator dependency on marked-images
- fix relPath bug with generated {{{image}}} links

##### Nov 8 2015 v1.9.16
- fix ./node_modules/... paths in pub-config with npm3

##### Nov 8 2015 v1.9.15
- update all dependencies
- start testing with npm v3.x and node v5.x
- small fixes for font smoothing, text size adjust, prefer `_.assign`

##### Oct 24 2015 v1.9.14
- compose CHANGELOG.md

##### Oct 23 2015 v1.9.13
- change `pub -m` to minify scripts
- add bablify package
- jsx auto-convert

##### Oct 19 2015 v1.9.12
- fix bug in #eachFragment helper

##### Oct 18 2015 v1.9.10
- fix renderHtml - previous release was bad

##### Oct 16 2015 v1.9.9
- yet another relPath fix on static-hosted editor

##### Oct 16 2015 v1.9.8
- yet another relPath fix on static-hosted editor

##### Oct 15 2015 v1.9.7
- don't output nopublish pages

##### Oct 14 2015 v1.9.6
- make defaultRenderOpts dynamic, fix fqImages in static editor

##### Oct 14 2015 v1.9.5
- bump deps, fqImages with route match

##### Oct 5 2015 v1.9.4
- new pagetree helper
- add hook for marked highlighting
- bump font-awesome, generator

##### Sep 27 2015 v1.9.2
- generator.contentPages

##### Sep 27 2015 v1.9.1
- renderDocState to support recursive renderPage

##### Sep 26 2015 v1.9
- migrate from underscore to lodash
- htmlName support, fix escaping in renderLink

##### Sep 23 2015 v1.8.7
- proper 404 for .html with params
- page.category for pageTree

##### Sep 21 2015 v1.8.6
- latest socket.io for node v4, bump generator
- pluggable file parser
- generalize html helper to take markdown text in parameter

##### Sep 9 2015 v1.8.5
- temporary fix for node.js v4.x

##### Sep 5 2015 v1.8.4
- include roadmap in readme

##### Aug 26 2015 v1.8.3
- disable watch in pkgs, add helpers: json, mod, number

##### Aug 14 2015 v1.8.2
- readme, bump generator

##### Aug 12 2015 v1.8.1
- readme, filter binaries out of sources
- don't auto-templatize non-markdown files

##### Aug 10 2015 v1.8
- run from /subdir on static host, test w/ tape
- more reliable staticRoot

##### Aug 5 2015 v1.7.23
- in-editor presentation navigation

##### Aug 4 2015 v1.7.22
- editor relpath fix, doc print cleanup

##### Aug 4 2015 v1.7.21
- new helpers for lang, comments, github

##### Aug 4 2015 v1.7.20
- /pub/?page=url editor url supports static editor with relpaths

##### Jul 30 2015 v1.7.19
- fix for multi-source shower

##### Jul 30 2015 v1.7.18
- add -r relPaths option

##### Jul 28 2015 v1.7.17
- don't force fsEvents - fix Linux watcher, update deps
- nopublish on fragments - legacy

##### Jul 21 2015 v1.7.16
- error handling in static client

##### Jul 21 2015 v1.7.15
- extract serve-sessions, enable static save, output scripts

##### Jul 10 2015 v1.7.14
- fix debug message in watcher

##### Jul 10 2015 v1.7.13
- fix pub -O

##### Jul 10 2015 v1.7.12
- bump deps - esp browserify

##### Jul 6 2015 v1.7.10
- bump editor

##### Jul 6 2015 v1.7.10
- bigger edit button

##### Jul 6 2015 v1.7.9
- fix sessions to get redis opts from env

##### Jul 6 2015 v1.7.8
- bump deps, add pkg-font-open-sans

##### Jun 18 2015 v1.7.7
- bump doc theme

##### Jun 11 2015 v1.7.6
- "save" message

##### Jun 11 2015 v1.7.5
- fix bug with collision detection

##### Jun 10 2015 v.1.7.4
- fix opts.pkgName for doc theme

##### Jun 9 2015 v1.7.3
- update doc theme

##### Jun 8 2015 v1.7.2
- bump pub-theme-doc

##### Jun 8 2015 v1.7.1
- bump pub-theme-doc version

##### Jun 7 2015 v1.7
- default theme = pub-theme-doc, auto-configure statics using output
- relPaths:true only for outputs, auto-detect fragmentDelim

##### Jun 2 2015 v1.6
- rename: themes -> pkgs

##### May 30 2015 v1.5.1
- oops fix highlight dependency version

##### May 29 2015 v1.5
- inject css & js (deprecate {{pub-ux}})
- simplified logic for parsing labels

##### May 23 2015 v1.4.3
- pub cli editor fix

##### May 23 2015 v1.4.2
- staticOnly takes dir, send content-type text/html for extensionless statics

##### May 22 2015 v1.4.1
- readme

##### May 22 2015 v1.4
- `pub -S` staticOnly, indexFile auto-name, src-fs sort

##### May 12 2015 v1.3.2
- remove pub-ux editor scripts from output

##### May 12 2015 v1.3.1
- ignoreConfig option

##### May 11 2015 v1.3
- latest generator and editor

##### May 8 2015 v1.2.1
- default static file, -O production

##### May 7 2015 v1.2
- move wrapper divs into generator - affects all layouts

##### May 6 2015 v1.1
- output with default .html extension
- improved static server, relPaths

##### May 1 2015 v1.0.6
- use fs-extra.copy to output static files

##### May 1 2015 v1.0.5
- more readme

##### May 1 2015 v1.0.4
- readme for output

##### Apr 30 2015 v1.0.3
- upgrade generator

##### Apr 28 2015 v1.0.2
- move files into /server and /images
- readme addition

##### Apr 28 2015 v1.0
- first commit
