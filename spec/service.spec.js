process.env.COMPONENT_PATH = '/spec/component';
describe('Service', function(){
    var Q = require('q');
    var service = require('../lib/service');

    describe('execService', function(){
        var onSuccess;
        var onError;

        beforeEach(function(){
            onSuccess = jasmine.createSpy('success');
            onError = jasmine.createSpy('error');
        });

        it('verifyCredentials', function(){
            runs(function(){
                Q.fcall(function(){
                    return service.execService('verifyCredentials', {}, {})
                })
                .then(onSuccess, onError)
                .done();
            });

            waitsFor(function(){
                return onSuccess.calls.length || onError.calls.length;
            });

            runs(function(){
                expect(onSuccess).toHaveBeenCalledWith({verified: true});
                expect(onError).not.toHaveBeenCalled();
            });
        });

        it('getMetaModel', function(){
            runs(function(){
                Q.fcall(function(){
                    return service.execService('getMetaModel', {}, {triggerOrAction: 'update'})
                })
                .then(onSuccess, onError)
                .done();
            });

            waitsFor(function(){
                return onSuccess.calls.length || onError.calls.length;
            });

            runs(function(){
                expect(onSuccess).toHaveBeenCalledWith('metamodel');
                expect(onError).not.toHaveBeenCalled();
            });
        });

        it('selectModel', function(){
            var onSuccess = jasmine.createSpy('success');
            var onError = jasmine.createSpy('error');

            runs(function(){
                Q.fcall(function(){
                    return service.execService('selectModel', {}, {triggerOrAction: 'update', getModelMethod: 'getModel'});
                })
                .then(onSuccess, onError)
                .done();
            });

            waitsFor(function(){
                return onSuccess.calls.length || onError.calls.length;
            });

            runs(function(){
                expect(onSuccess).toHaveBeenCalledWith('model');
                expect(onError).not.toHaveBeenCalled();
            });
        });

        it('should throw an error when there is no such service method', function(){
            var onSuccess = jasmine.createSpy('success');
            var onError = jasmine.createSpy('error');

            runs(function(){
                Q.fcall(function(){
                    return service.execService('unknownMethod', {}, {});
                })
                .then(onSuccess, onError)
                .done();
            });

            waitsFor(function(){
                return onSuccess.calls.length || onError.calls.length;
            });

            runs(function(){
                expect(onError).toHaveBeenCalled();
                expect(onSuccess).not.toHaveBeenCalled();
            });
        });

        it('should throw an error when there is no metaModel method', function(){
            var onSuccess = jasmine.createSpy('success');
            var onError = jasmine.createSpy('error');

            runs(function(){
                Q.fcall(function(){
                    return service.execService('getMetaMethod', {}, {triggerOrAction: 'unknown'});
                })
                .then(onSuccess, onError)
                .done();
            });

            waitsFor(function(){
                return onSuccess.calls.length || onError.calls.length;
            });

            runs(function(){
                expect(onError).toHaveBeenCalled();
                expect(onSuccess).not.toHaveBeenCalled();
            });
        });

        it('should throw an error when there is no getModel method', function(){
            var onSuccess = jasmine.createSpy('success');
            var onError = jasmine.createSpy('error');

            runs(function(){
                Q.fcall(function(){
                    return service.execService('selectModel', {}, {triggerOrAction: 'update', getModelMethod: 'unknown'});
                })
                .then(onSuccess, onError)
                .done();
            });

            waitsFor(function(){
                return onSuccess.calls.length || onError.calls.length;
            });

            runs(function(){
                expect(onError).toHaveBeenCalled();
                expect(onSuccess).not.toHaveBeenCalled();
            });
        });
    });
});