
/**
 * Require the given path.
 *
 * @param {String} path
 * @return {Object} exports
 * @api public
 */

function require(path, parent, orig) {
  var resolved = require.resolve(path);

  // lookup failed
  if (null == resolved) {
    orig = orig || path;
    parent = parent || 'root';
    var err = new Error('Failed to require "' + orig + '" from "' + parent + '"');
    err.path = orig;
    err.parent = parent;
    err.require = true;
    throw err;
  }

  var module = require.modules[resolved];

  // perform real require()
  // by invoking the module's
  // registered function
  if (!module._resolving && !module.exports) {
    var mod = {};
    mod.exports = {};
    mod.client = mod.component = true;
    module._resolving = true;
    module.call(this, mod.exports, require.relative(resolved), mod);
    delete module._resolving;
    module.exports = mod.exports;
  }

  return module.exports;
}

/**
 * Registered modules.
 */

require.modules = {};

/**
 * Registered aliases.
 */

require.aliases = {};

/**
 * Resolve `path`.
 *
 * Lookup:
 *
 *   - PATH/index.js
 *   - PATH.js
 *   - PATH
 *
 * @param {String} path
 * @return {String} path or null
 * @api private
 */

require.resolve = function(path) {
  if (path.charAt(0) === '/') path = path.slice(1);

  var paths = [
    path,
    path + '.js',
    path + '.json',
    path + '/index.js',
    path + '/index.json'
  ];

  for (var i = 0; i < paths.length; i++) {
    var path = paths[i];
    if (require.modules.hasOwnProperty(path)) return path;
    if (require.aliases.hasOwnProperty(path)) return require.aliases[path];
  }
};

/**
 * Normalize `path` relative to the current path.
 *
 * @param {String} curr
 * @param {String} path
 * @return {String}
 * @api private
 */

require.normalize = function(curr, path) {
  var segs = [];

  if ('.' != path.charAt(0)) return path;

  curr = curr.split('/');
  path = path.split('/');

  for (var i = 0; i < path.length; ++i) {
    if ('..' == path[i]) {
      curr.pop();
    } else if ('.' != path[i] && '' != path[i]) {
      segs.push(path[i]);
    }
  }

  return curr.concat(segs).join('/');
};

/**
 * Register module at `path` with callback `definition`.
 *
 * @param {String} path
 * @param {Function} definition
 * @api private
 */

require.register = function(path, definition) {
  require.modules[path] = definition;
};

/**
 * Alias a module definition.
 *
 * @param {String} from
 * @param {String} to
 * @api private
 */

require.alias = function(from, to) {
  if (!require.modules.hasOwnProperty(from)) {
    throw new Error('Failed to alias "' + from + '", it does not exist');
  }
  require.aliases[to] = from;
};

/**
 * Return a require function relative to the `parent` path.
 *
 * @param {String} parent
 * @return {Function}
 * @api private
 */

require.relative = function(parent) {
  var p = require.normalize(parent, '..');

  /**
   * lastIndexOf helper.
   */

  function lastIndexOf(arr, obj) {
    var i = arr.length;
    while (i--) {
      if (arr[i] === obj) return i;
    }
    return -1;
  }

  /**
   * The relative require() itself.
   */

  function localRequire(path) {
    var resolved = localRequire.resolve(path);
    return require(resolved, parent, path);
  }

  /**
   * Resolve relative to the parent.
   */

  localRequire.resolve = function(path) {
    var c = path.charAt(0);
    if ('/' == c) return path.slice(1);
    if ('.' == c) return require.normalize(p, path);

    // resolve deps by returning
    // the dep in the nearest "deps"
    // directory
    var segs = parent.split('/');
    var i = lastIndexOf(segs, 'deps') + 1;
    if (!i) i = 0;
    path = segs.slice(0, i + 1).join('/') + '/deps/' + path;
    return path;
  };

  /**
   * Check if module is defined at `path`.
   */

  localRequire.exists = function(path) {
    return require.modules.hasOwnProperty(localRequire.resolve(path));
  };

  return localRequire;
};
require.register("signature-pad/signature_pad.js", Function("exports, require, module",
"/*!\n\
 * Signature Pad v1.3.2\n\
 * https://github.com/szimek/signature_pad\n\
 *\n\
 * Copyright 2013 Szymon Nowak\n\
 * Released under the MIT license\n\
 *\n\
 * The main idea and some parts of the code (e.g. drawing variable width Bézier curve) are taken from:\n\
 * http://corner.squareup.com/2012/07/smoother-signatures.html\n\
 *\n\
 * Implementation of interpolation using cubic Bézier curves is taken from:\n\
 * http://benknowscode.wordpress.com/2012/09/14/path-interpolation-using-cubic-bezier-and-control-point-estimation-in-javascript\n\
 *\n\
 * Algorithm for approximated length of a Bézier curve is taken from:\n\
 * http://www.lemoda.net/maths/bezier-length/index.html\n\
 *\n\
 */\n\
/**\n\
 * component wrapper of signature_pad\n\
 *\n\
 * @example\n\
 *\n\
 * var SignaturePad = require('signature-pad');\n\
 * var pad = new SignaturePad(canvas, options);\n\
 *\n\
 */\n\
var SignaturePad = module.exports = (function (document) {\n\
    \"use strict\";\n\
\n\
    var SignaturePad = function (canvas, options) {\n\
        var self = this,\n\
            opts = options || {};\n\
\n\
        this.velocityFilterWeight = opts.velocityFilterWeight || 0.7;\n\
        this.minWidth = opts.minWidth || 0.5;\n\
        this.maxWidth = opts.maxWidth || 2.5;\n\
        this.dotSize = opts.dotSize || function () {\n\
            return (this.minWidth + this.maxWidth) / 2;\n\
        };\n\
        this.penColor = opts.penColor || \"black\";\n\
        this.backgroundColor = opts.backgroundColor || \"rgba(0,0,0,0)\";\n\
        this.onEnd = opts.onEnd;\n\
        this.onBegin = opts.onBegin;\n\
\n\
        this._canvas = canvas;\n\
        this._ctx = canvas.getContext(\"2d\");\n\
        this.clear();\n\
\n\
        this._handleMouseEvents();\n\
        this._handleTouchEvents();\n\
    };\n\
\n\
    SignaturePad.prototype.clear = function () {\n\
        var ctx = this._ctx,\n\
            canvas = this._canvas;\n\
\n\
        ctx.fillStyle = this.backgroundColor;\n\
        ctx.clearRect(0, 0, canvas.width, canvas.height);\n\
        ctx.fillRect(0, 0, canvas.width, canvas.height);\n\
        this._reset();\n\
    };\n\
\n\
    SignaturePad.prototype.toDataURL = function (imageType, quality) {\n\
        var canvas = this._canvas;\n\
        return canvas.toDataURL.apply(canvas, arguments);\n\
    };\n\
\n\
    SignaturePad.prototype.fromDataURL = function (dataUrl) {\n\
        var self = this,\n\
            image = new Image();\n\
\n\
        this._reset();\n\
        image.src = dataUrl;\n\
        image.onload = function () {\n\
            self._ctx.drawImage(image, 0, 0, self._canvas.width, self._canvas.height);\n\
        };\n\
        this._isEmpty = false;\n\
    };\n\
\n\
    SignaturePad.prototype._strokeUpdate = function (event) {\n\
        var point = this._createPoint(event);\n\
        this._addPoint(point);\n\
    };\n\
\n\
    SignaturePad.prototype._strokeBegin = function (event) {\n\
        this._reset();\n\
        this._strokeUpdate(event);\n\
        if (typeof this.onBegin === 'function') {\n\
            this.onBegin(event);\n\
        }\n\
    };\n\
\n\
    SignaturePad.prototype._strokeDraw = function (point) {\n\
        var ctx = this._ctx,\n\
            dotSize = typeof(this.dotSize) === 'function' ? this.dotSize() : this.dotSize;\n\
\n\
        ctx.beginPath();\n\
        this._drawPoint(point.x, point.y, dotSize);\n\
        ctx.closePath();\n\
        ctx.fill();\n\
    };\n\
\n\
    SignaturePad.prototype._strokeEnd = function (event) {\n\
        var canDrawCurve = this.points.length > 2,\n\
            point = this.points[0];\n\
\n\
        if (!canDrawCurve && point) {\n\
            this._strokeDraw(point);\n\
        }\n\
        if (typeof this.onEnd === 'function') {\n\
            this.onEnd(event);\n\
        }\n\
    };\n\
\n\
    SignaturePad.prototype._handleMouseEvents = function () {\n\
        var self = this;\n\
        this._mouseButtonDown = false;\n\
\n\
        this._canvas.addEventListener(\"mousedown\", function (event) {\n\
            if (event.which === 1) {\n\
                self._mouseButtonDown = true;\n\
                self._strokeBegin(event);\n\
            }\n\
        });\n\
\n\
        this._canvas.addEventListener(\"mousemove\", function (event) {\n\
            if (self._mouseButtonDown) {\n\
                self._strokeUpdate(event);\n\
            }\n\
        });\n\
\n\
        document.addEventListener(\"mouseup\", function (event) {\n\
            if (event.which === 1 && self._mouseButtonDown) {\n\
                self._mouseButtonDown = false;\n\
                self._strokeEnd(event);\n\
            }\n\
        });\n\
    };\n\
\n\
    SignaturePad.prototype._handleTouchEvents = function () {\n\
        var self = this;\n\
\n\
        // Pass touch events to canvas element on mobile IE.\n\
        this._canvas.style.msTouchAction = 'none';\n\
\n\
        this._canvas.addEventListener(\"touchstart\", function (event) {\n\
            var touch = event.changedTouches[0];\n\
            self._strokeBegin(touch);\n\
        });\n\
\n\
        this._canvas.addEventListener(\"touchmove\", function (event) {\n\
            // Prevent scrolling.\n\
            event.preventDefault();\n\
\n\
            var touch = event.changedTouches[0];\n\
            self._strokeUpdate(touch);\n\
        });\n\
\n\
        document.addEventListener(\"touchend\", function (event) {\n\
            var wasCanvasTouched = event.target === self._canvas;\n\
            if (wasCanvasTouched) {\n\
                self._strokeEnd(event);\n\
            }\n\
        });\n\
    };\n\
\n\
    SignaturePad.prototype.isEmpty = function () {\n\
        return this._isEmpty;\n\
    };\n\
\n\
    SignaturePad.prototype._reset = function () {\n\
        this.points = [];\n\
        this._lastVelocity = 0;\n\
        this._lastWidth = (this.minWidth + this.maxWidth) / 2;\n\
        this._isEmpty = true;\n\
        this._ctx.fillStyle = this.penColor;\n\
    };\n\
\n\
    SignaturePad.prototype._createPoint = function (event) {\n\
        var rect = this._canvas.getBoundingClientRect();\n\
        return new Point(\n\
            event.clientX - rect.left,\n\
            event.clientY - rect.top\n\
        );\n\
    };\n\
\n\
    SignaturePad.prototype._addPoint = function (point) {\n\
        var points = this.points,\n\
            c2, c3,\n\
            curve, tmp;\n\
\n\
        points.push(point);\n\
\n\
        if (points.length > 2) {\n\
            // To reduce the initial lag make it work with 3 points\n\
            // by copying the first point to the beginning.\n\
            if (points.length === 3) points.unshift(points[0]);\n\
\n\
            tmp = this._calculateCurveControlPoints(points[0], points[1], points[2]);\n\
            c2 = tmp.c2;\n\
            tmp = this._calculateCurveControlPoints(points[1], points[2], points[3]);\n\
            c3 = tmp.c1;\n\
            curve = new Bezier(points[1], c2, c3, points[2]);\n\
            this._addCurve(curve);\n\
\n\
            // Remove the first element from the list,\n\
            // so that we always have no more than 4 points in points array.\n\
            points.shift();\n\
        }\n\
    };\n\
\n\
    SignaturePad.prototype._calculateCurveControlPoints = function (s1, s2, s3) {\n\
        var dx1 = s1.x - s2.x, dy1 = s1.y - s2.y,\n\
            dx2 = s2.x - s3.x, dy2 = s2.y - s3.y,\n\
\n\
            m1 = {x: (s1.x + s2.x) / 2.0, y: (s1.y + s2.y) / 2.0},\n\
            m2 = {x: (s2.x + s3.x) / 2.0, y: (s2.y + s3.y) / 2.0},\n\
\n\
            l1 = Math.sqrt(dx1*dx1 + dy1*dy1),\n\
            l2 = Math.sqrt(dx2*dx2 + dy2*dy2),\n\
\n\
            dxm = (m1.x - m2.x),\n\
            dym = (m1.y - m2.y),\n\
\n\
            k = l2 / (l1 + l2),\n\
            cm = {x: m2.x + dxm*k, y: m2.y + dym*k},\n\
\n\
            tx = s2.x - cm.x,\n\
            ty = s2.y - cm.y;\n\
\n\
        return {\n\
            c1: new Point(m1.x + tx, m1.y + ty),\n\
            c2: new Point(m2.x + tx, m2.y + ty)\n\
        };\n\
    };\n\
\n\
    SignaturePad.prototype._addCurve = function (curve) {\n\
        var startPoint = curve.startPoint,\n\
            endPoint = curve.endPoint,\n\
            velocity, newWidth;\n\
\n\
        velocity = endPoint.velocityFrom(startPoint);\n\
        velocity = this.velocityFilterWeight * velocity\n\
            + (1 - this.velocityFilterWeight) * this._lastVelocity;\n\
\n\
        newWidth = this._strokeWidth(velocity);\n\
        this._drawCurve(curve, this._lastWidth, newWidth);\n\
\n\
        this._lastVelocity = velocity;\n\
        this._lastWidth = newWidth;\n\
    };\n\
\n\
    SignaturePad.prototype._drawPoint = function (x, y, size) {\n\
        var ctx = this._ctx;\n\
\n\
        ctx.moveTo(x, y);\n\
        ctx.arc(x, y, size, 0, 2 * Math.PI, false);\n\
        this._isEmpty = false;\n\
    };\n\
\n\
    SignaturePad.prototype._drawCurve = function (curve, startWidth, endWidth) {\n\
        var ctx = this._ctx,\n\
            widthDelta = endWidth - startWidth,\n\
            drawSteps, width, i, t, tt, ttt, u, uu, uuu, x, y;\n\
\n\
        drawSteps = Math.floor(curve.length());\n\
        ctx.beginPath();\n\
        for (i = 0; i < drawSteps; i++) {\n\
            // Calculate the Bezier (x, y) coordinate for this step.\n\
            t = i / drawSteps;\n\
            tt = t * t;\n\
            ttt = tt * t;\n\
            u = 1 - t;\n\
            uu = u * u;\n\
            uuu = uu * u;\n\
\n\
            x = uuu * curve.startPoint.x;\n\
            x += 3 * uu * t * curve.control1.x;\n\
            x += 3 * u * tt * curve.control2.x;\n\
            x += ttt * curve.endPoint.x;\n\
\n\
            y = uuu * curve.startPoint.y;\n\
            y += 3 * uu * t * curve.control1.y;\n\
            y += 3 * u * tt * curve.control2.y;\n\
            y += ttt * curve.endPoint.y;\n\
\n\
            width = startWidth + ttt * widthDelta;\n\
            this._drawPoint(x, y, width);\n\
        }\n\
        ctx.closePath();\n\
        ctx.fill();\n\
    };\n\
\n\
    SignaturePad.prototype._strokeWidth = function (velocity) {\n\
        return Math.max(this.maxWidth / (velocity + 1), this.minWidth);\n\
    };\n\
\n\
\n\
    var Point = function (x, y, time) {\n\
        this.x = x;\n\
        this.y = y;\n\
        this.time = time || new Date().getTime();\n\
    };\n\
\n\
    Point.prototype.velocityFrom = function (start) {\n\
        return (this.time !== start.time) ? this.distanceTo(start) / (this.time - start.time) : 1;\n\
    };\n\
\n\
    Point.prototype.distanceTo = function (start) {\n\
        return Math.sqrt(Math.pow(this.x - start.x, 2) + Math.pow(this.y - start.y, 2));\n\
    };\n\
\n\
    var Bezier = function (startPoint, control1, control2, endPoint) {\n\
        this.startPoint = startPoint;\n\
        this.control1 = control1;\n\
        this.control2 = control2;\n\
        this.endPoint = endPoint;\n\
    };\n\
\n\
    // Returns approximated length.\n\
    Bezier.prototype.length = function () {\n\
        var steps = 10,\n\
            length = 0,\n\
            i, t, cx, cy, px, py, xdiff, ydiff;\n\
\n\
        for (i = 0; i <= steps; i++) {\n\
            t = i / steps;\n\
            cx = this._point(t, this.startPoint.x, this.control1.x, this.control2.x, this.endPoint.x);\n\
            cy = this._point(t, this.startPoint.y, this.control1.y, this.control2.y, this.endPoint.y);\n\
            if (i > 0) {\n\
                xdiff = cx - px;\n\
                ydiff = cy - py;\n\
                length += Math.sqrt(xdiff * xdiff + ydiff * ydiff);\n\
            }\n\
            px = cx;\n\
            py = cy;\n\
        }\n\
        return length;\n\
    };\n\
\n\
    Bezier.prototype._point = function (t, start, c1, c2, end) {\n\
        return          start * (1.0 - t) * (1.0 - t)  * (1.0 - t)\n\
               + 3.0 *  c1    * (1.0 - t) * (1.0 - t)  * t\n\
               + 3.0 *  c2    * (1.0 - t) * t          * t\n\
               +        end   * t         * t          * t;\n\
    };\n\
\n\
    return SignaturePad;\n\
})(document);\n\
//@ sourceURL=signature-pad/signature_pad.js"
));
require.alias("signature-pad/signature_pad.js", "signature-pad/index.js");