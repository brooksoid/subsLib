//////////////////////////////////////////////////////////////////////////////////////////
// BoundingBox2D.js - noddy 2D bounding box class
// Matt Brooks

// Just making a change to see how it's reflected across submodules...

define(function() {
	'use strict';

	function BoundingBox2D(minx, maxx, miny, maxy)
	{
		this.minx = minx || Number.POSITIVE_INFINITY;
		this.maxx = maxx || Number.NEGATIVE_INFINITY;
		this.miny = miny || Number.POSITIVE_INFINITY;
		this.maxy = maxy || Number.NEGATIVE_INFINITY;
	}

	BoundingBox2D.prototype.addPoint = function(x, y)
	{
		this.minx = Math.min(this.minx, x);
		this.maxx = Math.max(this.maxx, x);
		this.miny = Math.min(this.miny, y);
		this.maxy = Math.max(this.maxy, y);
	};

	BoundingBox2D.prototype.testPoint = function(x, y)
	{
		if ((x >= this.minx) && (x <= this.maxx) && (y >= this.miny) && (y <= this.maxy))
			return true;
		else
			return false;
	};

	BoundingBox2D.prototype.width = function()
	{
		return this.maxx - this.minx;
	};

	BoundingBox2D.prototype.height = function()
	{
		return this.maxy - this.miny;
	};

	BoundingBox2D.prototype.moveTo = function(x, y)
	{
		var dx = x - this.minx;
		var dy = y - this.miny;

		this.minx += dx;
		this.miny += dy;
		this.maxx += dx;
		this.maxy += dy;
	};

	console.log("BoundingBox2D.js returning BoundingBox2D class");
	return BoundingBox2D;
});