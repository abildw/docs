// Copyright 2014, Renasar Technologies Inc.
/* jshint node: true */

"use strict";

var di = require('di');

module.exports = Runner;

di.annotate(Runner, new di.Provide('Http'));
di.annotate(Runner, new di.Inject(
        'Http.Server',
        'Services.Core',
        'Services.Configuration',
        'stomp',
        'express-app',
        'common-api-router',
        'common-stomp-resources',
        'gridfs',
        'Q'
    )
);
function Runner(http, core, configuration, stomp, app, router, resources, gridfs, Q) {
    function start() {
        return core.start()
            .then(function() {
                app.use('/api/common', router);

                resources.register(stomp);

                http.listen(configuration.get('httpport'));

                return gridfs.start();
            });
    }

    function stop() {
        return Q.resolve()
            .then(function() {
                return http.close();
            })
            .then(function() {
                return core.stop();
            });
    }

    return {
        start: start,
        stop: stop
    };
}
