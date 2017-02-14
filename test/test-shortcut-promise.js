var ShortcutPromise = require('../index.js')
var assert = require('./utils/assert')

window.ShortcutPromise = ShortcutPromise;


module.exports = function (){
    assert(true);

    test("Sync 1 resolve then", _ => {
        var got = 0;
        var data = 123;

        ShortcutPromise.resolve(data)
            .then(val => {
                got++;
                assertEqual(data, val);
            }, err => {
                got--;
                assertNotReached('error');
            });

        assertEqual(1, got);
    });

    test("Sync 2 resolve then", _ => {
        var got = 0;
        var data = 123;

        ShortcutPromise.resolve(data)
            .then(val => {
                got++;
                assertEqual(data, val);
                return val;
            }, err => {
                got--;
                assertNotReached('error');
            })
            .then(val => {
                got++;
                assertEqual(data, val);
                return val;
            }, err => {
                got--;
                assertNotReached('error');
            });

        assertEqual(2, got);
    });

    test("Sync 1 reject then", _ => {
        var got = 0;
        var data = 123;

        ShortcutPromise.reject(data)
            .then(val => {
                got--;
                assertNotReached('success');
            }, err => {
                got++;
                assertEqual(data, err);
            });

        assertEqual(1, got);
    });

    test("Sync 2 reject then", _ => {
        var got = 0;
        var data = 123;

        ShortcutPromise.reject(data)
            .then(val => {
                got--;
                assertNotReached('success');
            }, err => {
                got++;
                assertEqual(data, err);
                throw err;
            })
            .then(val => {
                got--;
                assertNotReached('success');
            }, err => {
                got++;
                assertEqual(data, err);
                throw err;
            });

        assertEqual(2, got);
    });

    test("Sync 1 reject then 1 resolve", _ => {
        var got = 0;
        var data = 123;

        ShortcutPromise.reject(data)
            .then(val => {
                got--;
                assertNotReached('success');
            }, err => {
                got++;
                assertEqual(data, err);
                return err;
            })
            .then(val => {
                got++;
                assertEqual(data, val);
            }, err => {
                got--;
                assertNotReached('error');
            });

        assertEqual(2, got);
    });

    test("Sync all 2 promise", _ => {
        var got = 0;

        ShortcutPromise
            .all([true, ShortcutPromise.resolve(123)])
            .then(values => {
                got++;
                assertEqual(true, values[0]);
                assertEqual(123, values[1]);
                assert(values instanceof Array);
            }, err => {
                console.error(err);
                got--;
                assertNotReached('error');
            });

        assertEqual(1, got);
    });

    test("Sync race 2 promise", _ => {
        var got = 0;

        ShortcutPromise
            .race([
                ShortcutPromise.resolve(111),
                ShortcutPromise.resolve(222)
            ])
            .then(val => {
                got++;
                assertEqual(111, val);
            }, err => {
                got--;
                assertNotReached('error');
            });

        assertEqual(1, got);
    });

    test("Async all 2 promise", _ => {
        var got = 0;

        ShortcutPromise
            .all([
                new ShortcutPromise(resolve => setTimeout(_ => resolve(111), 300)),
                new ShortcutPromise(resolve => setTimeout(_ => resolve(222), 100))
            ])
            .then(values => {
                got++;
                assertEqual(111, values[0]);
                assertEqual(222, values[1]);
                assert(values instanceof Array);
            }, err => {
                console.error(err);
                got--;
                assertNotReached('error');
            });

        assertEqual(0, got);
        setTimeout(_ => assertEqual(1, got), 301);
    });

    test("Async race 2 promise", _ => {
        var got = 0;

        ShortcutPromise
            .race([
                new ShortcutPromise(resolve => setTimeout(_ => resolve(111), 300)),
                new ShortcutPromise(resolve => setTimeout(_ => resolve(222), 100))
            ])
            .then(val => {
                got++;
                assertEqual(222, val);
            }, err => {
                got--;
                assertNotReached('error');
            });

        assertEqual(0, got);
        setTimeout(_ => assertEqual(1, got), 301);
    });

    return assert.errors.length > 0 ? "Errors: \n" + JSON.stringify(assert.errors, ' ', ' ') : "All success!";
};


function test(name, exec){
    console.log("Begin test: " + name);

    try {
        exec();
    } catch (e){
        console.log("Error: got exception in test " + name + '. exception: ' + (e ? e.message : e))
    }

    console.log("End test: " + name);
}

function assertNotReached(pos){
    assert(false, pos + " should not be reached!");
}

function assertEqual(expected, actual, message){
    assert(expected === actual, message || "Expect " + JSON.stringify(expected) + ", but got " + JSON.stringify(actual));
}


function assertGreaterThan(expected, actual, message){
    assert(actual > expected, message || "Expect " + JSON.stringify(actual) + " > " + JSON.stringify(expected) + ", but not.");
}

function assertGreaterThanOrEqual(expected, actual, message){
    assert(actual >= expected, message || "Expect " + JSON.stringify(actual) + " >= " + JSON.stringify(expected) + ", but not.");
}

function assertLessThan(expected, actual, message){
    assert(actual < expected, message || "Expect " + JSON.stringify(actual) + " < " + JSON.stringify(expected) + ", but not.");
}

function assertLessThanOrEqual(expected, actual, message){
    assert(actual <= expected, message || "Expect " + JSON.stringify(actual) + " <= " + JSON.stringify(expected) + ", but not.");
}
