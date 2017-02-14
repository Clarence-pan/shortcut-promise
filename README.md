Shortcut Promise
==================
A Promise which directly call onFullfilled or onRejected - shortcuted


Example
=======

```js
var a = 0
ShortcutPromise.resolve(1)
    .then(val => {
      a = val
    });
console.log(a) // => 1
```

It is different from ES6 Promise:


```js
var a = 0
Promise.resolve(1)
    .then(val => {
      a = val
    });
console.log(a) // => 0
```