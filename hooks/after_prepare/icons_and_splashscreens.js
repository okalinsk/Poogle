#!/usr/bin/env node
/**
 * Algorithm
 * [1] Look at all installed platforms
 * [2] Copy (non-destructive) icons and splash screens from platform to local RESOURCE_DIR
 * [3] Copy (destructive) matching icons and splash screens from RESOURCE_DIR to platform
 *
 * This ensures that local RESOURCE_DIR will be pre-scaffolded with icons and splash
 * screens generated by Cordova as placeholder ONLY for installed platforms and that
 * any modifications to local assets are reflected in the CORRECT Cordova platform
 * locations, without having to hardcode file paths.
 */
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var ncp = require('ncp');
var mkdirp = require('mkdirp');
var glob = require('glob');
var Orchestrator = require('orchestrator');

var BASES = {
  android: 'res',
  ios: 'Poogle/Resources'
};
var RESOURCE_DIR = 'resources';

// Helper function for file copying that ensures directory existence.
function copyFile (src, dest, ncpOpts, callback) {
  var orchestrator = new Orchestrator();
  var parts = dest.split(path.sep);
  var fileName = parts.pop();
  var destDir = parts.join(path.sep);
  var destFile = path.resolve(destDir, fileName);
  orchestrator.add('ensureDir', function (done) {
    mkdirp(destDir, function (err) {
      done(err);
    });
  });
  orchestrator.add('copyFile', ['ensureDir'], function (done) {
    ncp(src, destFile, ncpOpts, function (err) {
      done(err);
    });
  });
  orchestrator.start('copyFile', function (err) {
    callback(err);
  });
}

// Main
var platforms = _.filter(fs.readdirSync('platforms'), function (file) {
  return fs.statSync(path.resolve('platforms', file)).isDirectory();
});
_.each(platforms, function (platform) {
  var base = path.resolve('platforms', platform, BASES[platform]);
  glob(base + '/**/*.png', function (err, files) {
    _.each(files, function (cordovaFile) {
      var orchestrator = new Orchestrator();
      var parts = cordovaFile.split('/');
      var fileName = parts.pop();
      var localDir = path.resolve(RESOURCE_DIR, platform, _.last(parts));
      var localFile = path.resolve(localDir, fileName);

      orchestrator.add('copyFromCordova', function (done) {
        copyFile(cordovaFile, localFile, { clobber: false }, function (err) {
          done(err);
        });
      });
      orchestrator.add('copyToCordova', ['copyFromCordova'], function (done) {
        copyFile(localFile, cordovaFile, { clobber: true }, function (err) {
          done(err);
        });
      });
      orchestrator.start('copyToCordova', function (err) {
        if (err) { console.error(err); }
      });
    });
  });
});
