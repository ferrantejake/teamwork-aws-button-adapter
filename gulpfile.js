'use strict';

/* eslint-disable prefer-arrow-callback */
/* TODO: Use arrow-functions for tasks once gulp-param fixes bug that causes them not to work */

const config = require('./gulp.config.js')();
const gulp = require('gulp-help')(require('gulp'));
const zip = require('gulp-zip');
const del = require('del');
const merge = require('merge2');

// load gulp plugins
const G$ = require('gulp-load-plugins')({ lazy: true });

// load settings
const settings = require('./gulp.json');
const tsconfig = require('./tsconfig.json');
let tsProject;

gulp.task('publish', 'Builds and packages files for AWS Lambda', function (callback) {
    G$.sequence('build', 'package', callback);
})

// Publishing

gulp.task('package', 'Packages files for AWS Lambda', () => {
    return gulp.src([config.lib.files, config.index, config.node_modules], { base: '.' })
        .pipe(zip('package.zip'))
        .pipe(gulp.dest('bin'));
});

// Building

gulp.task('build', 'Compiles all TypeScript source files and updates module references', function (callback) {
    G$.sequence(['tslint', 'clean'], 'typescript', callback);
});

// Cleaning

gulp.task('clean', 'Cleans the generated files from lib directory', function () {
    return del((settings.dest), { dot: true });
});

// Transpiling

gulp.task(`typescript`, `Transpile typescript files`, function () {
    tsProject = G$.typescript.createProject(tsconfig.compilerOptions);
    const tsResult = gulp.src(settings.tsfiles)
        .pipe(G$.sourcemaps.init())
        .pipe(tsProject());
    const dest = settings.dest;
    return merge([
        // .d.ts files
        tsResult.dts.pipe(gulp.dest(dest)),
        // .js files + sourcemaps
        settings.inlineSourcemaps
            ? tsResult.js
                .pipe(G$.sourcemaps.write()) // inline sourcemaps
                .pipe(gulp.dest(dest))
            : tsResult.js
                .pipe(G$.sourcemaps.write('.')) // separate .js.map files
                .pipe(gulp.dest(dest)),
        // all other files
        gulp.src(settings.resources).pipe(gulp.dest(dest))
    ]);
});

// see https://www.npmjs.com/package/tslint
gulp.task('tslint', 'Lints all TypeScript source files', function () {
    return gulp.src(settings.tsfiles)
        .pipe(G$.tslint({
            formatter: 'verbose'
        }))
        .pipe(G$.tslint.report({
            emitError: false
        }));
});