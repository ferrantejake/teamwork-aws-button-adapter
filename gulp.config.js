'use strict';

module.exports = function () {
    const lib = './lib/';

    const globs = {
        allDirs: '**/*',
        allFiles: '**/*.*'
    };

    const config = {
        node_modules: `./node_modules/${globs.allFiles}`,
        index: 'index.js',
        lib: {
            directory: lib,
            files: `${lib}${globs.allFiles}`
        }
    };
    return config;
}
