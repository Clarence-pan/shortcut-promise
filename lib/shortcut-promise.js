// Promise内部数据的索引
var STATE = 'state';
var RESOLVED_LISTENERS = 'resolvedListeners';
var REJECTED_LISTENERS = 'rejectedListeners';
var RESOLVED_VALUE = 'value';
var REJECTED_REASON = 'reason';

// Promise的状态值
var STATE_INITIAL = 'initial';
var STATE_RESOLVED = 'resolved';
var STATE_REJECTED = 'rejected';

// Listener内部数据的索引
var LISTENER_CALLBACK = 'callback';
var LISTENER_PROMISE = 'promise';
var LISTENER_RESOLVE = 'resolve';
var LISTENER_REJECT = 'reject';

/**
 * 短接Promise -- Promise/a+规范要求所有的回调都是异步调用，这样其实有的时候不太方便，故搞一个能同步调用的...
 * @param resolver
 * @returns {ShortcutPromise}
 * @constructor
 */
function ShortcutPromise(resolver) {
    var data = this._data = {};
    data[STATE] = STATE_INITIAL;
    data[RESOLVED_LISTENERS] = [];
    data[REJECTED_LISTENERS] = [];

    this['then'] = registerThenHandlers.bind(data);
    this['catch'] = registerCatchHandlers.bind(data);

    try {
        resolver(resolve.bind(this, data), reject.bind(this, data));
    } catch (e) {
        reject.call(this, data, e);
    }

    return this;
}

/**
 * 注册then处理回调
 * @param onFullfilled
 * @param onRejected
 * @returns {*}
 */
function registerThenHandlers(onFullfilled, onRejected) {
    var resolvedListener = addResolvedListener.call(this, onFullfilled),
        rejectedListener = addRejectedListener.call(this, onRejected);

    var listenerPromises = [];
    if (resolvedListener){
        listenerPromises.push(resolvedListener[LISTENER_PROMISE]);
    }

    if (rejectedListener){
        listenerPromises.push(rejectedListener[LISTENER_PROMISE]);
    }

    switch (listenerPromises.length) {
        case 0:
            return ShortcutPromise.resolve();
        case 1:
            return listenerPromises[0];
        default:
            return ShortcutPromise.race(listenerPromises);
    }
}

/**
 * 注册catch处理程序
 * @param onRejected
 * @returns {ShortcutPromise}
 */
function registerCatchHandlers(onRejected) {
    var listener = addRejectedListener.call(this, onRejected);
    return listener ? listener[LISTENER_PROMISE] : ShortcutPromise.resolve();
}

/**
 * 增加解决的监听器
 * @param onFullfilled
 * @returns {*}
 */
function addResolvedListener(onFullfilled) {
    var data = this;

    if (onFullfilled) {
        var resolvedListener = register(data[RESOLVED_LISTENERS], onFullfilled);
        if (data[STATE] === STATE_RESOLVED) {
            notify(resolvedListener, data[RESOLVED_VALUE]);
        }

        return resolvedListener;
    }
}

/**
 * 增加拒绝的监听器
 * @param onRejected
 * @returns {*}
 */
function addRejectedListener(onRejected) {
    var data = this;

    if (onRejected) {
        var rejectedListener = register(data[REJECTED_LISTENERS], onRejected);
        if (data[STATE] === STATE_REJECTED) {
            notify(rejectedListener, data[REJECTED_REASON]);
        }

        return rejectedListener;
    }
}

/**
 * 返回一个被解决了的Promise
 * @param resolved
 * @returns {ShortcutPromise}
 */
ShortcutPromise.resolve = function (resolved) {
    return new ShortcutPromise(function (resolve) {
        resolve(resolved);
    });
};

/**
 * 返回一个拒绝的Promise
 * @param reason
 * @returns {ShortcutPromise}
 */
ShortcutPromise.reject = function (reason) {
    return new ShortcutPromise(function (resolve, reject) {
        reject(reason);
    });
};

/**
 * 返回一个promise，这个promise在iterable中的任意一个promise被解决或拒绝后，立刻以相同的解决值被解决或以相同的拒绝原因被拒绝。
 * @param promises ｛iterable｝
 * @returns {ShortcutPromise}
 */
ShortcutPromise.all = function(promises){
    return new ShortcutPromise(function (resolve, reject) {
        var isRejected = false;
        var resolvedValues = ((promises instanceof Array) ? [] : {});
        var resolvedValuesCount = 0;
        var promisesCount = 0;
        var isScanning = true;
        var promise;

        // 允许所有类型的可以遍历的对象
        for (var key in promises) {

            // 数一数有多少个promise
            promisesCount++;

            if (isRejected){
                break;
            }

            if (!promises.hasOwnProperty(key)){
                continue;
            }

            promise = promises[key];
            if (!isPromise(promise)){
                promise = ShortcutPromise.resolve(promise);
            }

            if (promise instanceof ShortcutPromise) {
                addResolvedListener.call(promise._data, resolveOne.bind(null, key));
                addRejectedListener.call(promise._data, rejectOne);
            } else {
                promise.then(resolveOne.bind(null, key), rejectOne)
            }
        }

        // 扫描完了
        isScanning = false;

        // 如果都解决了，则整体也就解决了
        if (resolvedValuesCount >= promisesCount){
            resolve(resolvedValues);
        }

        function resolveOne(key, value){
            // 如果已经拒绝了，就不要处理后面的了
            if (isRejected){
                return;
            }

            // 统计解决的，如果都解决了，则整个都解决了
            resolvedValuesCount++;
            resolvedValues[key] = value;

            // 这里一定要加 -- 因为可能是异步resolve的，所以这里也要有
            if (!isScanning && resolvedValuesCount >= promisesCount){
                resolve(resolvedValues);
            }
        }

        function rejectOne(reason){
            isRejected = true;
            reject(reason);
        }
    });
};

/**
 * 等待任何一个Promise完成或拒绝
 * @param promises
 * @returns {ShortcutPromise}
 */
ShortcutPromise.race = function (promises) {
    return new ShortcutPromise(function (resolve, reject) {
        for (var promise of promises) {
            if (!isPromise(promise)){
                resolve(promise);
                return;
            }

            if (promise instanceof ShortcutPromise) {
                addResolvedListener.call(promise._data, resolve);
                addRejectedListener.call(promise._data, reject);
            } else {
                promise.then(resolve, reject);
            }
        }
    });
};

function resolve(data, value) {
    if (data[STATE] !== STATE_INITIAL) {
        return;
    }

    data[STATE] = STATE_RESOLVED;
    data[RESOLVED_VALUE] = value;

    notifyAll(data[RESOLVED_LISTENERS], value);
}

function reject(data, reason) {
    if (data[STATE] !== STATE_INITIAL) {
        return;
    }

    data[STATE] = STATE_REJECTED;
    data[REJECTED_REASON] = reason;

    notifyAll(data[REJECTED_LISTENERS], reason);
}

/**
 * 注册一个监听器
 * @param listeners
 * @param callback
 * @returns {*}
 */
function register(listeners, callback) {
    var newListener = {}, promise;

    newListener[LISTENER_CALLBACK] = callback;

    promise = new ShortcutPromise(function (resolve, reject) {
        newListener[LISTENER_RESOLVE] = resolve;
        newListener[LISTENER_REJECT] = reject;
    });

    newListener[LISTENER_PROMISE] = promise;

    listeners.push(newListener);

    return newListener;
}

/**
 * 通知所有监听器
 * @param listeners
 * @param value
 */
function notifyAll(listeners, value) {
    for (var i = 0, len = listeners.length; i < len; i++) {
        notify(listeners[i], value);
    }
}

/**
 * 通知某个监听器关于某个值
 * @param listener
 * @param value
 */
function notify(listener, value) {
    if (!listener || !listener[LISTENER_CALLBACK]) {
        return;
    }

    try {
        var nextValue = listener[LISTENER_CALLBACK](value);
        if (isPromise(nextValue)) {
            if (nextValue instanceof ShortcutPromise){
                addResolvedListener.call(nextValue._data, listener[LISTENER_RESOLVE]);
                addRejectedListener.call(nextValue._data, listener[LISTENER_REJECT]);
            } else {
                nextValue.then(listener[LISTENER_RESOLVE], listener[LISTENER_REJECT]);
            }
        } else {
            listener[LISTENER_RESOLVE](nextValue);
        }
    } catch (e) {
        listener[LISTENER_REJECT](e);
    }
}

function isPromise(x){
    return (typeof x === 'object') && x && (typeof x.then === 'function');
}


module.exports = ShortcutPromise;
