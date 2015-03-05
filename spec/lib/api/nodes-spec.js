// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint node:true */

'use strict';

describe('Http.Api.Nodes', function () {
    var waterline;
    var obmService;
    var taskGraphProtocol;

    before('start HTTP server', function () {
        this.timeout(5000);
        return helper.startServer([
        ]).then(function () {
            waterline = helper.injector.get('Services.Waterline');
            sinon.stub(waterline.nodes);
            sinon.stub(waterline.catalogs);
            sinon.stub(waterline.workitems);
            sinon.stub(waterline.graphobjects);
            obmService = helper.injector.get('Task.Services.OBM');
            sinon.stub(obmService);
            taskGraphProtocol = helper.injector.get('Protocol.TaskGraphRunner');
            sinon.stub(taskGraphProtocol);
        });

    });

    beforeEach('reset stubs', function () {
        function resetStubs(obj) {
            _(obj).methods().forEach(function (method) {
                obj[method].reset();
            });
        }
        resetStubs(waterline.nodes);
        resetStubs(waterline.catalogs);
        resetStubs(waterline.workitems);
        resetStubs(waterline.graphobjects);
        resetStubs(obmService);
        resetStubs(taskGraphProtocol);
    });

    after('stop HTTP server', function () {
        return helper.stopServer();
    });

    var node = {
        id: '1234abcd1234abcd1234abcd',
        obmSettings: [
            {
                service: 'ipmi-obm-service',
                config: {
                    host: '1.2.3.4',
                    user: 'myuser',
                    password: 'mypass'
                }
            }
        ]
    };

    describe('GET /nodes', function () {
        it('should return a list of nodes', function () {
            waterline.nodes.find.resolves([node]);

            return helper.request().get('/api/1.1/nodes')
                .expect('Content-Type', /^application\/json/)
                .expect(200, [node]);
        });
    });

    describe('POST /nodes', function () {
        it('should create a node', function () {
            waterline.nodes.create.resolves(node);

            return helper.request().post('/api/1.1/nodes')
                .send(node)
                .expect('Content-Type', /^application\/json/)
                .expect(201, node)
                .expect(function () {
                    expect(waterline.nodes.create).to.have.been.calledOnce;
                    expect(waterline.nodes.create.firstCall.args[0]).to.deep.equal(node);
                });
        });
    });

    describe('GET /nodes/:id', function () {
        it('should return a single node', function () {
            waterline.nodes.findByIdentifier.resolves(node);

            return helper.request().get('/api/1.1/nodes/1234')
                .expect('Content-Type', /^application\/json/)
                .expect(200, node)
                .expect(function () {
                    expect(waterline.nodes.findByIdentifier).to.have.been.calledWith('1234');
                });
        });

        it('should return a 404 if the node was not found', function () {
            waterline.nodes.findByIdentifier.resolves(undefined);

            return helper.request().get('/api/1.1/nodes/1234')
                .expect('Content-Type', /^application\/json/)
                .expect(404);
        });
    });

    describe('PATCH /nodes/:identifier', function () {
        it('should update a node', function () {
            waterline.nodes.updateByIdentifier.resolves(node);

            return helper.request().patch('/api/1.1/nodes/1234')
                .send(node)
                .expect('Content-Type', /^application\/json/)
                .expect(200, node)
                .expect(function () {
                    expect(waterline.nodes.updateByIdentifier).to.have.been.calledOnce;
                    expect(waterline.nodes.updateByIdentifier).to.have.been.calledWith('1234');
                    expect(waterline.nodes.updateByIdentifier.firstCall.args[1])
                    .to.deep.equal(node);
                });
        });

        it('should return a 404 if the node was not found', function () {
            waterline.nodes.updateByIdentifier.resolves(undefined);

            return helper.request().patch('/api/1.1/nodes/1234')
                .send(node)
                .expect('Content-Type', /^application\/json/)
                .expect(404);
        });
    });


    describe('DELETE /nodes/:identifier', function () {
        it('should delete a node', function () {
            waterline.nodes.destroyByIdentifier.resolves(node);
            waterline.workitems.destroy.resolves();

            return helper.request().delete('/api/1.1/nodes/1234')
                .expect('Content-Type', /^application\/json/)
                .expect(200, node)
                .expect(function () {
                    expect(waterline.nodes.destroyByIdentifier).to.have.been.calledOnce;
                    expect(waterline.nodes.destroyByIdentifier).to.have.been.calledWith('1234');
                    expect(waterline.workitems.destroy).to.have.been.calledOnce;
                    expect(waterline.workitems.destroy.firstCall.args[0])
                        .to.have.property('node').that.equals(node.id);
                });
        });

        it('should return a 404 if the node was not found', function () {
            waterline.nodes.destroyByIdentifier.resolves(undefined);

            return helper.request().delete('/api/1.1/nodes/1234')
                .expect('Content-Type', /^application\/json/)
                .expect(404);
        });
    });

    describe('GET /nodes/:identifier/obm', function () {
        it('should return a list of the node\'s OBM settings', function () {
            waterline.nodes.findByIdentifier.resolves(node);

            return helper.request().get('/api/1.1/nodes/1234/obm')
                .expect('Content-Type', /^application\/json/)
                .expect(200, node.obmSettings);
        });

        it('should return a 404 if the node was not found', function () {
            waterline.nodes.findByIdentifier.resolves(undefined);

            return helper.request().get('/api/1.1/nodes/1234/obm')
                .expect('Content-Type', /^application\/json/)
                .expect(404);
        });

        it('should return a 404 if the node has no OBM settings', function () {
            waterline.nodes.findByIdentifier.resolves({ id: node.id });

            return helper.request().get('/api/1.1/nodes/1234/obm')
                .expect('Content-Type', /^application\/json/)
                .expect(404);
        });
    });

    describe('POST /nodes/:identifier/obm', function () {
        var obmSetting = {
            service: 'noop-obm-service',
            config: {}
        };

        it('should add a new set of OBM settings to an existing array', function () {
            var updated = _.cloneDeep(node);
            updated.obmSettings.push(obmSetting);
            waterline.nodes.findByIdentifier.resolves(node);
            waterline.nodes.updateByIdentifier.resolves(updated);
            return helper.request().post('/api/1.1/nodes/1234/obm')
                .send(obmSetting)
                .expect('Content-Type', /^application\/json/)
                .expect(201, updated)
                .expect(function () {
                    expect(waterline.nodes.updateByIdentifier).to.have.been.calledOnce;
                    expect(waterline.nodes.updateByIdentifier).to.have.been.calledWith('1234');
                    expect(waterline.nodes.updateByIdentifier.firstCall.args[1])
                        .to.have.property('obmSettings').that.deep.equals(updated.obmSettings);
                });
        });

        it('should add a new set of OBM settings if none exist', function () {
            waterline.nodes.findByIdentifier.resolves({ id: node.id });
            var updated = { id: node.id, obmSettings: [ obmSetting] };
            waterline.nodes.updateByIdentifier.resolves(updated);
            return helper.request().post('/api/1.1/nodes/1234/obm')
                .send(obmSetting)
                .expect('Content-Type', /^application\/json/)
                .expect(201, updated)
                .expect(function () {
                    expect(waterline.nodes.updateByIdentifier).to.have.been.calledOnce;
                    expect(waterline.nodes.updateByIdentifier).to.have.been.calledWith('1234');
                    expect(waterline.nodes.updateByIdentifier.firstCall.args[1])
                        .to.have.property('obmSettings').that.deep.equals(updated.obmSettings);
                });
        });

        it('should return a 404 if the node was not found', function () {
            waterline.nodes.findByIdentifier.resolves(undefined);

            return helper.request().post('/api/1.1/nodes/1234/obm')
                .send(obmSetting)
                .expect('Content-Type', /^application\/json/)
                .expect(404);
        });
    });

    describe('POST /nodes/:identifier/obm/identify', function () {
        it('should enable OBM identify on a node', function () {
            waterline.nodes.findByIdentifier.resolves(node);
            obmService.identifyOn.resolves({});

            return helper.request().post('/api/1.1/nodes/1234/obm/identify')
                .send({ value: true })
                .expect('Content-Type', /^application\/json/)
                .expect(200)
                .expect(function () {
                    expect(obmService.identifyOn).to.have.been.calledOnce;
                    expect(obmService.identifyOn).to.have.been.calledWith(node.id);
                });
        });

        it('should disable OBM identify on a node', function () {
            waterline.nodes.findByIdentifier.resolves(node);
            obmService.identifyOff.resolves({});

            return helper.request().post('/api/1.1/nodes/1234/obm/identify')
                .send({ value: false })
                .expect('Content-Type', /^application\/json/)
                .expect(200)
                .expect(function () {
                    expect(obmService.identifyOff).to.have.been.calledOnce;
                    expect(obmService.identifyOff).to.have.been.calledWith(node.id);
                });
        });

        it('should return a 404 if the node was not found', function () {
            waterline.nodes.findByIdentifier.resolves(undefined);

            return helper.request().post('/api/1.1/nodes/1234/obm/identify')
                .send({ value: true })
                .expect('Content-Type', /^application\/json/)
                .expect(404);
        });
    });

    describe('GET /nodes/:identifier/catalogs', function() {
        it('should get a list of catalogs', function () {
            var node = {
                id: '123',
                catalogs: [
                    {
                        node: '123',
                        source: 'dummysource',
                        data: {
                            foo: 'bar'
                        }
                    }
                ]
            };
            var populate = sinon.stub().resolves(node);
            waterline.nodes.findByIdentifier.returns({
                populate: populate
            });

            return helper.request().get('/api/1.1/nodes/123/catalogs')
                .expect('Content-Type', /^application\/json/)
                .expect(200, node.catalogs)
                .expect(function () {
                    expect(populate).to.have.been.calledOnce;
                    expect(populate).to.have.been.calledWith('catalogs');
                });
        });

        it('should return a 404 if the node was not found', function () {
            var populate = sinon.stub().resolves(undefined);
            waterline.nodes.findByIdentifier.returns({
                populate: populate
            });

            return helper.request().get('/api/1.1/nodes/123/catalogs')
                .expect('Content-Type', /^application\/json/)
                .expect(404);
        });
    });

    describe('GET /nodes/:identifier/catalogs/:source', function() {
        it('should return a single catalog', function () {

            waterline.nodes.findByIdentifier.resolves({
                id: '123',
                name: '123'
            });
            waterline.catalogs.findLatestCatalogOfSource.resolves(
                {
                    node: '123',
                    source: 'dummysource',
                    data: {
                        foo: 'bar'
                    }
                }
            );

            return helper.request().get('/api/1.1/nodes/123/catalogs/dummysource')
                .expect('Content-Type', /^application\/json/)
                .expect(200)
                .expect(function (res) {
                    expect(res.body).to.be.an("Object").with.property('source', 'dummysource');
                    expect(res.body).to.be.an("Object").with.property('node', '123');
                });
        });

        it('should return a 404 if an empty list is returned', function () {

            waterline.nodes.findByIdentifier.resolves({
                id: '123',
                name: '123'
            });
            waterline.catalogs.findLatestCatalogOfSource.resolves();

            return helper.request().get('/api/1.1/nodes/123/catalogs/dummysource')
                .expect('Content-Type', /^application\/json/)
                .expect(404);
        });

        it("should return a 404 if the node was not found", function () {

            waterline.nodes.findByIdentifier.resolves();

            return helper.request().get('/api/1.1/nodes/123/catalogs/dummysource')
                .expect('Content-Type', /^application\/json/)
                .expect(404);
        });

        it("should return a 404 if finding the node fails", function () {

            waterline.nodes.findByIdentifier.rejects();

            return helper.request().get('/api/1.1/nodes/123/catalogs/dummysource')
                .expect('Content-Type', /^application\/json/)
                .expect(404);
        });
    });

    describe('GET /nodes/:identifier/pollers', function() {
        it('should get a list of pollers', function () {
            var node = {
                id: '123'
            };
            var poller = {
                id: '4532',
                name: 'Pollers.IPMI',
                config: {}
            };
            waterline.nodes.findByIdentifier.resolves(node);
            waterline.workitems.findPollers.resolves([poller]);

            return helper.request().get('/api/1.1/nodes/123/pollers')
                .expect('Content-Type', /^application\/json/)
                .expect(200, [{
                    id: '4532',
                    type: 'ipmi',
                    config: {}
                }])
                .expect(function () {
                    expect(waterline.workitems.findPollers).to.have.been.calledOnce;
                    expect(waterline.workitems.findPollers.firstCall.args[0])
                        .to.have.property('node').that.equals('123');
                });
        });

        it('should return a 404 if the node was not found', function () {
            waterline.nodes.findByIdentifier.resolves(undefined);

            return helper.request().get('/api/1.1/nodes/123/pollers')
                .expect('Content-Type', /^application\/json/)
                .expect(404);
        });
    });

    var configuration;
    function mockConfiguration() {
        beforeEach('set up mocks', function () {
            configuration = helper.injector.get('Services.Configuration');
            sinon.stub(configuration, 'get');
            sinon.stub(configuration, 'set').returns(configuration);
        });

        afterEach('tear down mocks', function () {
            configuration.get.restore();
            configuration.set.restore();
        });
    }

    describe('POST /nodes/:macaddress/dhcp/whitelist', function () {
        mockConfiguration();
        it('should add a MAC to an empty DHCP whitelist', function () {
            configuration.get.returns(undefined);
            return helper.request().post('/api/1.1/nodes/00:11:22:33:44:55/dhcp/whitelist')
                .expect(201)
                .expect(function () {
                    expect(configuration.get).to.have.been.calledWith('whitelist');
                    expect(configuration.set).to.have.been.calledOnce
                        .and.to.have.deep.property('firstCall.args')
                        .that.deep.equals(['whitelist', ['00-11-22-33-44-55']]);
                });
        });

        it('should append a MAC to an existing DHCP whitelist', function () {
            var configuration = helper.injector.get('Services.Configuration');
            configuration.get.returns(['00-00-00-00-00-00']);

            return helper.request().post('/api/1.1/nodes/00:11:22:33:44:ab/dhcp/whitelist')
                .expect(201)
                .expect(function () {
                    expect(configuration.get).to.have.been.calledWith('whitelist');
                    expect(configuration.set).to.have.been.calledOnce
                        .and.to.have.deep.property('firstCall.args')
                        .that.deep.equals(['whitelist',
                                          ['00-00-00-00-00-00', '00-11-22-33-44-ab']]);
                });
        });
    });

    describe('DELETE /nodes/:macaddress/dhcp/whitelist', function () {
        mockConfiguration();

        it('should remove a MAC from the DHCP whitelist', function () {
            configuration.get.returns(['00-11-22-33-44-ab']);

            return helper.request().delete('/api/1.1/nodes/00:11:22:33:44:ab/dhcp/whitelist')
                .expect(204)
                .expect(function () {
                    expect(configuration.get).to.have.been.calledWith('whitelist');
                    expect(configuration.set).to.have.been.calledOnce
                        .and.to.have.deep.property('firstCall.args')
                        .that.deep.equals(['whitelist', []]);
                    expect(configuration.get('whitelist'))
                    .to.deep.equal([]);
                });
        });

        it('should do nothing if the DHCP whitelist is empty', function () {
            var configuration = helper.injector.get('Services.Configuration');
            configuration.get.returns([]);

            return helper.request().delete('/api/1.1/nodes/00:11:22:33:44:55/dhcp/whitelist')
                .expect(204)
                .expect(function () {
                    expect(configuration.get).to.have.been.calledWith('whitelist');
                    expect(configuration.set).to.not.have.been.called;
                });
        });

        it('should do nothing if the DHCP whitelist is undefined', function () {
            var configuration = helper.injector.get('Services.Configuration');
            configuration.get.returns(undefined);

            return helper.request().delete('/api/1.1/nodes/00:11:22:33:44:55/dhcp/whitelist')
                .expect(204)
                .expect(function () {
                    expect(configuration.get).to.have.been.calledWith('whitelist');
                    expect(configuration.set).to.not.have.been.called;
                });
        });
    });

    describe('GET /nodes/:identifier/workflows', function() {
        it('should get a list of workflows', function () {
            var node = {
                id: '123',
                workflows: [
                    {
                        name: 'TestGraph.Dummy'
                    }
                ]
            };
            var populate = sinon.stub().resolves(node);
            waterline.nodes.findByIdentifier.returns({
                populate: populate
            });

            return helper.request().get('/api/1.1/nodes/123/workflows')
                .expect('Content-Type', /^application\/json/)
                .expect(200, node.workflows)
                .expect(function () {
                    expect(populate).to.have.been.calledOnce;
                    expect(populate).to.have.been.calledWith('workflows');
                });
        });

        it('should return a 404 if the node was not found', function () {
            var populate = sinon.stub().resolves(undefined);
            waterline.nodes.findByIdentifier.returns({
                populate: populate
            });

            return helper.request().get('/api/1.1/nodes/123/workflows')
                .expect('Content-Type', /^application\/json/)
                .expect(404);
        });
    });

    describe('POST /nodes/:identifier/workflows', function() {
        it('should create a workflow via the querystring', function () {
            waterline.nodes.findByIdentifier.resolves({ id: '123' });
            taskGraphProtocol.runTaskGraph.resolves({});

            return helper.request().post('/api/1.1/nodes/123/workflows')
                .query({ name: 'TestGraph.Dummy' })
                .expect('Content-Type', /^application\/json/)
                .expect(201)
                .expect(function () {
                    expect(taskGraphProtocol.runTaskGraph).to.have.been.calledOnce;
                    expect(taskGraphProtocol.runTaskGraph.firstCall.args)
                        .to.deep.equal([
                            'TestGraph.Dummy',
                            {},
                            '123'
                        ]);
                });
        });

        it('should create a workflow with options via the querystring', function () {
            waterline.nodes.findByIdentifier.resolves({ id: '123' });
            taskGraphProtocol.runTaskGraph.resolves({});

            return helper.request().post('/api/1.1/nodes/123/workflows')
                .query({ name: 'TestGraph.Dummy', options: { prop: 555 } })
                .expect('Content-Type', /^application\/json/)
                .expect(201)
                .expect(function () {
                    expect(taskGraphProtocol.runTaskGraph).to.have.been.calledOnce;
                    expect(taskGraphProtocol.runTaskGraph.firstCall.args)
                        .to.deep.equal([
                            'TestGraph.Dummy',
                            { prop: "555" },
                            '123'
                        ]);
                });
        });

        it('should create a workflow via the request body', function () {
            waterline.nodes.findByIdentifier.resolves({ id: '123' });
            taskGraphProtocol.runTaskGraph.resolves({});

            return helper.request().post('/api/1.1/nodes/123/workflows')
                .send({ name: 'TestGraph.Dummy' })
                .expect('Content-Type', /^application\/json/)
                .expect(201)
                .expect(function () {
                    expect(taskGraphProtocol.runTaskGraph).to.have.been.calledOnce;
                    expect(taskGraphProtocol.runTaskGraph.firstCall.args)
                        .to.deep.equal([
                            'TestGraph.Dummy',
                            {},
                            '123'
                        ]);
                });
        });

        it('should create a workflow with options via the request body', function () {
            waterline.nodes.findByIdentifier.resolves({ id: '123' });
            taskGraphProtocol.runTaskGraph.resolves({});

            return helper.request().post('/api/1.1/nodes/123/workflows')
                .send({ name: 'TestGraph.Dummy', options: { prop: 555 } })
                .expect('Content-Type', /^application\/json/)
                .expect(201)
                .expect(function () {
                    expect(taskGraphProtocol.runTaskGraph).to.have.been.calledOnce;
                    expect(taskGraphProtocol.runTaskGraph.firstCall.args)
                        .to.deep.equal([
                            'TestGraph.Dummy',
                            { prop: 555 },
                            '123'
                        ]);
                });
        });

        it('should return a 404 if the node was not found', function () {
            waterline.nodes.findByIdentifier.resolves(undefined);

            return helper.request().post('/api/1.1/nodes/123/workflows')
                .send({})
                .expect('Content-Type', /^application\/json/)
                .expect(404);
        });
    });

    describe('GET /nodes/:identifier/workflows/active', function() {
        it('should get the currently active workflow', function () {
            var node = {
                id: '123'
            };
            var graph = {
                instanceId: '0987'
            };
            waterline.nodes.findByIdentifier.resolves(node);
            taskGraphProtocol.getActiveTaskGraph.resolves(graph);
            waterline.graphobjects.findOne.resolves({});

            return helper.request().get('/api/1.1/nodes/123/workflows/active')
                .expect('Content-Type', /^application\/json/)
                .expect(200)
                .expect(function () {
                    expect(taskGraphProtocol.getActiveTaskGraph).to.have.been.calledOnce;
                    expect(taskGraphProtocol.getActiveTaskGraph.firstCall.args[0])
                        .to.have.property('target').that.equals('123');
                    expect(waterline.graphobjects.findOne).to.have.been.calledOnce;
                    expect(waterline.graphobjects.findOne.firstCall.args[0])
                        .to.have.property('instanceId').that.equals('0987');
                });
        });

        it('should return a 404 if the node was not found', function () {
            waterline.nodes.findByIdentifier.resolves(undefined);

            return helper.request().get('/api/1.1/nodes/123/workflows/active')
                .expect('Content-Type', /^application\/json/)
                .expect(404);
        });

        it('should return a 404 if the node has no active graph', function () {
            waterline.nodes.findByIdentifier.resolves({ id: '123' });
            taskGraphProtocol.getActiveTaskGraph.resolves(undefined);

            return helper.request().get('/api/1.1/nodes/123/workflows/active')
                .expect('Content-Type', /^application\/json/)
                .expect(404);
        });
    });

    describe('DELETE /nodes/:identifier/workflows/active', function() {
        it('should delete the currently active workflow', function () {
            var node = {
                id: '123'
            };
            waterline.nodes.findByIdentifier.resolves(node);
            taskGraphProtocol.cancelTaskGraph.resolves({});

            return helper.request().delete('/api/1.1/nodes/123/workflows/active')
                .expect('Content-Type', /^application\/json/)
                .expect(200)
                .expect(function () {
                    expect(taskGraphProtocol.cancelTaskGraph).to.have.been.calledOnce;
                    expect(taskGraphProtocol.cancelTaskGraph.firstCall.args[0])
                        .to.have.property('target').that.equals('123');
                });
        });

        it('should return a 404 if the node was not found', function () {
            waterline.nodes.findByIdentifier.resolves(undefined);

            return helper.request().delete('/api/1.1/nodes/123/workflows/active')
                .expect('Content-Type', /^application\/json/)
                .expect(404);
        });
    });
});
