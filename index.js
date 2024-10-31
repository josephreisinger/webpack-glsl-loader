"use strict";

var fs = require("fs");
var path = require("path");

// Prevent multi-import
// var importList = [];

function parse(loader, source, context, importList, cb) {
  var imports = [];
  var importPattern = /#include "([.\/\w_-]+)"/gi;
  var match = importPattern.exec(source);

  while (match != null) {
    imports.push({
      key: match[1],
      target: match[0],
      content: "",
    });
    match = importPattern.exec(source);
  }

  processImports(loader, source, context, imports, importList, cb);
}

function processImports(loader, source, context, imports, importList, cb) {
  if (imports.length === 0) {
    return cb(null, source);
  }

  var imp = imports.pop();

  loader.resolve(context, "./" + imp.key, function (err, resolved) {
    if (err) {
      return cb(err);
    }

    loader.addDependency(resolved);

    if (importList.includes(resolved)) {
      source = source.replace(imp.target, "\n");
      processImports(loader, source, context, imports, importList, cb);
    } else {
      importList.push(resolved);

      fs.readFile(resolved, "utf-8", function (err, src) {
        if (err) {
          return cb(err);
        }

        parse(
          loader,
          src,
          path.dirname(resolved),
          importList,
          function (err, bld) {
            if (err) {
              return cb(err);
            }

            source = source.replace(imp.target, bld);
            processImports(loader, source, context, imports, importList, cb);
          }
        );
      });
    }
  });
}

module.exports = function (source) {
  this.cacheable();
  var cb = this.async();
  parse(this, source, this.context, [], function (err, bld) {
    if (err) {
      return cb(err);
    }

    cb(null, "module.exports = " + JSON.stringify({ code: bld }));
  });
};
