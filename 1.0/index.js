/**
 * S.NodePlugin.Align
 * @fileoverview 相对定位插件
 * @author huya<ningzbruc@gmail.com>
 * @module align-plugin
 * @date 2013-01-07
 * @version 0.0.1
 */

/*jshint smarttabs:true,browser:true,devel:true,sub:true,evil:true */

KISSY.add(function(S) {

/**
 * 相对定位插件
 * @module align-plugin
 */
    
    'use strict';
    
    var DOM = S.DOM;

    /**
     * 相对定位插件构造函数

        var node = S.one('#node');
        node.plug(S.NodePlugin.Align, {
            node: '#align',
            points: ['tr', 'bl'],
            offset: [15, -20],
            fixed: false, //default false
            resize: true,
            align: true
        });
        // or
        node.plug(S.NodePlugin.Align);
        node.to({
            node: '#align',
            points: ['tr', 'bl'],
            offset: [15, -20],
            fixed: false, //default false
            resize: true
        });

     * @class Align
     * @for S.NodePlugin
     * @param {Object} config 配置参数
     * @param {Node} config.node 相对的节点
     * @param {Array} config.points 相对的位置 ['tr', 'bl']
     * @param {Array} config.offset 偏移量
     * @param {String} config.fixed 是否相对窗口固定 tr, tl, br, bl 不支持c的定位
     * @param {Boolean} config.resize 窗口大小变动时是否重新定位
     * @param {Boolean} config.align 是否初始化的时候就开始定位
     * @constructor
     */
    function Align(config) {
        this._handles = {};
        if (config.host) {
            this._host = config.host;
            if (config.align) {
                this.to(config);
            }
        }
    }
        
    S.mix(Align.prototype, {
        
        /**
         * 相对某个元素定位到某个点
         * @method to
         * @param {Object} config 插件配置参数，同构造函数
         * @chainable
         * @public
         */
        to: function(config) {
            config = config || this._syncArgs; 
            this._syncArgs = config; //缓存配置参数，sync的时候会用到
            if (!config) { return this; }
            
            var region = config.node,
                regionPoint = config.points[0],
                point = config.points[1],
                syncOnResize = config.resize,
                offset = config.offset || [0, 0],
                fixed = config.fixed,
                isWindow = !!(region == window || (region && region[0] == window)),
                isIE6 = S.UA.ie == 6;

            if (isWindow || (region && S.isUndefined(region.top))) {
                region = this.region(region);
            }

            if (region) {
                var xy = [region.left, region.top],
                    offxy = [region.width, region.height],
                    points = Align.points,
                    node = this._host,
                    NULL = null,
                    size = [node.outerWidth(), node.outerHeight()],
                    nodeoff = [0 - size[0], 0 - size[1]], // reverse offsets
                    regionFn0 = regionPoint ? points[regionPoint.charAt(0)]: NULL,
                    regionFn1 = (regionPoint && regionPoint !== 'cc') ? points[regionPoint.charAt(1)] : NULL,
                    nodeFn0 = point ? points[point.charAt(0)] : NULL,
                    nodeFn1 = (point && point !== 'cc') ? points[point.charAt(1)] : NULL;

                if (regionFn0) {
                    xy = regionFn0(xy, offxy, regionPoint);
                }
                if (regionFn1) {
                    xy = regionFn1(xy, offxy, regionPoint);
                }

                if (nodeFn0) {
                    xy = nodeFn0(xy, nodeoff, point);
                }
                if (nodeFn1) {
                    xy = nodeFn1(xy, nodeoff, point);
                }

                if (xy && node) {
                    xy = [xy[0] + offset[0], xy[1] + offset[1]];
                    if (fixed) {
                        var xAxis = Align.fixedPoints[fixed.charAt(1)],
                            yAxis = Align.fixedPoints[fixed.charAt(0)],
                            css = {};
                            
                        if (isIE6) {
                            //如果是IE6，则resize设置为true
                            syncOnResize = config.resize = true;
                        } else {
                            css.position = 'fixed';
                        }
                        
                        xy = Align.fixedPoints(xy, size, fixed, isWindow, isIE6);
                        css[xAxis] = xy[0];
                        css[yAxis] = xy[1];
                        //先重置后定位
                        this.reset();
                        node.css(css);
                    } else {
                        //先重置后定位
                        this.reset();
                        node.offset({
                            left: xy[0],
                            top: xy[1]
                        });
                    }
                }
                
                //绑定或移除监听事件
                this._toggleHandle(syncOnResize, 'resize');
                if (isIE6) {
                    this._toggleHandle(!!fixed, 'scroll');
                }

            }
            return this;
        },
        
        /**
         * 同步重新定位
         * @method sync
         * @chainable
         * @public
         */
        sync: function() {
            this.to.call(this, this._syncArgs);
            return this;
        },
        
        /**
         * 居中定位
         * @method center
         * @param {Object} config 插件配置参数，同构造函数
         * @chainable
         * @public
         */
        center: function(config) {
            config = config || this._syncArgs;
            if (config) {
                config.points = ['cc', 'cc'];
                this.to(config);
            }
            return this;
        },
        
        /**
         * 获取节点的区域数值，包括大小和上下左右位置
         * @method region
         * @param {Node} node 节点
         * @return {Object} 区域数值对象
         * @public
         */
        region: function(node) {
            var offset, top, bottom, left, right, width, height;
        
            node = S.one(node);
            if (!node) { return null; }
                
            if (node[0] == window) {
                top = DOM.scrollTop(window);
                left = DOM.scrollLeft(window);
                width = DOM.viewportWidth();
                height = DOM.viewportHeight();
            } else {
                offset = node.offset();
                top = offset.top;
                left = offset.left;
                width = node.outerWidth();
                height = node.outerHeight();
            }
            
            return {
                top: top,
                left: left,
                bottom: top + height,
                right: left + width,
                width: width,
                height: height
            };
        },
        
        /**
         * 重置节点位置，主要用于避免top,bottom及left,right同时存在时的冲突
         * @method reset
         * @chainable
         * @public
         */
        reset: function() {
            this._host.css({
                top: 'auto',
                left: 'auto',
                bottom: 'auto',
                right: 'auto'
            });
            return this;
        },
        
        /**
         * 销毁插件，移除绑定事件
         * @method destroy
         * @chainable
         * @public
         */
        destroy: function() {
            this._toggleHandle(false, 'resize');
            this._toggleHandle(false, 'scroll');
        },
        
        /**
         * 绑定或移除监听事件
         * @method _toggleHandle
         * @param {Boolean} add 绑定异或移除
         * @param {String} type 事件类型
         * @protected
         */
        _toggleHandle: function(add, type) {
            var handle = this._handles[type];
                
            if (add && !handle) {
                S.Event.on(window, type, this._onsync, this);
                this._handles[type] = this._onsync;
            } else if (!add && handle) {
                S.Event.detach(window, type, this._onsync, this);
                delete this._handles[type];
                handle = null;
            }
        },
        
        /**
         * 同步监听事件
         * @method _onsync
         * @protected
         */
        _onsync: function() {
            var self = this;
            //保证性能
            setTimeout(function() {
                self.sync();
            }, 0);
        }

    });
    
    /**
     * 不同定位时位置的计算方法
     * @property points
     * @type object
     * @static
     */
    Align.points = {
        't': function(xy, off) {
            return xy;
        },

        'r': function(xy, off) {
            return [xy[0] + off[0], xy[1]];
        },

        'b': function(xy, off) {
            return [xy[0], xy[1] + off[1]];
        },

        'l': function(xy, off) {
            return xy;
        },

        'c': function(xy, off, point) {
            var axis = (point[0] === 't' || point[0] === 'b') ?  0 : 1,
                ret, val;

            if (point === 'cc') {
                ret = [xy[0] + off[0] / 2, xy[1] + off[1] / 2];
            } else {
                val = xy[axis] + off[axis] / 2;
                ret = (axis) ? [xy[0], val] : [val, xy[1]];
            }

             return ret;
        }
    };
    
    /**
     * fixed时调整位置的计算方法
     * @method fixedPoints
     * @param {Array} xy 位置数组
     * @param {Array} off 大小数组
     * @param {String} fixed 定位方向
     * @param {Boolean} win 相对的元素是否是window
     * @param {Boolean} ie6 是否是IE6
     * @return {Array} 调整后的位置数组
     * @static
     */
    Align.fixedPoints = function(xy, off, fixed, win, ie6) {
        var vpRegion = Align.prototype.region(window),
            xAxis = Align.fixedPoints[fixed.charAt(1)],
            yAxis = Align.fixedPoints[fixed.charAt(0)],
            xOff = xAxis == 'right' ? off[0] : 0,
            yOff = yAxis == 'bottom' ? off[1] : 0,
            xScroll = (win && !ie6) ? 0 : vpRegion.left,
            yScroll = (win && !ie6) ? 0 : vpRegion.top,
            xReverse = xAxis == 'right' ? -1 : 1,
            yReverse = yAxis == 'bottom' ? -1 : 1;
        
        return [(xy[0] + xOff - vpRegion[xAxis] + xScroll) * xReverse, (xy[1] + yOff - vpRegion[yAxis] + yScroll) * yReverse];
    };
    
    //简写对应的全称
    S.mix(Align.fixedPoints, {
        't': 'top',
        'b': 'bottom',
        'l': 'left',
        'r': 'right'
    });

    Align.NAME = 'Align';
    Align.NS = 'align';

    S.namespace('NodePlugin');
    S.NodePlugin.Align = Align;
    
    return Align;

}, {
    requires : ['node', 'event', 'gallery/pluginhost/1.0/']
});



