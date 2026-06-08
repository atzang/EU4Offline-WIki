function isCompatible(ua) {
    return !!((function() {
        'use strict';
        return !this && Function.prototype.bind;
    }()) && 'querySelector'in document && 'localStorage'in window && !ua.match(/MSIE 10|NetFront|Opera Mini|S40OviBrowser|MeeGo|Android.+Glass|^Mozilla\/5\.0 .+ Gecko\/$|googleweblight|PLAYSTATION|PlayStation/));
}
if (!isCompatible(navigator.userAgent)) {
    document.documentElement.className = document.documentElement.className.replace(/(^|\s)client-js(\s|$)/, '$1client-nojs$2');
    while (window.NORLQ && NORLQ[0]) {
        NORLQ.shift()();
    }
    NORLQ = {
        push: function(fn) {
            fn();
        }
    };
    RLQ = {
        push: function() {}
    };
} else {
    if (window.performance && performance.mark) {
        performance.mark('mwStartup');
    }
    (function() {
        'use strict';
        var con = window.console;
        function logError(topic, data) {
            if (con.log) {
                var e = data.exception;
                var msg = (e ? 'Exception' : 'Error') + ' in ' + data.source + (data.module ? ' in module ' + data.module : '') + (e ? ':' : '.');
                con.log(msg);
                if (e && con.warn) {
                    con.warn(e);
                }
            }
        }
        function Map() {
            this.values = Object.create(null);
        }
        Map.prototype = {
            constructor: Map,
            get: function(selection, fallback) {
                if (arguments.length < 2) {
                    fallback = null;
                }
                if (typeof selection === 'string') {
                    return selection in this.values ? this.values[selection] : fallback;
                }
                var results;
                if (Array.isArray(selection)) {
                    results = {};
                    for (var i = 0; i < selection.length; i++) {
                        if (typeof selection[i] === 'string') {
                            results[selection[i]] = selection[i]in this.values ? this.values[selection[i]] : fallback;
                        }
                    }
                    return results;
                }
                if (selection === undefined) {
                    results = {};
                    for (var key in this.values) {
                        results[key] = this.values[key];
                    }
                    return results;
                }
                return fallback;
            },
            set: function(selection, value) {
                if (arguments.length > 1) {
                    if (typeof selection === 'string') {
                        this.values[selection] = value;
                        return true;
                    }
                } else if (typeof selection === 'object') {
                    for (var key in selection) {
                        this.values[key] = selection[key];
                    }
                    return true;
                }
                return false;
            },
            exists: function(selection) {
                return typeof selection === 'string' && selection in this.values;
            }
        };
        var log = function() {};
        log.warn = con.warn ? Function.prototype.bind.call(con.warn, con) : function() {}
        ;
        var mw = {
            now: function() {
                var perf = window.performance;
                var navStart = perf && perf.timing && perf.timing.navigationStart;
                mw.now = navStart && perf.now ? function() {
                    return navStart + perf.now();
                }
                : Date.now;
                return mw.now();
            },
            trackQueue: [],
            track: function(topic, data) {
                mw.trackQueue.push({
                    topic: topic,
                    data: data
                });
            },
            trackError: function(topic, data) {
                mw.track(topic, data);
                logError(topic, data);
            },
            Map: Map,
            config: new Map(),
            messages: new Map(),
            templates: new Map(),
            log: log
        };
        window.mw = window.mediaWiki = mw;
    }());
    (function() {
        'use strict';
        var StringSet, store, hasOwn = Object.hasOwnProperty;
        function defineFallbacks() {
            StringSet = window.Set || function() {
                var set = Object.create(null);
                return {
                    add: function(value) {
                        set[value] = true;
                    },
                    has: function(value) {
                        return value in set;
                    }
                };
            }
            ;
        }
        defineFallbacks();
        function fnv132(str) {
            var hash = 0x811C9DC5;
            for (var i = 0; i < str.length; i++) {
                hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
                hash ^= str.charCodeAt(i);
            }
            hash = (hash >>> 0).toString(36).slice(0, 5);
            while (hash.length < 5) {
                hash = '0' + hash;
            }
            return hash;
        }
        var isES6Supported = typeof Promise === 'function' && Promise.prototype.finally && /./g.flags === 'g' && (function() {
            try {
                new Function('(a = 0) => a');
                return true;
            } catch (e) {
                return false;
            }
        }());
        var registry = Object.create(null), sources = Object.create(null), handlingPendingRequests = false, pendingRequests = [], queue = [], jobs = [], willPropagate = false, errorModules = [], baseModules = ["jquery", "mediawiki.base"], marker = document.querySelector('meta[name="ResourceLoaderDynamicStyles"]'), lastCssBuffer, rAF = window.requestAnimationFrame || setTimeout;
        function addToHead(el, nextNode) {
            if (nextNode && nextNode.parentNode) {
                nextNode.parentNode.insertBefore(el, nextNode);
            } else {
                document.head.appendChild(el);
            }
        }
        function newStyleTag(text, nextNode) {
            var el = document.createElement('style');
            el.appendChild(document.createTextNode(text));
            addToHead(el, nextNode);
            return el;
        }
        function flushCssBuffer(cssBuffer) {
            if (cssBuffer === lastCssBuffer) {
                lastCssBuffer = null;
            }
            newStyleTag(cssBuffer.cssText, marker);
            for (var i = 0; i < cssBuffer.callbacks.length; i++) {
                cssBuffer.callbacks[i]();
            }
        }
        function addEmbeddedCSS(cssText, callback) {
            if (!lastCssBuffer || cssText.slice(0, 7) === '@import') {
                lastCssBuffer = {
                    cssText: '',
                    callbacks: []
                };
                rAF(flushCssBuffer.bind(null, lastCssBuffer));
            }
            lastCssBuffer.cssText += '\n' + cssText;
            lastCssBuffer.callbacks.push(callback);
        }
        function getCombinedVersion(modules) {
            var hashes = modules.reduce(function(result, module) {
                return result + registry[module].version;
            }, '');
            return fnv132(hashes);
        }
        function allReady(modules) {
            for (var i = 0; i < modules.length; i++) {
                if (mw.loader.getState(modules[i]) !== 'ready') {
                    return false;
                }
            }
            return true;
        }
        function allWithImplicitReady(module) {
            return allReady(registry[module].dependencies) && (baseModules.indexOf(module) !== -1 || allReady(baseModules));
        }
        function anyFailed(modules) {
            for (var i = 0; i < modules.length; i++) {
                var state = mw.loader.getState(modules[i]);
                if (state === 'error' || state === 'missing') {
                    return modules[i];
                }
            }
            return false;
        }
        function doPropagation() {
            var didPropagate = true;
            var module;
            while (didPropagate) {
                didPropagate = false;
                while (errorModules.length) {
                    var errorModule = errorModules.shift()
                      , baseModuleError = baseModules.indexOf(errorModule) !== -1;
                    for (module in registry) {
                        if (registry[module].state !== 'error' && registry[module].state !== 'missing') {
                            if (baseModuleError && baseModules.indexOf(module) === -1) {
                                registry[module].state = 'error';
                                didPropagate = true;
                            } else if (registry[module].dependencies.indexOf(errorModule) !== -1) {
                                registry[module].state = 'error';
                                errorModules.push(module);
                                didPropagate = true;
                            }
                        }
                    }
                }
                for (module in registry) {
                    if (registry[module].state === 'loaded' && allWithImplicitReady(module)) {
                        execute(module);
                        didPropagate = true;
                    }
                }
                for (var i = 0; i < jobs.length; i++) {
                    var job = jobs[i];
                    var failed = anyFailed(job.dependencies);
                    if (failed !== false || allReady(job.dependencies)) {
                        jobs.splice(i, 1);
                        i -= 1;
                        try {
                            if (failed !== false && job.error) {
                                job.error(new Error('Failed dependency: ' + failed), job.dependencies);
                            } else if (failed === false && job.ready) {
                                job.ready();
                            }
                        } catch (e) {
                            mw.trackError('resourceloader.exception', {
                                exception: e,
                                source: 'load-callback'
                            });
                        }
                        didPropagate = true;
                    }
                }
            }
            willPropagate = false;
        }
        function setAndPropagate(module, state) {
            registry[module].state = state;
            if (state === 'ready') {
                store.add(module);
            } else if (state === 'error' || state === 'missing') {
                errorModules.push(module);
            } else if (state !== 'loaded') {
                return;
            }
            if (willPropagate) {
                return;
            }
            willPropagate = true;
            mw.requestIdleCallback(doPropagation, {
                timeout: 1
            });
        }
        function sortDependencies(module, resolved, unresolved) {
            if (!(module in registry)) {
                throw new Error('Unknown module: ' + module);
            }
            if (typeof registry[module].skip === 'string') {
                var skip = (new Function(registry[module].skip)());
                registry[module].skip = !!skip;
                if (skip) {
                    registry[module].dependencies = [];
                    setAndPropagate(module, 'ready');
                    return;
                }
            }
            if (!unresolved) {
                unresolved = new StringSet();
            }
            var deps = registry[module].dependencies;
            unresolved.add(module);
            for (var i = 0; i < deps.length; i++) {
                if (resolved.indexOf(deps[i]) === -1) {
                    if (unresolved.has(deps[i])) {
                        throw new Error('Circular reference detected: ' + module + ' -> ' + deps[i]);
                    }
                    sortDependencies(deps[i], resolved, unresolved);
                }
            }
            resolved.push(module);
        }
        function resolve(modules) {
            var resolved = baseModules.slice();
            for (var i = 0; i < modules.length; i++) {
                sortDependencies(modules[i], resolved);
            }
            return resolved;
        }
        function resolveStubbornly(modules) {
            var resolved = baseModules.slice();
            for (var i = 0; i < modules.length; i++) {
                var saved = resolved.slice();
                try {
                    sortDependencies(modules[i], resolved);
                } catch (err) {
                    resolved = saved;
                    mw.log.warn('Skipped unavailable module ' + modules[i]);
                    if (modules[i]in registry) {
                        mw.trackError('resourceloader.exception', {
                            exception: err,
                            source: 'resolve'
                        });
                    }
                }
            }
            return resolved;
        }
        function resolveRelativePath(relativePath, basePath) {
            var relParts = relativePath.match(/^((?:\.\.?\/)+)(.*)$/);
            if (!relParts) {
                return null;
            }
            var baseDirParts = basePath.split('/');
            baseDirParts.pop();
            var prefixes = relParts[1].split('/');
            prefixes.pop();
            var prefix;
            while ((prefix = prefixes.pop()) !== undefined) {
                if (prefix === '..') {
                    baseDirParts.pop();
                }
            }
            return (baseDirParts.length ? baseDirParts.join('/') + '/' : '') + relParts[2];
        }
        function makeRequireFunction(moduleObj, basePath) {
            return function require(moduleName) {
                var fileName = resolveRelativePath(moduleName, basePath);
                if (fileName === null) {
                    return mw.loader.require(moduleName);
                }
                if (hasOwn.call(moduleObj.packageExports, fileName)) {
                    return moduleObj.packageExports[fileName];
                }
                var scriptFiles = moduleObj.script.files;
                if (!hasOwn.call(scriptFiles, fileName)) {
                    throw new Error('Cannot require undefined file ' + fileName);
                }
                var result, fileContent = scriptFiles[fileName];
                if (typeof fileContent === 'function') {
                    var moduleParam = {
                        exports: {}
                    };
                    fileContent(makeRequireFunction(moduleObj, fileName), moduleParam, moduleParam.exports);
                    result = moduleParam.exports;
                } else {
                    result = fileContent;
                }
                moduleObj.packageExports[fileName] = result;
                return result;
            }
            ;
        }
        function addScript(src, callback) {
            var script = document.createElement('script');
            script.src = src;
            script.onload = script.onerror = function() {
                if (script.parentNode) {
                    script.parentNode.removeChild(script);
                }
                if (callback) {
                    callback();
                    callback = null;
                }
            }
            ;
            document.head.appendChild(script);
            return script;
        }
        function queueModuleScript(src, moduleName, callback) {
            pendingRequests.push(function() {
                if (moduleName !== 'jquery') {
                    window.require = mw.loader.require;
                    window.module = registry[moduleName].module;
                }
                addScript(src, function() {
                    delete window.module;
                    callback();
                    if (pendingRequests[0]) {
                        pendingRequests.shift()();
                    } else {
                        handlingPendingRequests = false;
                    }
                });
            });
            if (!handlingPendingRequests && pendingRequests[0]) {
                handlingPendingRequests = true;
                pendingRequests.shift()();
            }
        }
        function addLink(url, media, nextNode) {
            var el = document.createElement('link');
            el.rel = 'stylesheet';
            if (media) {
                el.media = media;
            }
            el.href = url;
            addToHead(el, nextNode);
            return el;
        }
        function domEval(code) {
            var script = document.createElement('script');
            if (mw.config.get('wgCSPNonce') !== false) {
                script.nonce = mw.config.get('wgCSPNonce');
            }
            script.text = code;
            document.head.appendChild(script);
            script.parentNode.removeChild(script);
        }
        function enqueue(dependencies, ready, error) {
            if (allReady(dependencies)) {
                if (ready) {
                    ready();
                }
                return;
            }
            var failed = anyFailed(dependencies);
            if (failed !== false) {
                if (error) {
                    error(new Error('Dependency ' + failed + ' failed to load'), dependencies);
                }
                return;
            }
            if (ready || error) {
                jobs.push({
                    dependencies: dependencies.filter(function(module) {
                        var state = registry[module].state;
                        return state === 'registered' || state === 'loaded' || state === 'loading' || state === 'executing';
                    }),
                    ready: ready,
                    error: error
                });
            }
            dependencies.forEach(function(module) {
                if (registry[module].state === 'registered' && queue.indexOf(module) === -1) {
                    queue.push(module);
                }
            });
            mw.loader.work();
        }
        function execute(module) {
            if (registry[module].state !== 'loaded') {
                throw new Error('Module in state "' + registry[module].state + '" may not execute: ' + module);
            }
            registry[module].state = 'executing';
            var runScript = function() {
                var script = registry[module].script;
                var markModuleReady = function() {
                    setAndPropagate(module, 'ready');
                };
                var nestedAddScript = function(arr, offset) {
                    if (offset >= arr.length) {
                        markModuleReady();
                        return;
                    }
                    queueModuleScript(arr[offset], module, function() {
                        nestedAddScript(arr, offset + 1);
                    });
                };
                try {
                    if (Array.isArray(script)) {
                        nestedAddScript(script, 0);
                    } else if (typeof script === 'function') {
                        if (module === 'jquery') {
                            script();
                        } else {
                            script(window.$, window.$, mw.loader.require, registry[module].module);
                        }
                        markModuleReady();
                    } else if (typeof script === 'object' && script !== null) {
                        var mainScript = script.files[script.main];
                        if (typeof mainScript !== 'function') {
                            throw new Error('Main file in module ' + module + ' must be a function');
                        }
                        mainScript(makeRequireFunction(registry[module], script.main), registry[module].module, registry[module].module.exports);
                        markModuleReady();
                    } else if (typeof script === 'string') {
                        domEval(script);
                        markModuleReady();
                    } else {
                        markModuleReady();
                    }
                } catch (e) {
                    setAndPropagate(module, 'error');
                    mw.trackError('resourceloader.exception', {
                        exception: e,
                        module: module,
                        source: 'module-execute'
                    });
                }
            };
            if (registry[module].messages) {
                mw.messages.set(registry[module].messages);
            }
            if (registry[module].templates) {
                mw.templates.set(module, registry[module].templates);
            }
            var cssPending = 0;
            var cssHandle = function() {
                cssPending++;
                return function() {
                    cssPending--;
                    if (cssPending === 0) {
                        var runScriptCopy = runScript;
                        runScript = undefined;
                        runScriptCopy();
                    }
                }
                ;
            };
            if (registry[module].style) {
                for (var key in registry[module].style) {
                    var value = registry[module].style[key];
                    if (key === 'css') {
                        for (var i = 0; i < value.length; i++) {
                            addEmbeddedCSS(value[i], cssHandle());
                        }
                    } else if (key === 'url') {
                        for (var media in value) {
                            var urls = value[media];
                            for (var j = 0; j < urls.length; j++) {
                                addLink(urls[j], media, marker);
                            }
                        }
                    }
                }
            }
            if (module === 'user') {
                var siteDeps;
                var siteDepErr;
                try {
                    siteDeps = resolve(['site']);
                } catch (e) {
                    siteDepErr = e;
                    runScript();
                }
                if (!siteDepErr) {
                    enqueue(siteDeps, runScript, runScript);
                }
            } else if (cssPending === 0) {
                runScript();
            }
        }
        function sortQuery(o) {
            var sorted = {};
            var list = [];
            for (var key in o) {
                list.push(key);
            }
            list.sort();
            for (var i = 0; i < list.length; i++) {
                sorted[list[i]] = o[list[i]];
            }
            return sorted;
        }
        function buildModulesString(moduleMap) {
            var str = [];
            var list = [];
            var p;
            function restore(suffix) {
                return p + suffix;
            }
            for (var prefix in moduleMap) {
                p = prefix === '' ? '' : prefix + '.';
                str.push(p + moduleMap[prefix].join(','));
                list.push.apply(list, moduleMap[prefix].map(restore));
            }
            return {
                str: str.join('|'),
                list: list
            };
        }
        function makeQueryString(params) {
            var str = '';
            for (var key in params) {
                str += (str ? '&' : '') + encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
            }
            return str;
        }
        function batchRequest(batch) {
            if (!batch.length) {
                return;
            }
            var sourceLoadScript, currReqBase, moduleMap;
            function doRequest() {
                var query = Object.create(currReqBase)
                  , packed = buildModulesString(moduleMap);
                query.modules = packed.str;
                query.version = getCombinedVersion(packed.list);
                query = sortQuery(query);
                addScript(sourceLoadScript + '?' + makeQueryString(query));
            }
            batch.sort();
            var reqBase = {
                "lang": "zh-cn",
                "skin": "liberty"
            };
            var splits = Object.create(null);
            for (var b = 0; b < batch.length; b++) {
                var bSource = registry[batch[b]].source;
                var bGroup = registry[batch[b]].group;
                if (!splits[bSource]) {
                    splits[bSource] = Object.create(null);
                }
                if (!splits[bSource][bGroup]) {
                    splits[bSource][bGroup] = [];
                }
                splits[bSource][bGroup].push(batch[b]);
            }
            for (var source in splits) {
                sourceLoadScript = sources[source];
                for (var group in splits[source]) {
                    var modules = splits[source][group];
                    currReqBase = Object.create(reqBase);
                    if (group === 0 && mw.config.get('wgUserName') !== null) {
                        currReqBase.user = mw.config.get('wgUserName');
                    }
                    var currReqBaseLength = makeQueryString(currReqBase).length + 23;
                    var length = 0;
                    moduleMap = Object.create(null);
                    for (var i = 0; i < modules.length; i++) {
                        var lastDotIndex = modules[i].lastIndexOf('.')
                          , prefix = modules[i].slice(0, Math.max(0, lastDotIndex))
                          , suffix = modules[i].slice(lastDotIndex + 1)
                          , bytesAdded = moduleMap[prefix] ? suffix.length + 3 : modules[i].length + 3;
                        if (length && length + currReqBaseLength + bytesAdded > mw.loader.maxQueryLength) {
                            doRequest();
                            length = 0;
                            moduleMap = Object.create(null);
                        }
                        if (!moduleMap[prefix]) {
                            moduleMap[prefix] = [];
                        }
                        length += bytesAdded;
                        moduleMap[prefix].push(suffix);
                    }
                    doRequest();
                }
            }
        }
        function asyncEval(implementations, cb) {
            if (!implementations.length) {
                return;
            }
            mw.requestIdleCallback(function() {
                try {
                    domEval(implementations.join(';'));
                } catch (err) {
                    cb(err);
                }
            });
        }
        function getModuleKey(module) {
            return module in registry ? (module + '@' + registry[module].version) : null;
        }
        function splitModuleKey(key) {
            var index = key.lastIndexOf('@');
            if (index === -1 || index === 0) {
                return {
                    name: key,
                    version: ''
                };
            }
            return {
                name: key.slice(0, index),
                version: key.slice(index + 1)
            };
        }
        function registerOne(module, version, dependencies, group, source, skip) {
            if (module in registry) {
                throw new Error('module already registered: ' + module);
            }
            version = String(version || '');
            if (version.slice(-1) === '!') {
                if (!isES6Supported) {
                    return;
                }
                version = version.slice(0, -1);
            }
            registry[module] = {
                module: {
                    exports: {}
                },
                packageExports: {},
                version: version,
                dependencies: dependencies || [],
                group: typeof group === 'undefined' ? null : group,
                source: typeof source === 'string' ? source : 'local',
                state: 'registered',
                skip: typeof skip === 'string' ? skip : null
            };
        }
        mw.loader = {
            moduleRegistry: registry,
            maxQueryLength: 2000,
            addStyleTag: newStyleTag,
            addScriptTag: addScript,
            addLinkTag: addLink,
            enqueue: enqueue,
            resolve: resolve,
            work: function() {
                store.init();
                var q = queue.length
                  , storedImplementations = []
                  , storedNames = []
                  , requestNames = []
                  , batch = new StringSet();
                while (q--) {
                    var module = queue[q];
                    if (mw.loader.getState(module) === 'registered' && !batch.has(module)) {
                        registry[module].state = 'loading';
                        batch.add(module);
                        var implementation = store.get(module);
                        if (implementation) {
                            storedImplementations.push(implementation);
                            storedNames.push(module);
                        } else {
                            requestNames.push(module);
                        }
                    }
                }
                queue = [];
                asyncEval(storedImplementations, function(err) {
                    store.stats.failed++;
                    store.clear();
                    mw.trackError('resourceloader.exception', {
                        exception: err,
                        source: 'store-eval'
                    });
                    var failed = storedNames.filter(function(name) {
                        return registry[name].state === 'loading';
                    });
                    batchRequest(failed);
                });
                batchRequest(requestNames);
            },
            addSource: function(ids) {
                for (var id in ids) {
                    if (id in sources) {
                        throw new Error('source already registered: ' + id);
                    }
                    sources[id] = ids[id];
                }
            },
            register: function(modules) {
                if (typeof modules !== 'object') {
                    registerOne.apply(null, arguments);
                    return;
                }
                function resolveIndex(dep) {
                    return typeof dep === 'number' ? modules[dep][0] : dep;
                }
                for (var i = 0; i < modules.length; i++) {
                    var deps = modules[i][2];
                    if (deps) {
                        for (var j = 0; j < deps.length; j++) {
                            deps[j] = resolveIndex(deps[j]);
                        }
                    }
                    registerOne.apply(null, modules[i]);
                }
            },
            implement: function(module, script, style, messages, templates) {
                var split = splitModuleKey(module)
                  , name = split.name
                  , version = split.version;
                if (!(name in registry)) {
                    mw.loader.register(name);
                }
                if (registry[name].script !== undefined) {
                    throw new Error('module already implemented: ' + name);
                }
                if (version) {
                    registry[name].version = version;
                }
                registry[name].script = script || null;
                registry[name].style = style || null;
                registry[name].messages = messages || null;
                registry[name].templates = templates || null;
                if (registry[name].state !== 'error' && registry[name].state !== 'missing') {
                    setAndPropagate(name, 'loaded');
                }
            },
            load: function(modules, type) {
                if (typeof modules === 'string' && /^(https?:)?\/?\//.test(modules)) {
                    if (type === 'text/css') {
                        addLink(modules);
                    } else if (type === 'text/javascript' || type === undefined) {
                        addScript(modules);
                    } else {
                        throw new Error('Invalid type ' + type);
                    }
                } else {
                    modules = typeof modules === 'string' ? [modules] : modules;
                    enqueue(resolveStubbornly(modules));
                }
            },
            state: function(states) {
                for (var module in states) {
                    if (!(module in registry)) {
                        mw.loader.register(module);
                    }
                    setAndPropagate(module, states[module]);
                }
            },
            getState: function(module) {
                return module in registry ? registry[module].state : null;
            },
            require: function(moduleName) {
                if (mw.loader.getState(moduleName) !== 'ready') {
                    throw new Error('Module "' + moduleName + '" is not loaded');
                }
                return registry[moduleName].module.exports;
            }
        };
        var hasPendingWrites = false;
        function flushWrites() {
            store.prune();
            while (store.queue.length) {
                store.set(store.queue.shift());
            }
            try {
                localStorage.removeItem(store.key);
                var data = JSON.stringify(store);
                localStorage.setItem(store.key, data);
            } catch (e) {
                mw.trackError('resourceloader.exception', {
                    exception: e,
                    source: 'store-localstorage-update'
                });
            }
            hasPendingWrites = false;
        }
        mw.loader.store = store = {
            enabled: null,
            items: {},
            queue: [],
            stats: {
                hits: 0,
                misses: 0,
                expired: 0,
                failed: 0
            },
            toJSON: function() {
                return {
                    items: store.items,
                    vary: store.vary,
                    asOf: Math.ceil(Date.now() / 1e7)
                };
            },
            key: "MediaWikiModuleStore:wiki",
            vary: "liberty:1:zh-cn",
            init: function() {
                if (this.enabled === null) {
                    this.enabled = false;
                    if (true) {
                        this.load();
                    } else {
                        this.clear();
                    }
                }
            },
            load: function() {
                try {
                    var raw = localStorage.getItem(this.key);
                    this.enabled = true;
                    var data = JSON.parse(raw);
                    if (data && data.vary === this.vary && data.items && Date.now() < (data.asOf * 1e7) + 259e7) {
                        this.items = data.items;
                    }
                } catch (e) {}
            },
            get: function(module) {
                if (this.enabled) {
                    var key = getModuleKey(module);
                    if (key in this.items) {
                        this.stats.hits++;
                        return this.items[key];
                    }
                    this.stats.misses++;
                }
                return false;
            },
            add: function(module) {
                if (this.enabled) {
                    this.queue.push(module);
                    this.requestUpdate();
                }
            },
            set: function(module) {
                var args, encodedScript, descriptor = registry[module], key = getModuleKey(module);
                if (key in this.items || !descriptor || descriptor.state !== 'ready' || !descriptor.version || descriptor.group === 1 || descriptor.group === 0 || [descriptor.script, descriptor.style, descriptor.messages, descriptor.templates].indexOf(undefined) !== -1) {
                    return;
                }
                try {
                    if (typeof descriptor.script === 'function') {
                        encodedScript = String(descriptor.script);
                    } else if (typeof descriptor.script === 'object' && descriptor.script && !Array.isArray(descriptor.script)) {
                        encodedScript = '{' + 'main:' + JSON.stringify(descriptor.script.main) + ',' + 'files:{' + Object.keys(descriptor.script.files).map(function(file) {
                            var value = descriptor.script.files[file];
                            return JSON.stringify(file) + ':' + (typeof value === 'function' ? value : JSON.stringify(value));
                        }).join(',') + '}}';
                    } else {
                        encodedScript = JSON.stringify(descriptor.script);
                    }
                    args = [JSON.stringify(key), encodedScript, JSON.stringify(descriptor.style), JSON.stringify(descriptor.messages), JSON.stringify(descriptor.templates)];
                } catch (e) {
                    mw.trackError('resourceloader.exception', {
                        exception: e,
                        source: 'store-localstorage-json'
                    });
                    return;
                }
                var src = 'mw.loader.implement(' + args.join(',') + ');';
                if (src.length > 1e5) {
                    return;
                }
                this.items[key] = src;
            },
            prune: function() {
                for (var key in this.items) {
                    if (getModuleKey(splitModuleKey(key).name) !== key) {
                        this.stats.expired++;
                        delete this.items[key];
                    }
                }
            },
            clear: function() {
                this.items = {};
                try {
                    localStorage.removeItem(this.key);
                } catch (e) {}
            },
            requestUpdate: function() {
                if (!hasPendingWrites) {
                    hasPendingWrites = true;
                    setTimeout(function() {
                        mw.requestIdleCallback(flushWrites);
                    }, 2000);
                }
            }
        };
    }());
    mw.requestIdleCallbackInternal = function(callback) {
        setTimeout(function() {
            var start = mw.now();
            callback({
                didTimeout: false,
                timeRemaining: function() {
                    return Math.max(0, 50 - (mw.now() - start));
                }
            });
        }, 1);
    }
    ;
    mw.requestIdleCallback = window.requestIdleCallback ? window.requestIdleCallback.bind(window) : mw.requestIdleCallbackInternal;
    (function() {
        var queue;
        mw.loader.addSource({
            "local": "/load.php"
        });
        mw.loader.register([["site", "309li", [1]], ["site.styles", "1n0rp", [], 2], ["filepage", "1ljys"], ["user", "1tdkc", [], 0], ["user.styles", "18fec", [], 0], ["user.options", "12s5i", [], 1], ["mediawiki.skinning.interface", "uqbc7"], ["jquery.makeCollapsible.styles", "lbrzd"], ["mediawiki.skinning.content.parsoid", "1dr11"], ["jquery", "p9z7x"], ["es6-polyfills", "1xwex", [], null, null, "return Array.prototype.find\u0026\u0026Array.prototype.findIndex\u0026\u0026Array.prototype.includes\u0026\u0026typeof Promise==='function'\u0026\u0026Promise.prototype.finally;"], ["web2017-polyfills", "5cxhc", [10], null, null, "return'IntersectionObserver'in window\u0026\u0026typeof fetch==='function'\u0026\u0026typeof URL==='function'\u0026\u0026'toJSON'in URL.prototype;"], ["mediawiki.base", "1n8or", [9]], ["jquery.chosen", "fjvzv"], ["jquery.client", "1jnox"], ["jquery.color", "1y5ur"], ["jquery.confirmable", "1ulka", [109]], ["jquery.cookie", "emj1l"], ["jquery.form", "1djyv"], ["jquery.fullscreen", "1lanf"], ["jquery.highlightText", "a2wnf", [83]], ["jquery.hoverIntent", "1cahm"], ["jquery.i18n", "1pu0k", [108]], ["jquery.lengthLimit", "k5zgm", [67]], ["jquery.makeCollapsible", "iooqc", [7, 83]], ["jquery.spinner", "1rx3f", [26]], ["jquery.spinner.styles", "153wt"], ["jquery.suggestions", "1g6wh", [20]], ["jquery.tablesorter", "vecne", [29, 110, 83]], ["jquery.tablesorter.styles", "rwcx6"], ["jquery.textSelection", "m1do8", [14]], ["jquery.throttle-debounce", "1p2bq"], ["jquery.tipsy", "17xda"], ["jquery.ui", "13rik"], ["moment", "18zw5", [106, 83]], ["vue", "zfi8r!"], ["@vue/composition-api", "scw0q!", [35]], ["vuex", "1twvy!", [35]], ["wvui", "v4ef5!", [36]], ["wvui-search", "1nhzn!", [35]], ["@wikimedia/codex", "r6zyv!", [35]], ["@wikimedia/codex-search", "1p7vn!", [35]], ["mediawiki.template", "bca94"], ["mediawiki.template.mustache", "199kg", [42]], ["mediawiki.apipretty", "19n2s"], ["mediawiki.api", "1pukn", [73, 109]], ["mediawiki.content.json", "f49yo"], ["mediawiki.confirmCloseWindow", "nw94t"], ["mediawiki.debug", "d8is9", [193]], ["mediawiki.diff", "paqy5"], ["mediawiki.diff.styles", "6sx1o"], ["mediawiki.feedback", "1rvza", [459, 201]], ["mediawiki.feedlink", "1yq8n"], ["mediawiki.filewarning", "1brek", [193, 205]], ["mediawiki.ForeignApi", "6vgsr", [55]], ["mediawiki.ForeignApi.core", "llzm2", [80, 45, 189]], ["mediawiki.helplink", "wjdrt"], ["mediawiki.hlist", "m5cp2"], ["mediawiki.htmlform", "h5688", [23, 83]], ["mediawiki.htmlform.ooui", "1m5pb", [193]], ["mediawiki.htmlform.styles", "1mdmd"], ["mediawiki.htmlform.ooui.styles", "t3imb"], ["mediawiki.icon", "17xpk"], ["mediawiki.inspect", "88qa7", [67, 83]], ["mediawiki.notification", "18btm", [83, 89]], ["mediawiki.notification.convertmessagebox", "1kd6x", [64]], ["mediawiki.notification.convertmessagebox.styles", "19vc0"], ["mediawiki.String", "1vc9s"], ["mediawiki.pager.styles", "eo2ge"], ["mediawiki.pager.tablePager", "1fcs6"], ["mediawiki.pulsatingdot", "1i1zo"], ["mediawiki.searchSuggest", "sn27e", [27, 45]], ["mediawiki.storage", "2gicm", [83]], ["mediawiki.Title", "1345o", [67, 83]], ["mediawiki.Upload", "ooev2", [45]], ["mediawiki.ForeignUpload", "1q863", [54, 74]], ["mediawiki.Upload.Dialog", "uqnrh", [77]], ["mediawiki.Upload.BookletLayout", "1aoy0", [74, 81, 34, 196, 201, 206, 207]], ["mediawiki.ForeignStructuredUpload.BookletLayout", "1mjma", [75, 77, 113, 172, 166]], ["mediawiki.toc", "1jhap", [86]], ["mediawiki.Uri", "5izs0", [83]], ["mediawiki.user", "1fogn", [45, 86]], ["mediawiki.userSuggest", "1hhzv", [27, 45]], ["mediawiki.util", "1r713", [14, 11]], ["mediawiki.checkboxtoggle", "159pl"], ["mediawiki.checkboxtoggle.styles", "1b0zv"], ["mediawiki.cookie", "r0ms6", [17]], ["mediawiki.experiments", "dhcyy"], ["mediawiki.editfont.styles", "1rala"], ["mediawiki.visibleTimeout", "xcitq"], ["mediawiki.action.delete", "1e4nn", [23, 193]], ["mediawiki.action.edit", "108tk", [30, 92, 45, 88, 168]], ["mediawiki.action.edit.styles", "ra6er"], ["mediawiki.action.edit.collapsibleFooter", "za3yf", [24, 62, 72]], ["mediawiki.action.edit.preview", "wd09o", [25, 119, 81]], ["mediawiki.action.history", "cpbx3", [24]], ["mediawiki.action.history.styles", "w2lii"], ["mediawiki.action.protect", "1at6k", [23, 193]], ["mediawiki.action.view.metadata", "9zy6t", [104]], ["mediawiki.action.view.categoryPage.styles", "z9xgj"], ["mediawiki.action.view.postEdit", "er8c0", [109, 64, 193, 212]], ["mediawiki.action.view.redirect", "iqcjx"], ["mediawiki.action.view.redirectPage", "x5z6j"], ["mediawiki.action.edit.editWarning", "ihdqq", [30, 47, 109]], ["mediawiki.action.view.filepage", "1tzp3"], ["mediawiki.action.styles", "g8x3w"], ["mediawiki.language", "14av3", [107]], ["mediawiki.cldr", "w8zqb", [108]], ["mediawiki.libs.pluralruleparser", "1kwne"], ["mediawiki.jqueryMsg", "13cx6", [67, 106, 83, 5]], ["mediawiki.language.months", "1n48a", [106]], ["mediawiki.language.names", "159lr", [106]], ["mediawiki.language.specialCharacters", "z04l3", [106]], ["mediawiki.libs.jpegmeta", "1h4oh"], ["mediawiki.page.gallery", "19ugl", [115, 83]], ["mediawiki.page.gallery.styles", "1ctf8"], ["mediawiki.page.gallery.slideshow", "2bb8t", [45, 196, 215, 217]], ["mediawiki.page.ready", "1ygp2", [45]], ["mediawiki.page.watch.ajax", "g885r", [45]], ["mediawiki.page.preview", "1nmqx", [24, 30, 45, 49, 50, 193]], ["mediawiki.page.image.pagination", "kn7b4", [25, 83]], ["mediawiki.rcfilters.filters.base.styles", "k81tw"], ["mediawiki.rcfilters.highlightCircles.seenunseen.styles", "bi6k7"], ["mediawiki.rcfilters.filters.ui", "1p886", [24, 80, 81, 163, 202, 209, 211, 212, 213, 215, 216]], ["mediawiki.interface.helpers.styles", "18het"], ["mediawiki.special", "qjio0"], ["mediawiki.special.apisandbox", "hok1q", [24, 80, 183, 169, 192]], ["mediawiki.special.block", "1n3h1", [58, 166, 182, 173, 183, 180, 209]], ["mediawiki.misc-authed-ooui", "1iw6h", [59, 163, 168]], ["mediawiki.misc-authed-pref", "16eja", [5]], ["mediawiki.misc-authed-curate", "3bwjb", [16, 25, 45]], ["mediawiki.special.changeslist", "10rtz"], ["mediawiki.special.changeslist.watchlistexpiry", "kou45", [125, 212]], ["mediawiki.special.changeslist.enhanced", "1kflq"], ["mediawiki.special.changeslist.legend", "1ao08"], ["mediawiki.special.changeslist.legend.js", "qa88i", [24, 86]], ["mediawiki.special.contributions", "1luqq", [24, 109, 166, 192]], ["mediawiki.special.edittags", "1rwjf", [13, 23]], ["mediawiki.special.import.styles.ooui", "1hzv9"], ["mediawiki.special.changecredentials", "f9fqt"], ["mediawiki.special.changeemail", "10bxu"], ["mediawiki.special.preferences.ooui", "ibuju", [47, 88, 65, 72, 173, 168]], ["mediawiki.special.preferences.styles.ooui", "11pyq"], ["mediawiki.special.revisionDelete", "6sakl", [23]], ["mediawiki.special.search", "11pp3", [185]], ["mediawiki.special.search.commonsInterwikiWidget", "1n6bn", [80, 45]], ["mediawiki.special.search.interwikiwidget.styles", "cxv8q"], ["mediawiki.special.search.styles", "1t5th"], ["mediawiki.special.unwatchedPages", "1ut25", [45]], ["mediawiki.special.upload", "1txti", [25, 45, 47, 113, 125, 42]], ["mediawiki.special.userlogin.common.styles", "7spfn"], ["mediawiki.special.userlogin.login.styles", "1w9oo"], ["mediawiki.special.createaccount", "1nfx4", [45]], ["mediawiki.special.userlogin.signup.styles", "10luo"], ["mediawiki.special.userrights", "4k0n6", [23, 65]], ["mediawiki.special.watchlist", "1y60t", [45, 193, 212]], ["mediawiki.ui", "1qw5m"], ["mediawiki.ui.checkbox", "3rebp"], ["mediawiki.ui.radio", "lhqjo"], ["mediawiki.ui.anchor", "1yxgk"], ["mediawiki.ui.button", "19cke"], ["mediawiki.ui.input", "1lzvw"], ["mediawiki.ui.icon", "10ybi"], ["mediawiki.widgets", "xc1ll", [45, 164, 196, 206, 207]], ["mediawiki.widgets.styles", "1x5du"], ["mediawiki.widgets.AbandonEditDialog", "5nby0", [201]], ["mediawiki.widgets.DateInputWidget", "jl2rt", [167, 34, 196, 217]], ["mediawiki.widgets.DateInputWidget.styles", "15tly"], ["mediawiki.widgets.visibleLengthLimit", "m325n", [23, 193]], ["mediawiki.widgets.datetime", "z6fq3", [83, 193, 212, 216, 217]], ["mediawiki.widgets.expiry", "m5uji", [169, 34, 196]], ["mediawiki.widgets.CheckMatrixWidget", "k9si1", [193]], ["mediawiki.widgets.CategoryMultiselectWidget", "19za5", [54, 196]], ["mediawiki.widgets.SelectWithInputWidget", "yzuek", [174, 196]], ["mediawiki.widgets.SelectWithInputWidget.styles", "vkr7h"], ["mediawiki.widgets.SizeFilterWidget", "16sfa", [176, 196]], ["mediawiki.widgets.SizeFilterWidget.styles", "ceybj"], ["mediawiki.widgets.MediaSearch", "1elmq", [54, 81, 196]], ["mediawiki.widgets.Table", "1r7bz", [196]], ["mediawiki.widgets.TagMultiselectWidget", "1erse", [196]], ["mediawiki.widgets.UserInputWidget", "jsk5k", [45, 196]], ["mediawiki.widgets.UsersMultiselectWidget", "1m6vb", [45, 196]], ["mediawiki.widgets.NamespacesMultiselectWidget", "pwj2l", [196]], ["mediawiki.widgets.TitlesMultiselectWidget", "gt95w", [163]], ["mediawiki.widgets.TagMultiselectWidget.styles", "1rjw4"], ["mediawiki.widgets.SearchInputWidget", "z70j2", [71, 163, 212]], ["mediawiki.widgets.SearchInputWidget.styles", "9327p"], ["mediawiki.watchstar.widgets", "msqh9", [192]], ["mediawiki.deflate", "1ci7b"], ["oojs", "ewqeo"], ["mediawiki.router", "1ugrh", [191]], ["oojs-router", "m96yy", [189]], ["oojs-ui", "1jh3r", [199, 196, 201]], ["oojs-ui-core", "1wvzg", [106, 189, 195, 194, 203]], ["oojs-ui-core.styles", "19gxh"], ["oojs-ui-core.icons", "1pj4h"], ["oojs-ui-widgets", "1otst", [193, 198]], ["oojs-ui-widgets.styles", "12mn2"], ["oojs-ui-widgets.icons", "su7l3"], ["oojs-ui-toolbars", "1dyi8", [193, 200]], ["oojs-ui-toolbars.icons", "6vwwi"], ["oojs-ui-windows", "1361l", [193, 202]], ["oojs-ui-windows.icons", "t9gmg"], ["oojs-ui.styles.indicators", "x2ldw"], ["oojs-ui.styles.icons-accessibility", "1cg8a"], ["oojs-ui.styles.icons-alerts", "1o4ng"], ["oojs-ui.styles.icons-content", "oclgc"], ["oojs-ui.styles.icons-editing-advanced", "myvhj"], ["oojs-ui.styles.icons-editing-citation", "1wbua"], ["oojs-ui.styles.icons-editing-core", "xv18s"], ["oojs-ui.styles.icons-editing-list", "1oeor"], ["oojs-ui.styles.icons-editing-styling", "1nvim"], ["oojs-ui.styles.icons-interactions", "141pq"], ["oojs-ui.styles.icons-layout", "1fh5f"], ["oojs-ui.styles.icons-location", "san61"], ["oojs-ui.styles.icons-media", "331rn"], ["oojs-ui.styles.icons-moderation", "1pj9y"], ["oojs-ui.styles.icons-movement", "cah4o"], ["oojs-ui.styles.icons-user", "izhki"], ["oojs-ui.styles.icons-wikimedia", "jvtzv"], ["skins.liberty.styles", "1f09t"], ["skins.liberty.ads", "1dztv"], ["skins.liberty.bootstrap", "1jx83"], ["skins.liberty.layoutjs", "a0nm1", [86]], ["skins.liberty.liverc", "2xg3z", [83]], ["skins.liberty.loginjs", "10s7q", [83]], ["ext.cite.styles", "1o8is"], ["ext.cite.style", "6t36z"], ["ext.cite.visualEditor.core", "186v1", [422]], ["ext.cite.visualEditor", "iyr3w", [227, 226, 228, 205, 208, 212]], ["ext.cite.ux-enhancements", "1obcb"], ["ext.inputBox.styles", "1pddj"], ["ext.nuke.confirm", "n6ars", [109]], ["ext.wikiEditor", "1fkcy", [30, 33, 112, 81, 163, 208, 209, 210, 211, 215, 42], 3], ["ext.wikiEditor.styles", "rlj9c", [], 3], ["ext.wikiEditor.images", "19ehr"], ["ext.wikiEditor.realtimepreview", "i2rdg", [233, 235, 119, 70, 72, 212]], ["ext.categoryTree", "t7nxo", [45]], ["ext.categoryTree.styles", "1d80w"], ["ext.interwiki.specialpage", "lsm82"], ["mmv", "12p8x", [15, 19, 32, 80, 245]], ["mmv.ui.ondemandshareddependencies", "16hs2", [240, 192]], ["mmv.ui.download.pane", "ekqoz", [156, 163, 241]], ["mmv.ui.reuse.shareembed", "1wp1i", [163, 241]], ["mmv.ui.tipsyDialog", "1vews", [240]], ["mmv.bootstrap", "1pwlg", [160, 162, 247, 191]], ["mmv.bootstrap.autostart", "dgnjl", [245]], ["mmv.head", "1vrgu", [72, 81]], ["ext.templateData", "1xaeh"], ["ext.templateDataGenerator.editPage", "1e7eh"], ["ext.templateDataGenerator.data", "2zdar", [189]], ["ext.templateDataGenerator.editTemplatePage.loading", "60i01"], ["ext.templateDataGenerator.editTemplatePage", "1bxqf", [248, 253, 250, 30, 440, 45, 196, 201, 212, 213, 216]], ["ext.templateData.images", "1bq6c"], ["ext.cargo.main", "4b2yo"], ["ext.cargo.pagevalues", "1h3zu", [254, 196]], ["ext.cargo.cargotables", "tmlld"], ["ext.cargo.purge", "tro5c"], ["ext.cargo.recreatedata", "1ith1", [109, 193]], ["ext.cargo.maps", "bh26u"], ["ext.cargo.calendar", "1dgu5", [109, 166]], ["ext.cargo.gantt", "n3b3z", [196]], ["ext.cargo.zip", "163u2"], ["ext.cargo.bpmn", "1fji2", [264]], ["bpmn-auto-layout", "11uff"], ["ext.cargo.timelinebase", "1fo03"], ["ext.cargo.timeline", "1enhd", [265]], ["ext.cargo.datatables", "wg07g", [196]], ["ext.cargo.cargoquery", "y10zf", [254, 33, 59, 83]], ["ext.cargo.nvd3", "qqccr"], ["ext.cargo.exhibit", "qxjum"], ["ext.cargo.slick", "1obn2"], ["ext.cargo.diagram", "10gq0"], ["ext.cargo.drilldown", "7qfwv", [254, 196]], ["ext.codeEditor", "1ma6m", [275], 3], ["jquery.codeEditor", "181pa", [277, 276, 233, 201], 3], ["ext.codeEditor.icons", "k6r3f"], ["ext.codeEditor.ace", "1qm3g", [], 4], ["ext.codeEditor.ace.modes", "nnxj1", [277], 4], ["ext.HighlightjsIntegration", "5zy4e"], ["ext.relatedArticles.cards", "opv6b", [281, 83, 189]], ["ext.relatedArticles.lib", "1tura"], ["ext.relatedArticles.readMore.gateway", "1u06n", [189]], ["ext.relatedArticles.readMore.bootstrap", "1874i", [282, 80, 87, 81, "mediawiki.viewport"]], ["ext.relatedArticles.readMore", "7s2ie", [83]], ["ext.SimpleMathJax", "1qtkc"], ["ext.tabberNeue", "12koy", [80]], ["ext.tabberNeue.visualEditor", "1jbd6", [414]], ["ext.tabberNeue.icons", "12bfe"], ["ext.wikiLove.icon", "evna5"], ["ext.wikiLove.startup", "kxlli", [33, 45, 160]], ["ext.wikiLove.local", "18hrn"], ["ext.wikiLove.init", "150nu", [290]], ["ext.pageforms.main", "1ph64", [300, 310, 312, 327, 317, 299, 325, 91]], ["ext.pageforms.main.styles", "shv1u"], ["ext.pageforms.browser", "1p6a9"], ["ext.pageforms.fancybox", "q2z7g", [295]], ["ext.pageforms.fancybox.styles", "1bgq7"], ["ext.pageforms.jstree", "ou4r0", [326]], ["ext.pageforms.sortable", "dyin2"], ["ext.pageforms.autogrow", "1e986"], ["ext.pageforms.popupformedit", "525d0", [295]], ["ext.pageforms.autoedit", "ov4jw", [201]], ["ext.pageforms.autoeditrating", "gexjl", [201]], ["ext.pageforms.submit", "1q4f0"], ["ext.pageforms.submit.styles", "1eogi"], ["ext.pageforms.collapsible", "11glk"], ["ext.pageforms.imagepreview", "vpdoq"], ["ext.pageforms.checkboxes", "128ys"], ["ext.pageforms.checkboxes.styles", "pfen3"], ["ext.pageforms.datepicker", "1e63d", [166]], ["ext.pageforms.timepicker", "gx36h"], ["ext.pageforms.datetimepicker", "zxydq", [169]], ["ext.pageforms.regexp", "1ojfv"], ["ext.pageforms.rating", "17238"], ["ext.pageforms.rating.styles", "mhs8a"], ["ext.pageforms.simpleupload", "iqvl8"], ["ext.pageforms.select2", "1glfl", [326, 109]], ["ext.pageforms.select2.styles", "twany"], ["ext.pageforms.ooui.autocomplete", "1wh5d", [196]], ["ext.pageforms.ooui.combobox", "1bkmq", [196]], ["ext.pageforms.forminput", "1r09a", [326, 319]], ["ext.pageforms.forminput.styles", "15eiu"], ["ext.pageforms.fullcalendar", "122x4", [298, 317, 34]], ["ext.pageforms.spreadsheet", "1sl0a", [317, 110, 196, 201, 216, 217]], ["ext.pageforms.wikieditor", "p8gcc"], ["ext.pageforms", "yxviw"], ["ext.pageforms.editwarning", "7vrr4", [30, 47]], ["ext.pageforms.PF_CreateProperty", "urc3f"], ["ext.pageforms.PF_PageSchemas", "1mhz1"], ["ext.pageforms.PF_CreateTemplate", "c5i34", [320]], ["ext.pageforms.PF_CreateClass", "tp7jo", [196]], ["ext.pageforms.PF_CreateForm", "1dur3", [196]], ["ext.pageforms.templatedisplay", "1s6hk"], ["ext.thanks.images", "1tdzz"], ["ext.thanks", "26n5n", [45, 86]], ["ext.thanks.corethank", "1dakb", [335, 16, 201]], ["ext.thanks.mobilediff", "1wh93", [334, 45, "mobile.startup"]], ["ext.thanks.flowthank", "7usjz", [335, 201]], ["ext.CodeMirror", "qa56y", [340, 30, 33, 81, 211]], ["ext.CodeMirror.data", "13now"], ["ext.CodeMirror.lib", "4t9ku"], ["ext.CodeMirror.addons", "1s5sd", [341]], ["ext.CodeMirror.mode.mediawiki", "11jkn", [341]], ["ext.CodeMirror.lib.mode.css", "ri6yn", [341]], ["ext.CodeMirror.lib.mode.javascript", "tkjyf", [341]], ["ext.CodeMirror.lib.mode.xml", "lulkh", [341]], ["ext.CodeMirror.lib.mode.htmlmixed", "55n3v", [344, 345, 346]], ["ext.CodeMirror.lib.mode.clike", "x6dn7", [341]], ["ext.CodeMirror.lib.mode.php", "d3qbf", [348, 347]], ["ext.CodeMirror.visualEditor.init", "8ffuw"], ["ext.CodeMirror.visualEditor", "1izb0", [414]], ["ext.confirmEdit.editPreview.ipwhitelist.styles", "11y4q"], ["ext.confirmEdit.visualEditor", "rlq1b", [458]], ["ext.confirmEdit.simpleCaptcha", "14a9d"], ["ext.confirmEdit.GeetestCaptcha.visualEditor", "gj8l1"], ["ext.confirmEdit.GeetestCaptcha", "nhamv"], ["ext.confirmEdit.GeetestCaptcha.styles", "s9xuf"], ["ext.confirmEdit.GeetestCaptcha.init", "z6xwe"], ["ext.echo.logger", "1eha4", [81, 189]], ["ext.echo.ui.desktop", "15tiu", [366, 361]], ["ext.echo.ui", "5qief", [362, 359, 443, 196, 205, 206, 212, 216, 217, 218]], ["ext.echo.dm", "esec1", [365, 34]], ["ext.echo.api", "14pf5", [54]], ["ext.echo.mobile", "1i2kw", [361, 190, 43]], ["ext.echo.init", "fxtnp", [363]], ["ext.echo.styles.badge", "1ha8p"], ["ext.echo.styles.notifications", "6q585"], ["ext.echo.styles.alert", "1d58e"], ["ext.echo.special", "1h0a7", [370, 361]], ["ext.echo.styles.special", "1uy63"], ["ext.ReplaceText", "1ola7"], ["ext.ReplaceTextStyles", "1doqs"], ["ext.checkUser", "lls25", [83]], ["ext.checkUser.investigate.styles", "1qysa"], ["ext.checkUser.investigate", "msn9s", [28, 80, 72, 163, 209, 212, 216]], ["ext.checkUser.investigateblock.styles", "g99ew"], ["ext.checkUser.investigateblock", "tleru", [196]], ["ext.avatar.upload", "3sje0", [81]], ["socket.io", "1g15q"], ["dompurify", "jdu0z"], ["color-picker", "jq79v"], ["unicodejs", "1r04c"], ["papaparse", "oiasq"], ["rangefix", "1ext9"], ["spark-md5", "9kzx3"], ["ext.visualEditor.supportCheck", "13rwp", [], 5], ["ext.visualEditor.sanitize", "1m52e", [380, 403], 5], ["ext.visualEditor.progressBarWidget", "1rnzo", [], 5], ["ext.visualEditor.tempWikitextEditorWidget", "k7mf7", [88, 81], 5], ["ext.visualEditor.desktopArticleTarget.init", "fi483", [388, 386, 389, 400, 30, 80, 117, 72], 5], ["ext.visualEditor.desktopArticleTarget.noscript", "1nhq2"], ["ext.visualEditor.targetLoader", "1b4bn", [402, 400, 30, 80, 72, 81], 5], ["ext.visualEditor.desktopTarget", "ykcje", [], 5], ["ext.visualEditor.desktopArticleTarget", "1ojmk", [406, 411, 393, 416], 5], ["ext.visualEditor.collabTarget", "1kg9e", [404, 410, 88, 163, 212, 213], 5], ["ext.visualEditor.collabTarget.desktop", "1amvo", [395, 411, 393, 416], 5], ["ext.visualEditor.collabTarget.init", "1cxqz", [386, 163, 192], 5], ["ext.visualEditor.collabTarget.init.styles", "8xxz4"], ["ext.visualEditor.ve", "1l3o4", [], 5], ["ext.visualEditor.track", "1ma8w", [399], 5], ["ext.visualEditor.core.utils", "pwn7s", [400, 192], 5], ["ext.visualEditor.core.utils.parsing", "yk6md", [399], 5], ["ext.visualEditor.base", "zc0r3", [401, 402, 382], 5], ["ext.visualEditor.mediawiki", "khm53", [403, 392, 28, 440], 5], ["ext.visualEditor.mwsave", "1vhi9", [414, 23, 25, 49, 50, 212], 5], ["ext.visualEditor.articleTarget", "k2kii", [415, 405, 165], 5], ["ext.visualEditor.data", "1b70t", [404]], ["ext.visualEditor.core", "hl1ge", [387, 386, 14, 383, 384, 385], 5], ["ext.visualEditor.commentAnnotation", "1i7j2", [408], 5], ["ext.visualEditor.rebase", "1c4q7", [381, 425, 409, 218, 379], 5], ["ext.visualEditor.core.desktop", "1ncrc", [408], 5], ["ext.visualEditor.welcome", "qpzo4", [192], 5], ["ext.visualEditor.switching", "fk33z", [45, 192, 204, 207, 209], 5], ["ext.visualEditor.mwcore", "1sfrb", [426, 404, 413, 412, 124, 70, 8, 163], 5], ["ext.visualEditor.mwextensions", "1jh3r", [407, 437, 430, 432, 417, 434, 419, 431, 420, 422], 5], ["ext.visualEditor.mwextensions.desktop", "1jh3r", [415, 421, 78], 5], ["ext.visualEditor.mwformatting", "1bumv", [414], 5], ["ext.visualEditor.mwimage.core", "13isj", [414], 5], ["ext.visualEditor.mwimage", "1wu62", [418, 177, 34, 215, 219], 5], ["ext.visualEditor.mwlink", "6q83v", [414], 5], ["ext.visualEditor.mwmeta", "1hw33", [420, 102], 5], ["ext.visualEditor.mwtransclusion", "q85hh", [414, 180], 5], ["treeDiffer", "1i331"], ["diffMatchPatch", "1rln1"], ["ext.visualEditor.checkList", "18tub", [408], 5], ["ext.visualEditor.diffing", "17kj9", [424, 408, 423], 5], ["ext.visualEditor.diffPage.init.styles", "1u8sf"], ["ext.visualEditor.diffLoader", "1rup1", [392], 5], ["ext.visualEditor.diffPage.init", "1t86q", [428, 192, 204, 207], 5], ["ext.visualEditor.language", "18kub", [408, 440, 111], 5], ["ext.visualEditor.mwlanguage", "1mt2k", [408], 5], ["ext.visualEditor.mwalienextension", "erzjn", [414], 5], ["ext.visualEditor.mwwikitext", "2r33a", [420, 88], 5], ["ext.visualEditor.mwgallery", "1nzqu", [414, 115, 177, 215], 5], ["ext.visualEditor.mwsignature", "1xouq", [422], 5], ["ext.visualEditor.experimental", "1jh3r", [], 5], ["ext.visualEditor.icons", "1jh3r", [438, 439, 205, 206, 207, 209, 210, 211, 212, 213, 216, 217, 218, 203], 5], ["ext.visualEditor.moduleIcons", "ddxso"], ["ext.visualEditor.moduleIndicators", "13efv"], ["jquery.uls.data", "149oa"], ["ext.pageforms.maps", "13fy8", [214]], ["ext.echo.emailicons", "g0y7o"], ["ext.echo.secondaryicons", "1xtwk"], ["ext.gadget.UserLinkAvatar", "kw0x4", [], 2], ["ext.gadget.large-font", "ivpd3", [], 2], ["ext.gadget.noMoreRoundy", "ypmai", [], 2], ["ext.gadget.noMoreSidebar", "1xveg", [], 2], ["ext.gadget.leftFixSidebar", "pqpvr", [], 2], ["ext.gadget.notifyConversion", "1765e", [451], 2], ["ext.gadget.notifyAdsense", "12bao", [451], 2], ["ext.gadget.ding", "693yv", [], 2], ["ext.gadget.StickyTableHeaders", "8rwa6", [], 2], ["ext.gadget.Edittools-vector", "cz4hp", [], 2], ["ext.gadget.Edittools-vote", "15kk5", [453], 2], ["ext.gadget.HotCat", "1ylkk", [], 2], ["ext.gadget.Cat-a-lot", "bzml4", [83], 2], ["ext.gadget.Twinkle", "1i63g", [81, "mediawiki.RegExp", "jquery.ui.dialog", 32], 2], ["ext.confirmEdit.CaptchaInputWidget", "1tdg3", [193]], ["mediawiki.messagePoster", "13b1w", [54]]]);
        mw.config.set(window.RLCONF || {});
        mw.loader.state(window.RLSTATE || {});
        mw.loader.load(window.RLPAGEMODULES || []);
        queue = window.RLQ || [];
        RLQ = [];
        RLQ.push = function(fn) {
            if (typeof fn === 'function') {
                fn();
            } else {
                RLQ[RLQ.length] = fn;
            }
        }
        ;
        while (queue[0]) {
            RLQ.push(queue.shift());
        }
        NORLQ = {
            push: function() {}
        };
    }());
}
